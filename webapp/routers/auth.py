from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from supabase import Client
from webapp.db import supabase_admin, supabase
from webapp.dependencies import get_supabase_client

router = APIRouter(prefix="/auth", tags=["auth"])

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class TenantLoginRequest(BaseModel):
    room_number: str
    dorm_id: str | None = None

@router.post("/login/admin")
async def login_admin(req: AdminLoginRequest):
    try:
        # Authenticate using Supabase Auth
        res = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        user = res.user
        # Retrieve role from metadata or user table
        user_data = supabase_admin.table("users").select("role, name").eq("id", user.id).execute()
        role = "admin"
        name = "Administrator"
        if user_data.data:
            role = user_data.data[0].get("role", "admin")
            name = user_data.data[0].get("name", "Administrator")
        
        if role != "admin":
            raise HTTPException(status_code=403, detail="Unauthorized role")

        return {
            "session_token": res.session.access_token,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": name,
                "role": role
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"เข้าสู่ระบบล้มเหลว: {str(e)}"
        )

@router.post("/login/tenant")
async def login_tenant(req: TenantLoginRequest):
    try:
        import uuid
        # Check if req.dorm_id is a valid UUID
        is_dorm_uuid = True
        if req.dorm_id:
            try:
                uuid.UUID(req.dorm_id)
            except ValueError:
                is_dorm_uuid = False

        # Find room
        query = supabase_admin.table("rooms").select("*, dorms(id, name)").eq("room_number", req.room_number).eq("status", "occupied")
        if req.dorm_id and is_dorm_uuid:
            query = query.eq("dorm_id", req.dorm_id)
        
        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบหมายเลขห้องนี้ หรือห้องยังไม่มีผู้เช่า")
        
        room = res.data[0]
        return {
            "role": "tenant",
            "room_id": room["id"],
            "room_number": room["room_number"],
            "tenant_name": room.get("tenant_name") or "ผู้เช่า",
            "dorm_id": room["dorm_id"],
            "dorm_name": room["dorms"]["name"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenant/session/{room_uuid}")
async def get_tenant_session_by_uuid(room_uuid: str):
    """
    Direct access by room UUID (acts as secret access key).
    """
    try:
        import uuid
        from webapp.utils import date_db_to_fe
        is_uuid = True
        try:
            uuid.UUID(room_uuid)
        except ValueError:
            is_uuid = False

        query = supabase_admin.table("leases").select("*, rooms(*, dorms(*))").eq("status", "active")
        if is_uuid:
            query = query.eq("id", room_uuid)
        elif len(room_uuid.strip()) == 8:
            prefix = room_uuid.strip().lower()
            all_active = supabase_admin.table("leases").select("*, rooms(*, dorms(*))").eq("status", "active").execute()
            matching = [l for l in all_active.data if l["id"].lower().startswith(prefix)]
            if matching:
                class MockResponse:
                    def __init__(self, data):
                        self.data = data
                res = MockResponse(matching)
            else:
                raise HTTPException(status_code=404, detail="รหัสยืนยันตัวตนไม่ถูกต้องหรือไม่พบสัญญาเช่าที่ใช้งานอยู่")
        else:
            # Fallback: search rooms by room_number first
            room_res = supabase_admin.table("rooms").select("id").eq("room_number", room_uuid).execute()
            if room_res.data:
                room_ids = [rm["id"] for rm in room_res.data]
                query = query.in_("room_id", room_ids)
            else:
                raise HTTPException(status_code=404, detail="ไม่พบข้อมูลรหัสเข้าใช้งานนี้")

        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบข้อมูลผู้เช่า หรือห้องยังไม่มีผู้เช่า")
        
        lease = res.data[0]
        room = lease["rooms"]
        dorm = room["dorms"]
        
        return {
            "role": "tenant",
            "room_id": lease["id"], # We return lease ID as 'room_id' so the frontend stores it as the key
            "room_number": room["room_number"],
            "tenant_name": lease["tenant_name"],
            "dorm_id": lease["dorm_id"],
            "dorm_name": dorm["name"],
            "dorm_address": dorm.get("address") or "",
            "dorm_promptpay": dorm.get("promptpay") or "",
            "dorm_water_rate": float(dorm.get("water_rate") or 18.0),
            "dorm_electric_rate": float(dorm.get("electric_rate") or 8.0),
            "dorm_due_day_of_month": dorm.get("due_day_of_month") or 5,
            "move_in_date": date_db_to_fe(lease["move_in_date"]),
            "contract_start": date_db_to_fe(lease["contract_start"]),
            "contract_end": date_db_to_fe(lease["contract_end"]),
            "deposit_amount": float(lease["deposit_amount"] or 0),
            "deposit_status": lease["deposit_status"] or "none",
            "deposit_note": lease["deposit_note"] or "",
            "last_water_meter": float(room["last_water_meter"] or 0),
            "last_electric_meter": float(room["last_electric_meter"] or 0),
            "line_user_id": lease.get("line_user_id") or ""
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenant/line/{line_user_id}")
async def get_tenant_session_by_line_user_id(line_user_id: str):
    """
    Get active tenant lease session by their LINE User ID.
    """
    try:
        from webapp.utils import date_db_to_fe
        # Query active lease by line_user_id
        res = supabase_admin.table("leases").select("*, rooms(*, dorms(*))").eq("line_user_id", line_user_id).eq("status", "active").execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบข้อมูลผู้เช่าที่ผูกกับ LINE ID นี้")
            
        lease = res.data[0]
        room = lease["rooms"]
        dorm = room["dorms"]
        
        return {
            "role": "tenant",
            "room_id": lease["id"], # We return lease ID as 'room_id' so the frontend stores it as the key
            "room_number": room["room_number"],
            "tenant_name": lease["tenant_name"],
            "dorm_id": lease["dorm_id"],
            "dorm_name": dorm["name"],
            "dorm_address": dorm.get("address") or "",
            "dorm_promptpay": dorm.get("promptpay") or "",
            "dorm_water_rate": float(dorm.get("water_rate") or 18.0),
            "dorm_electric_rate": float(dorm.get("electric_rate") or 8.0),
            "dorm_due_day_of_month": dorm.get("due_day_of_month") or 5,
            "move_in_date": date_db_to_fe(lease["move_in_date"]),
            "contract_start": date_db_to_fe(lease["contract_start"]),
            "contract_end": date_db_to_fe(lease["contract_end"]),
            "deposit_amount": float(lease["deposit_amount"] or 0),
            "deposit_status": lease["deposit_status"] or "none",
            "deposit_note": lease["deposit_note"] or "",
            "last_water_meter": float(room["last_water_meter"] or 0),
            "last_electric_meter": float(room["last_electric_meter"] or 0),
            "line_user_id": lease.get("line_user_id") or ""
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/binding-code")
async def get_admin_binding_code(client: Client = Depends(get_supabase_client)):
    """
    Get or generate a 6-digit OTP code for the admin to bind their LINE account.
    """
    try:
        import random
        owner_id = getattr(client, "user_id", None)
        if not owner_id:
            raise HTTPException(status_code=401, detail="ไม่ได้รับสิทธิ์การเข้าใช้งาน")
            
        # Check user details
        user_res = supabase_admin.table("users").select("line_user_id, line_binding_code").eq("id", owner_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="ไม่พบข้อมูลผู้ใช้งาน")
            
        user = user_res.data[0]
        line_user_id = user.get("line_user_id") or ""
        binding_code = user.get("line_binding_code") or ""
        
        if not line_user_id and not binding_code:
            # Generate a new 6-digit code
            binding_code = str(random.randint(100000, 999999))
            supabase_admin.table("users").update({"line_binding_code": binding_code}).eq("id", owner_id).execute()
            
        return {
            "line_user_id": line_user_id,
            "binding_code": binding_code
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/unbind-line")
async def unbind_admin_line(client: Client = Depends(get_supabase_client)):
    """
    Remove LINE User ID mapping from the admin profile.
    """
    try:
        owner_id = getattr(client, "user_id", None)
        if not owner_id:
            raise HTTPException(status_code=401, detail="ไม่ได้รับสิทธิ์การเข้าใช้งาน")
            
        supabase_admin.table("users").update({"line_user_id": None, "line_binding_code": None}).eq("id", owner_id).execute()
        return {"success": True, "message": "ยกเลิกการเชื่อมต่อ LINE เรียบร้อยแล้ว"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/line-session/{line_user_id}")
async def get_line_session(line_user_id: str):
    """
    Unified endpoint to fetch active session (admin or tenant) by LINE User ID.
    """
    try:
        from webapp.utils import date_db_to_fe
        # 1. First, check if this LINE ID belongs to an Admin in the users table
        admin_res = supabase_admin.table("users").select("*").eq("line_user_id", line_user_id).eq("role", "admin").execute()
        if admin_res.data:
            admin_user = admin_res.data[0]
            email = admin_user["email"]
            
            # Programmatically sign in the admin using Magic Link OTP
            otp_res = supabase_admin.auth.admin.generate_link({
                "type": "magiclink",
                "email": email
            })
            otp = otp_res.properties.email_otp
            
            # Verify OTP to get a valid Supabase access token
            session = supabase.auth.verify_otp({
                "email": email,
                "token": otp,
                "type": "magiclink"
            })
            
            return {
                "role": "admin",
                "session_token": session.session.access_token,
                "user": {
                    "id": str(admin_user["id"]),
                    "email": email,
                    "name": admin_user.get("name") or "Administrator",
                    "role": "admin"
                }
            }
            
        # 2. If not admin, check if it belongs to an active tenant lease
        lease_res = supabase_admin.table("leases").select("*, rooms(*, dorms(*))").eq("line_user_id", line_user_id).eq("status", "active").execute()
        if lease_res.data:
            lease = lease_res.data[0]
            room = lease["rooms"]
            dorm = room["dorms"]
            
            return {
                "role": "tenant",
                "room_id": lease["id"], # Return lease ID as room_id for frontend storage compatibility
                "room_number": room["room_number"],
                "tenant_name": lease["tenant_name"],
                "dorm_id": lease["dorm_id"],
                "dorm_name": dorm["name"],
                "dorm_address": dorm.get("address") or "",
                "dorm_promptpay": dorm.get("promptpay") or "",
                "dorm_water_rate": float(dorm.get("water_rate") or 18.0),
                "dorm_electric_rate": float(dorm.get("electric_rate") or 8.0),
                "dorm_due_day_of_month": dorm.get("due_day_of_month") or 5,
                "move_in_date": date_db_to_fe(lease["move_in_date"]),
                "contract_start": date_db_to_fe(lease["contract_start"]),
                "contract_end": date_db_to_fe(lease["contract_end"]),
                "deposit_amount": float(lease["deposit_amount"] or 0),
                "deposit_status": lease["deposit_status"] or "none",
                "deposit_note": lease["deposit_note"] or "",
                "last_water_meter": float(room["last_water_meter"] or 0),
                "last_electric_meter": float(room["last_electric_meter"] or 0),
                "line_user_id": lease.get("line_user_id") or ""
            }
            
        # 3. Otherwise, return 404
        raise HTTPException(status_code=404, detail="ยังไม่ได้ผูกบัญชี LINE กับระบบ")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AdminBindDirectRequest(BaseModel):
    line_user_id: str

@router.post("/admin/bind-line-direct")
async def bind_admin_line_direct(req: AdminBindDirectRequest, client: Client = Depends(get_supabase_client)):
    """
    Directly bind LINE User ID to the currently authenticated admin.
    """
    try:
        owner_id = getattr(client, "user_id", None)
        if not owner_id:
            raise HTTPException(status_code=401, detail="ไม่ได้รับสิทธิ์การเข้าใช้งาน")
            
        # Verify user exists and is an admin
        user_res = supabase_admin.table("users").select("role").eq("id", owner_id).execute()
        if not user_res.data or user_res.data[0].get("role") != "admin":
            raise HTTPException(status_code=403, detail="สิทธิ์การเข้าใช้งานไม่ถูกต้อง")
            
        # Update user record
        supabase_admin.table("users").update({
            "line_user_id": req.line_user_id,
            "line_binding_code": None
        }).eq("id", owner_id).execute()
        
        return {"success": True, "message": "ผูกบัญชี LINE เรียบร้อยแล้ว"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AdminRegisterRequest(BaseModel):
    email: str
    password: str
    name: str

@router.post("/register/admin")
async def register_admin(req: AdminRegisterRequest):
    try:
        # Create user via Supabase Auth Admin API (auto-confirms email)
        res = supabase_admin.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {
                "name": req.name,
                "role": "admin"
            }
        })
        
        if not res.user:
            raise HTTPException(status_code=400, detail="ไม่สามารถสร้างบัญชีผู้ใช้งานได้")
            
        import time
        user_id = res.user.id
        
        # Wait up to 5 seconds for the DB trigger to populate the public.users row
        for _ in range(10):
            check_res = supabase_admin.table("users").select("id").eq("id", user_id).execute()
            if check_res.data:
                break
            time.sleep(0.5)
            
        # Create a default dorm for the landlord
        supabase_admin.table("dorms").insert({
            "owner_id": user_id,
            "name": f"หอพักของคุณ {req.name}",
            "address": "ที่อยู่หอพัก",
            "promptpay": ""
        }).execute()
        
        return {"success": True, "message": "ลงทะเบียนบัญชีเจ้าของหอสำเร็จและระบบได้สร้างหอพักจำลองให้แล้ว"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"การลงทะเบียนล้มเหลว: {str(e)}")


