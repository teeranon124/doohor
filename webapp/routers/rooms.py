from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from webapp.db import supabase_admin
from webapp.utils import date_fe_to_db, date_db_to_fe

router = APIRouter(prefix="/rooms", tags=["rooms"])

class RoomCreate(BaseModel):
    dorm_id: str
    room_number: str
    type_id: str
    rent_price: float

class RoomEdit(BaseModel):
    type_id: str | None = None
    rent_price: float | None = None
    tenant_name: str | None = None
    move_in_date: str | None = None  # BE date DD/MM/YYYY
    contract_start: str | None = None  # BE date DD/MM/YYYY
    contract_end: str | None = None  # BE date DD/MM/YYYY
    deposit_amount: float | None = None
    deposit_status: str | None = None
    deposit_note: str | None = None
    last_water_meter: float | None = None
    last_electric_meter: float | None = None

class CheckinRequest(BaseModel):
    tenant_name: str
    move_in_date: str  # BE date DD/MM/YYYY
    contract_start: str  # BE date DD/MM/YYYY
    contract_end: str  # BE date DD/MM/YYYY
    rent_price: float
    deposit_amount: float
    last_water_meter: float
    last_electric_meter: float

class CheckoutRequest(BaseModel):
    date: str | None = None # BE date
    note: str | None = None

class DepositRequest(BaseModel):
    type: str  # 'received', 'partial', 'returned'
    amount: float
    note: str | None = None

def resolve_room_id(room_id: str) -> str:
    import uuid
    try:
        uuid.UUID(room_id)
        return room_id
    except ValueError:
        # Not a valid UUID, treat it as a room number (e.g., "101")
        res = supabase_admin.table("rooms").select("id").eq("room_number", room_id).execute()
        if res.data:
            return str(res.data[0]["id"])
        raise HTTPException(status_code=404, detail=f"ไม่พบห้องพักหมายเลข {room_id}")

@router.post("")
async def create_room(req: RoomCreate):
    try:
        # Check if room already exists
        check_res = supabase_admin.table("rooms").select("id").eq("dorm_id", req.dorm_id).eq("room_number", req.room_number).execute()
        if check_res.data:
            raise HTTPException(status_code=400, detail=f"ห้อง {req.room_number} มีอยู่ในระบบแล้ว")

        # Get default deposit from room type
        type_res = supabase_admin.table("room_types").select("base_deposit").eq("id", req.type_id).execute()
        deposit = 0.0
        if type_res.data:
            deposit = float(type_res.data[0]["base_deposit"])

        data = {
            "dorm_id": req.dorm_id,
            "room_number": req.room_number,
            "type_id": req.type_id,
            "rent_price": req.rent_price,
            "status": "vacant",
            "deposit_amount": deposit,
            "deposit_status": "none"
        }
        res = supabase_admin.table("rooms").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถเพิ่มห้องพักได้")
        
        return {"success": True, "room": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{room_id}")
async def update_room(room_id: str, req: RoomEdit):
    try:
        # Resolve room_id to database UUID
        resolved_uuid = resolve_room_id(room_id)

        data = {}
        if req.type_id is not None:
            data["type_id"] = req.type_id
        if req.rent_price is not None:
            data["rent_price"] = req.rent_price
        if req.tenant_name is not None:
            data["tenant_name"] = req.tenant_name
        if req.move_in_date is not None:
            data["move_in_date"] = date_fe_to_db(req.move_in_date)
        if req.contract_start is not None:
            data["contract_start"] = date_fe_to_db(req.contract_start)
        if req.contract_end is not None:
            data["contract_end"] = date_fe_to_db(req.contract_end)
        if req.deposit_amount is not None:
            data["deposit_amount"] = req.deposit_amount
        if req.deposit_status is not None:
            data["deposit_status"] = req.deposit_status
        if req.deposit_note is not None:
            data["deposit_note"] = req.deposit_note
        if req.last_water_meter is not None:
            data["last_water_meter"] = req.last_water_meter
        if req.last_electric_meter is not None:
            data["last_electric_meter"] = req.last_electric_meter

        res = supabase_admin.table("rooms").update(data).eq("id", resolved_uuid).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบห้องพักที่ต้องการแก้ไข")
        
        return {"success": True, "room": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{room_id}/checkin")
async def checkin_tenant(room_id: str, req: CheckinRequest):
    try:
        # Resolve room_id to database UUID
        resolved_uuid = resolve_room_id(room_id)

        data = {
            "tenant_name": req.tenant_name,
            "move_in_date": date_fe_to_db(req.move_in_date),
            "contract_start": date_fe_to_db(req.contract_start),
            "contract_end": date_fe_to_db(req.contract_end),
            "rent_price": req.rent_price,
            "deposit_amount": req.deposit_amount,
            "deposit_status": "held" if req.deposit_amount > 0 else "none",
            "last_water_meter": req.last_water_meter,
            "last_electric_meter": req.last_electric_meter,
            "status": "occupied"
        }
        # Update room status and tenant info
        res = supabase_admin.table("rooms").update(data).eq("id", resolved_uuid).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบห้องพัก")

        # Create deposit history record if deposit > 0
        if req.deposit_amount > 0:
            dep_history = {
                "room_id": resolved_uuid,
                "type": "received",
                "amount": req.deposit_amount,
                "note": "รับมัดจำเริ่มสัญญา"
            }
            supabase_admin.table("deposit_history").insert(dep_history).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{room_id}/checkout")
async def checkout_tenant(room_id: str, req: CheckoutRequest):
    try:
        # Resolve room_id to database UUID
        resolved_uuid = resolve_room_id(room_id)

        # Get room details to check current deposit
        room_res = supabase_admin.table("rooms").select("*").eq("id", resolved_uuid).execute()
        if not room_res.data:
            raise HTTPException(status_code=404, detail="ไม่พบห้องพัก")
        
        room = room_res.data[0]
        dep_amt = float(room.get("deposit_amount") or 0)

        # Update room to vacant
        data = {
            "tenant_name": None,
            "move_in_date": None,
            "contract_start": None,
            "contract_end": None,
            "deposit_amount": 0,
            "deposit_status": "none",
            "deposit_note": "",
            "status": "vacant"
        }
        supabase_admin.table("rooms").update(data).eq("id", resolved_uuid).execute()

        # If there was a deposit, log it in history as returned/forfeited based on the note
        if dep_amt > 0:
            dep_history = {
                "room_id": resolved_uuid,
                "type": "returned",
                "amount": dep_amt,
                "note": req.note or "คืนมัดจำเมื่อย้ายออก"
            }
            supabase_admin.table("deposit_history").insert(dep_history).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{room_id}/deposit")
async def manage_deposit(room_id: str, req: DepositRequest):
    try:
        # Resolve room_id to database UUID
        resolved_uuid = resolve_room_id(room_id)

        # Create deposit history record
        dep_history = {
            "room_id": resolved_uuid,
            "type": req.type,
            "amount": req.amount,
            "note": req.note or ""
        }
        res = supabase_admin.table("deposit_history").insert(dep_history).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถบันทึกประวัติมัดจำได้")

        # Update deposit amount/status in rooms table
        room_res = supabase_admin.table("rooms").select("deposit_amount").eq("id", resolved_uuid).execute()
        if room_res.data:
            curr_dep = float(room_res.data[0]["deposit_amount"] or 0)
            if req.type == "received":
                new_dep = curr_dep + req.amount
                new_status = "held"
            elif req.type == "returned":
                new_dep = max(0.0, curr_dep - req.amount)
                new_status = "returned" if new_dep == 0 else "held"
            else: # partial
                new_dep = req.amount
                new_status = "held"
            
            supabase_admin.table("rooms").update({
                "deposit_amount": new_dep,
                "deposit_status": new_status,
                "deposit_note": req.note or ""
            }).eq("id", resolved_uuid).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
