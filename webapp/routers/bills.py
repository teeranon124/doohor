from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from supabase import Client, create_client, ClientOptions
from webapp.config import settings
from webapp.db import supabase_admin
from webapp.dependencies import get_supabase_client, decode_jwt_payload_local, TOKEN_CACHE
from webapp.utils import (
    date_fe_to_db,
    date_db_to_fe,
    get_month_int_from_thai,
    get_thai_month_name
)

router = APIRouter(prefix="/bills", tags=["bills"])

class ExtraCharge(BaseModel):
    desc: str
    amt: float = Field(..., ge=0)

class SingleBillInput(BaseModel):
    room_id: str  # Room UUID
    rent: float = Field(..., ge=0)
    water_start: float = Field(..., ge=0)
    water_end: float = Field(..., ge=0)
    electric_start: float = Field(..., ge=0)
    electric_end: float = Field(..., ge=0)
    extra_charges: list[ExtraCharge] = []
    total: float = Field(..., ge=0)

class BulkBillCreate(BaseModel):
    dorm_id: str
    month: str  # Thai month name, e.g. "เมษายน"
    year: int  # BE Year, e.g. 2568
    issue_date: str  # BE date DD/MM/YYYY
    due_date: str  # BE date DD/MM/YYYY
    bills: list[SingleBillInput]

class BillUpdate(BaseModel):
    status: str | None = None  # unpaid, pending_approval, paid
    paid_date: str | None = None  # BE Date
    pay_note: str | None = None
    slip_image_url: str | None = None

@router.get("/tenant/{room_uuid}")
async def get_tenant_bills(room_uuid: str):
    """
    Get all bills for a specific room/lease (used by the tenant side).
    """
    try:
        import uuid
        is_uuid = True
        try:
            uuid.UUID(room_uuid)
        except ValueError:
            is_uuid = False

        if is_uuid:
            # First, fetch the lease by ID
            lease_res = supabase_admin.table("leases").select("*, rooms(*)").eq("id", room_uuid).execute()
            if not lease_res.data:
                raise HTTPException(status_code=404, detail="ไม่พบข้อมูลสัญญาเช่า")
            lease = lease_res.data[0]
            room_uuid = lease["room_id"] # Get physical room ID
            lease_id = lease["id"]
            room_number = lease["rooms"]["room_number"]
        else:
            # Fallback by room number
            room_check = supabase_admin.table("rooms").select("id, room_number").eq("room_number", room_uuid).execute()
            if not room_check.data:
                raise HTTPException(status_code=404, detail="ไม่พบข้อมูลห้องพัก")
            room = room_check.data[0]
            room_uuid = str(room["id"])
            room_number = room["room_number"]
            # Find active lease for that room
            lease_res = supabase_admin.table("leases").select("id").eq("room_id", room_uuid).eq("status", "active").execute()
            lease_id = lease_res.data[0]["id"] if lease_res.data else None

        # Fetch room info first to get dorm details (e.g., promptpay)
        room_res = supabase_admin.table("rooms").select("*, dorms(*)").eq("id", room_uuid).execute()
        if not room_res.data:
            raise HTTPException(status_code=404, detail="ไม่พบข้อมูลห้องพัก")
        
        room = room_res.data[0]
        promptpay = room["dorms"]["promptpay"] or ""

        # Fetch bills filtered by lease_id (so that tenant only sees bills belonging to their lease)
        if lease_id:
            res = supabase_admin.table("bills").select("*").eq("lease_id", lease_id).order("billing_year", desc=True).execute()
        else:
            res = supabase_admin.table("bills").select("*").eq("room_id", room_uuid).order("billing_year", desc=True).execute()
        
        mapped_bills = []
        for b in res.data:
            extra_charges = b.get("extra_charges") or []
            other_fees = sum(item.get("amt", 0) for item in extra_charges)
            other_desc = ", ".join(item.get("desc", "") for item in extra_charges) if extra_charges else ""
            mapped_bills.append({
                "id": str(b["id"]),
                "room": room_number,
                "month": get_thai_month_name(b["billing_month"]),
                "year": b["billing_year"],
                "issueDate": date_db_to_fe(b["issue_date"]),
                "dueDate": date_db_to_fe(b["due_date"]),
                "rent": float(b["rent"]),
                "ws": float(b["water_start"]),
                "we": float(b["water_end"]),
                "es": float(b["electric_start"]),
                "ee": float(b["electric_end"]),
                "otherFees": other_fees,
                "otherDesc": other_desc,
                "total": float(b["total"]),
                "status": b["status"],
                "paidDate": date_db_to_fe(b["paid_date"]),
                "payNote": b["pay_note"] or "",
                "slipImageUrl": b.get("slip_image_url") or "",
                "promptpay": promptpay
            })
        return mapped_bills
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk")
async def bulk_create_bills(req: BulkBillCreate, client: Client = Depends(get_supabase_client)):
    try:
        month_int = get_month_int_from_thai(req.month)
        db_issue_date = date_fe_to_db(req.issue_date)
        db_due_date = date_fe_to_db(req.due_date)

        inserted_bills = []
        for b_in in req.bills:
            # Find the active lease for this room
            lease_res = client.table("leases").select("id").eq("room_id", b_in.room_id).eq("status", "active").execute()
            lease_id = lease_res.data[0]["id"] if lease_res.data else None

            # Prepare extra charges JSONB
            extra_list = [{"desc": item.desc, "amt": item.amt} for item in b_in.extra_charges]

            bill_data = {
                "room_id": b_in.room_id,
                "lease_id": lease_id, # Link directly to the active lease!
                "dorm_id": req.dorm_id,
                "billing_month": month_int,
                "billing_year": req.year,
                "issue_date": db_issue_date,
                "due_date": db_due_date,
                "rent": b_in.rent,
                "water_start": b_in.water_start,
                "water_end": b_in.water_end,
                "electric_start": b_in.electric_start,
                "electric_end": b_in.electric_end,
                "extra_charges": extra_list,
                "total": b_in.total,
                "status": "unpaid"
            }
            
            # Upsert bill
            res = client.table("bills").upsert(
                bill_data,
                on_conflict="room_id, billing_month, billing_year"
            ).execute()
            
            if res.data:
                bill = res.data[0]
                inserted_bills.append(bill)

                # Update last meter readings in rooms table
                client.table("rooms").update({
                    "last_water_meter": b_in.water_end,
                    "last_electric_meter": b_in.electric_end
                }).eq("id", b_in.room_id).execute()

        return {"success": True, "count": len(inserted_bills)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{bill_id}")
async def update_bill(bill_id: str, req: BillUpdate, authorization: str = Header(None)):
    try:
        is_admin = False
        client = supabase_admin

        # Validate if request is from an admin
        if authorization and authorization.startswith("Bearer "):
            try:
                import time
                token = authorization.split(" ")[1]
                payload = decode_jwt_payload_local(token)
                if payload:
                    user_id = payload.get("sub")
                    role = None
                    
                    # Check cache first
                    cached = TOKEN_CACHE.get(token)
                    if cached and cached["expires_at"] > time.time() and cached["valid"]:
                        role = cached["role"]
                        
                    if not role:
                        user_data = supabase_admin.table("users").select("role").eq("id", user_id).execute()
                        if user_data.data:
                            role = user_data.data[0].get("role")
                        if not role:
                            role = payload.get("user_metadata", {}).get("role", "tenant")
                            
                    if role == "admin":
                        client_bound = create_client(
                            settings.SUPABASE_URL,
                            settings.SUPABASE_ANON_KEY,
                            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
                        )
                        client_bound.auth.set_session(access_token=token, refresh_token="")
                        client_bound.user_id = user_id
                        client_bound.user_role = role
                        client = client_bound
                        is_admin = True
            except Exception:
                pass

        data = {}
        if req.status is not None:
            # Tenants can only change status to 'pending_approval' or 'unpaid'
            if not is_admin and req.status not in ["unpaid", "pending_approval"]:
                raise HTTPException(status_code=403, detail="สิทธิ์การแก้ไขสถานะไม่ถูกต้อง")
            data["status"] = req.status
            
        if req.paid_date is not None:
            if not is_admin:
                raise HTTPException(status_code=403, detail="สิทธิ์การแก้ไขไม่ถูกต้อง")
            data["paid_date"] = date_fe_to_db(req.paid_date)
            
        if req.pay_note is not None:
            data["pay_note"] = req.pay_note
            
        if req.slip_image_url is not None:
            data["slip_image_url"] = req.slip_image_url

        res = client.table("bills").update(data).eq("id", bill_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบบิลที่ต้องการแก้ไข")
        
        return {"success": True, "bill": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
