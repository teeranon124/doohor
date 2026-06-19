from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Header
from pydantic import BaseModel
from supabase import Client, create_client, ClientOptions
import uuid
from datetime import datetime, timezone
from webapp.config import settings
from webapp.db import supabase_admin
from webapp.dependencies import get_supabase_client, decode_jwt_payload_local, TOKEN_CACHE
from webapp.utils import date_db_to_fe
from webapp.utils_line import send_order_notification_to_admin, send_status_update_to_tenant

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderStatusUpdate(BaseModel):
    status: str
    admin_note: str | None = None

@router.post("")
async def create_order(
    dorm_id: str = Form(...),
    room_id: str = Form(...), # Can be physical room UUID or lease UUID
    amount: float = Form(...),
    reference_number: str = Form(None),
    payment_time: str = Form(None),
    payment_type: str = Form("online"),
    file: UploadFile = File(None)
):
    try:
        # 1. Resolve room ID and active lease ID
        is_uuid = True
        try:
            uuid.UUID(room_id)
        except ValueError:
            is_uuid = False
            
        resolved_room_id = room_id
        lease_id = None
        
        if is_uuid:
            # Check if it is a lease ID
            lease_res = supabase_admin.table("leases").select("room_id, tenant_name").eq("id", room_id).execute()
            if lease_res.data:
                resolved_room_id = lease_res.data[0]["room_id"]
                lease_id = room_id
            else:
                # It is a physical room UUID. Let's find the active lease for it.
                active_lease = supabase_admin.table("leases").select("id").eq("room_id", room_id).eq("status", "active").execute()
                if active_lease.data:
                    lease_id = active_lease.data[0]["id"]
        else:
            # Not a UUID, treat it as a room number (e.g. "101"). Resolve room ID first.
            room_res = supabase_admin.table("rooms").select("id").eq("room_number", room_id).execute()
            if room_res.data:
                resolved_room_id = room_res.data[0]["id"]
                active_lease = supabase_admin.table("leases").select("id").eq("room_id", resolved_room_id).eq("status", "active").execute()
                if active_lease.data:
                    lease_id = active_lease.data[0]["id"]
                
        # 2. Upload file if online payment
        storage_path = None
        if payment_type == "online":
            if not file:
                raise HTTPException(status_code=400, detail="กรุณาแนบไฟล์รูปภาพสลิป")
            
            # File validation
            if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
                raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์รูปภาพ JPG, JPEG, PNG เท่านั้น")
            
            file_bytes = await file.read()
            if len(file_bytes) > 2 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="ขนาดไฟล์ห้ามเกิน 2MB")
                
            # Reset file pointer
            await file.seek(0)
            
            # Upload file privately to slips/{room_id}/{uuid}.ext
            ext = file.filename.split(".")[-1] if "." in file.filename else "png"
            storage_filename = f"{uuid.uuid4()}.{ext}"
            storage_path = f"{resolved_room_id}/{storage_filename}"
            
            try:
                supabase_admin.storage.from_("slips").upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": file.content_type}
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"ไม่สามารถอัปโหลดไฟล์ไปยังระบบจัดเก็บข้อมูลได้: {e}")
        elif payment_type == "manual" and file:
            # Admin manual entry with optional file upload
            file_bytes = await file.read()
            await file.seek(0)
            ext = file.filename.split(".")[-1] if "." in file.filename else "png"
            storage_filename = f"{uuid.uuid4()}.{ext}"
            storage_path = f"{resolved_room_id}/{storage_filename}"
            
            try:
                supabase_admin.storage.from_("slips").upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": file.content_type}
                )
            except Exception:
                pass # Non-critical if manual upload fail

        # 3. Create database record
        status = "approved" if payment_type == "manual" else "pending"
        approved_at = datetime.now(timezone.utc).isoformat() if payment_type == "manual" else None
        
        order_data = {
            "dorm_id": dorm_id,
            "room_id": resolved_room_id,
            "lease_id": lease_id,
            "amount": amount,
            "reference_number": reference_number,
            "payment_time": payment_time,
            "slip_url": storage_path,
            "payment_type": payment_type,
            "status": status,
            "approved_at": approved_at
        }
        
        res = supabase_admin.table("orders").insert(order_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถสร้างรายการในฐานข้อมูลได้")
            
        new_order = res.data[0]
        order_uuid = new_order["id"]

        # Update corresponding bill status to pending_approval if online order
        if payment_type == "online":
            try:
                # Find latest unpaid bill
                bill_query = supabase_admin.table("bills").select("id").eq("status", "unpaid")
                if lease_id:
                    bill_query = bill_query.eq("lease_id", lease_id)
                else:
                    bill_query = bill_query.eq("room_id", resolved_room_id)
                
                bill_res = bill_query.order("billing_year", desc=True).order("billing_month", desc=True).execute()
                if bill_res.data:
                    bill_id = bill_res.data[0]["id"]
                    supabase_admin.table("bills").update({
                        "status": "pending_approval",
                        "slip_image_url": storage_path
                    }).eq("id", bill_id).execute()
            except Exception as e:
                print(f"Failed to set bill status to pending_approval: {e}")

        # 4. Trigger LINE Notification for Online uploads
        if payment_type == "online":
            dorm_res = supabase_admin.table("dorms").select("name").eq("id", dorm_id).execute()
            room_res = supabase_admin.table("rooms").select("room_number").eq("id", resolved_room_id).execute()
            
            dorm_name = dorm_res.data[0]["name"] if dorm_res.data else "หอพัก"
            room_number = room_res.data[0]["room_number"] if room_res.data else "ห้องพัก"
            
            # Generate a signed URL for LINE Flex message display (signed URL valid for 24 hours)
            signed_url = None
            if storage_path:
                try:
                    url_res = supabase_admin.storage.from_("slips").create_signed_url(storage_path, 86400)
                    signed_url = url_res.get("signedURL") or url_res.get("signedUrl")
                except Exception:
                    pass
                    
            # Query owner's LINE ID for this dorm to send push notification to
            owner_line_id = None
            try:
                dorm_owner_res = supabase_admin.table("dorms").select("owner_id").eq("id", dorm_id).execute()
                if dorm_owner_res.data:
                    owner_id = dorm_owner_res.data[0]["owner_id"]
                    owner_user_res = supabase_admin.table("users").select("line_user_id").eq("id", owner_id).execute()
                    if owner_user_res.data:
                        owner_line_id = owner_user_res.data[0]["line_user_id"]
            except Exception as e:
                print(f"Error looking up dorm owner's LINE ID: {e}")

            send_order_notification_to_admin(
                order_id=order_uuid,
                dorm_name=dorm_name,
                room_number=room_number,
                amount=amount,
                slip_url=signed_url,
                admin_line_id=owner_line_id
            )

        return {"success": True, "order": new_order}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_orders(
    dorm_id: str | None = None,
    room_uuid: str | None = None, # Used by Tenant login link
    authorization: str = Header(None)
):
    try:
        is_admin = False
        target_room_id = None
        
        # Determine if caller is Admin
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            payload = decode_jwt_payload_local(token)
            if payload:
                user_id = payload.get("sub")
                role = None
                cached = TOKEN_CACHE.get(token)
                if cached and cached["expires_at"] > datetime.now().timestamp() and cached["valid"]:
                    role = cached["role"]
                if not role:
                    user_data = supabase_admin.table("users").select("role").eq("id", user_id).execute()
                    if user_data.data:
                        role = user_data.data[0].get("role")
                if role == "admin":
                    is_admin = True

        # Clean up empty strings or representation of null/undefined
        cleaned_room_uuid = room_uuid
        if cleaned_room_uuid:
            cleaned_room_uuid = cleaned_room_uuid.strip()
            if cleaned_room_uuid.lower() in ["", "null", "undefined"]:
                cleaned_room_uuid = None

        if cleaned_room_uuid:
            # Tenant request or Admin viewing specific room - resolve active room ID from their lease UUID
            is_lease_uuid = True
            try:
                uuid.UUID(cleaned_room_uuid)
            except ValueError:
                is_lease_uuid = False
                
            resolved_room_id = cleaned_room_uuid
            if is_lease_uuid:
                lease_res = supabase_admin.table("leases").select("room_id").eq("id", cleaned_room_uuid).execute()
                if lease_res.data:
                    resolved_room_id = lease_res.data[0]["room_id"]
                    
            query = supabase_admin.table("orders").select("*, rooms(room_number)").eq("room_id", resolved_room_id).order("created_at", desc=True)
            res = query.execute()
        elif dorm_id:
            # Admin flow requesting all orders for a dorm
            if not is_admin:
                raise HTTPException(status_code=403, detail="สิทธิ์การเข้าใช้งานไม่ถูกต้อง")
            query = supabase_admin.table("orders").select("*, rooms(room_number)").eq("dorm_id", dorm_id).order("created_at", desc=True)
            res = query.execute()
        else:
            raise HTTPException(status_code=400, detail="กรุณาระบุรหัสเข้าใช้งานห้องพัก")
            
        # Hydrate signed URLs for secure private slips viewing
        orders = []
        for o in res.data or []:
            slip_path = o.get("slip_url")
            signed_url = None
            if slip_path:
                try:
                    url_res = supabase_admin.storage.from_("slips").create_signed_url(slip_path, 3600)
                    signed_url = url_res.get("signedURL") or url_res.get("signedUrl")
                except Exception:
                    pass
            o["slip_url_signed"] = signed_url
            
            # Map room number
            room_number = ""
            if o.get("rooms"):
                room_number = o["rooms"].get("room_number", "")
            o["room_number"] = room_number
            orders.append(o)
            
        return orders
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TenantLineIdUpdate(BaseModel):
    room_uuid: str
    line_user_id: str

@router.put("/line-id")
async def update_tenant_line_id(req: TenantLineIdUpdate):
    """
    Save or update the tenant's LINE User ID on their active lease.
    """
    try:
        import uuid
        is_uuid = True
        try:
            uuid.UUID(req.room_uuid)
        except ValueError:
            is_uuid = False

        if not is_uuid:
            raise HTTPException(status_code=400, detail="รูปแบบรหัสเข้าใช้งานไม่ถูกต้อง")

        # Check if the lease exists and is active
        lease_res = supabase_admin.table("leases").select("id").eq("id", req.room_uuid).eq("status", "active").execute()
        if not lease_res.data:
            # Fallback: maybe it is a physical room ID
            lease_res = supabase_admin.table("leases").select("id").eq("room_id", req.room_uuid).eq("status", "active").execute()
            if not lease_res.data:
                raise HTTPException(status_code=404, detail="ไม่พบข้อมูลสัญญาเช่าที่เปิดใช้งานอยู่")

        lease_id = lease_res.data[0]["id"]
        
        # Remove this line_user_id from any other active leases to prevent duplicates
        if req.line_user_id:
            supabase_admin.table("leases").update({"line_user_id": None}).eq("line_user_id", req.line_user_id).eq("status", "active").execute()
        
        # Update line_user_id on the lease
        res = supabase_admin.table("leases").update({"line_user_id": req.line_user_id}).eq("id", lease_id).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถบันทึก LINE ID ได้")

        return {"success": True, "message": "บันทึก LINE ID เรียบร้อยแล้ว"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}")
async def update_order_status(
    order_id: str,
    req: OrderStatusUpdate,
    client: Client = Depends(get_supabase_client)
):
    """
    Update order status (Approve/Reject) from Admin Dashboard
    """
    try:
        # Ensure client is valid admin
        if not getattr(client, "user_role", None) == "admin":
            raise HTTPException(status_code=403, detail="สิทธิ์การเข้าใช้งานไม่ถูกต้อง")
            
        data = {
            "status": req.status,
            "admin_note": req.admin_note
        }
        if req.status == "approved":
            data["approved_at"] = datetime.now(timezone.utc).isoformat()
            
        res = supabase_admin.table("orders").update(data).eq("id", order_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบรายการใบสั่งซื้อที่ต้องการแก้ไข")
            
        updated_order = res.data[0]
        
        if req.status == "approved":
            try:
                from webapp.utils import auto_approve_bill_for_order
                auto_approve_bill_for_order(updated_order)
            except Exception as e:
                print(f"Error auto-approving bill: {e}")
        elif req.status == "rejected":
            try:
                # Find corresponding pending bill and change its status back to unpaid
                bill_query = supabase_admin.table("bills").select("id").eq("status", "pending_approval")
                if updated_order.get("lease_id"):
                    bill_query = bill_query.eq("lease_id", updated_order["lease_id"])
                else:
                    bill_query = bill_query.eq("room_id", updated_order["room_id"])
                
                bill_res = bill_query.order("billing_year", desc=True).order("billing_month", desc=True).execute()
                if bill_res.data:
                    bill_id = bill_res.data[0]["id"]
                    supabase_admin.table("bills").update({
                        "status": "unpaid",
                        "slip_image_url": None
                    }).eq("id", bill_id).execute()
            except Exception as e:
                print(f"Error resetting bill status on rejection: {e}")
        
        # Trigger LINE push message notification to tenant about status change
        try:
            # Query lease_id from orders
            order_res = supabase_admin.table("orders").select("lease_id").eq("id", order_id).execute()
            if order_res.data and order_res.data[0]["lease_id"]:
                lease_id = order_res.data[0]["lease_id"]
                # Query line_user_id directly from leases
                lease_res = supabase_admin.table("leases").select("line_user_id").eq("id", lease_id).execute()
                if lease_res.data and lease_res.data[0]["line_user_id"]:
                    line_id = lease_res.data[0]["line_user_id"]
                    send_status_update_to_tenant(line_id, order_id, req.status, req.admin_note)
        except Exception as line_err:
            print(f"Failed to notify tenant of update via LINE: {line_err}")
            
        return {"success": True, "order": updated_order}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
