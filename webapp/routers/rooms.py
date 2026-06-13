from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from supabase import Client
from webapp.dependencies import get_supabase_client
from webapp.utils import date_fe_to_db, date_db_to_fe

router = APIRouter(prefix="/rooms", tags=["rooms"])

class RoomCreate(BaseModel):
    dorm_id: str
    room_number: str
    type_id: str
    rent_price: float = Field(..., gt=0, description="ค่าเช่าต้องมากกว่า 0")

class RoomEdit(BaseModel):
    type_id: str | None = None
    rent_price: float | None = Field(None, gt=0)
    tenant_name: str | None = None
    move_in_date: str | None = None  # BE date DD/MM/YYYY
    contract_start: str | None = None  # BE date DD/MM/YYYY
    contract_end: str | None = None  # BE date DD/MM/YYYY
    deposit_amount: float | None = Field(None, ge=0)
    deposit_status: str | None = None
    deposit_note: str | None = None
    last_water_meter: float | None = Field(None, ge=0)
    last_electric_meter: float | None = Field(None, ge=0)

class CheckinRequest(BaseModel):
    tenant_name: str
    move_in_date: str  # BE date DD/MM/YYYY
    contract_start: str  # BE date DD/MM/YYYY
    contract_end: str  # BE date DD/MM/YYYY
    rent_price: float = Field(..., gt=0)
    deposit_amount: float = Field(..., ge=0)
    last_water_meter: float = Field(..., ge=0)
    last_electric_meter: float = Field(..., ge=0)

class CheckoutRequest(BaseModel):
    date: str | None = None # BE date
    note: str | None = None

class DepositRequest(BaseModel):
    type: str  # 'received', 'partial', 'returned'
    amount: float = Field(..., gt=0)
    note: str | None = None

def resolve_room_id(room_id: str, client: Client) -> str:
    import uuid
    try:
        uuid.UUID(room_id)
        # It's a valid UUID. Check if it's a physical room ID first
        room_check = client.table("rooms").select("id").eq("id", room_id).execute()
        if room_check.data:
            return room_id
            
        # If not, check if it's an active lease ID
        lease_check = client.table("leases").select("room_id").eq("id", room_id).execute()
        if lease_check.data:
            return str(lease_check.data[0]["room_id"])
            
        raise HTTPException(status_code=404, detail="ไม่พบห้องพักหรือสัญญาเช่าที่ระบุ")
    except ValueError:
        # Not a valid UUID, treat it as a room number (e.g., "101")
        res = client.table("rooms").select("id").eq("room_number", room_id).execute()
        if res.data:
            return str(res.data[0]["id"])
        raise HTTPException(status_code=404, detail=f"ไม่พบห้องพักหมายเลข {room_id}")

@router.post("")
async def create_room(req: RoomCreate, client: Client = Depends(get_supabase_client)):
    try:
        # Check if room already exists
        check_res = client.table("rooms").select("id").eq("dorm_id", req.dorm_id).eq("room_number", req.room_number).execute()
        if check_res.data:
            raise HTTPException(status_code=400, detail=f"ห้อง {req.room_number} มีอยู่ในระบบแล้ว")

        # Get default deposit from room type
        type_res = client.table("room_types").select("base_deposit").eq("id", req.type_id).execute()
        deposit = 0.0
        if type_res.data:
            deposit = float(type_res.data[0]["base_deposit"])

        data = {
            "dorm_id": req.dorm_id,
            "room_number": req.room_number,
            "type_id": req.type_id,
            "rent_price": req.rent_price,
            "status": "vacant"
        }
        res = client.table("rooms").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถเพิ่มห้องพักได้")
        
        return {"success": True, "room": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{room_id}")
async def update_room(room_id: str, req: RoomEdit, client: Client = Depends(get_supabase_client)):
    try:
        # Resolve room_id to database UUID
        resolved_uuid = resolve_room_id(room_id, client)

        # Update physical room fields
        room_data = {}
        if req.type_id is not None:
            room_data["type_id"] = req.type_id
        if req.rent_price is not None:
            room_data["rent_price"] = req.rent_price
        if req.last_water_meter is not None:
            room_data["last_water_meter"] = req.last_water_meter
        if req.last_electric_meter is not None:
            room_data["last_electric_meter"] = req.last_electric_meter

        if room_data:
            res_room = client.table("rooms").update(room_data).eq("id", resolved_uuid).execute()
            if not res_room.data:
                raise HTTPException(status_code=404, detail="ไม่พบห้องพักที่ต้องการแก้ไข")

        # Update active lease fields if room is occupied and lease fields are passed
        lease_data = {}
        if req.tenant_name is not None:
            lease_data["tenant_name"] = req.tenant_name
        if req.contract_start is not None:
            lease_data["contract_start"] = date_fe_to_db(req.contract_start)
        if req.contract_end is not None:
            lease_data["contract_end"] = date_fe_to_db(req.contract_end)

        if lease_data:
            # Find the active lease
            lease_res = client.table("leases").select("id").eq("room_id", resolved_uuid).eq("status", "active").execute()
            if lease_res.data:
                active_lease_id = lease_res.data[0]["id"]
                client.table("leases").update(lease_data).eq("id", active_lease_id).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{room_id}/checkin")
async def checkin_tenant(room_id: str, req: CheckinRequest, client: Client = Depends(get_supabase_client)):
    try:
        # Resolve room_id to database UUID
        resolved_uuid = resolve_room_id(room_id, client)

        # Get room info to fetch dorm_id
        room_res = client.table("rooms").select("dorm_id").eq("id", resolved_uuid).execute()
        if not room_res.data:
            raise HTTPException(status_code=404, detail="ไม่พบห้องพัก")
        dorm_id = room_res.data[0]["dorm_id"]

        # Create active lease record
        lease_data = {
            "dorm_id": dorm_id,
            "room_id": resolved_uuid,
            "tenant_name": req.tenant_name,
            "move_in_date": date_fe_to_db(req.move_in_date),
            "contract_start": date_fe_to_db(req.contract_start),
            "contract_end": date_fe_to_db(req.contract_end),
            "deposit_amount": req.deposit_amount,
            "deposit_status": "held" if req.deposit_amount > 0 else "none",
            "status": "active"
        }
        lease_res = client.table("leases").insert(lease_data).execute()
        if not lease_res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถสร้างสัญญาเช่าได้")

        # Update room status and meters
        room_update = {
            "last_water_meter": req.last_water_meter,
            "last_electric_meter": req.last_electric_meter,
            "status": "occupied"
        }
        client.table("rooms").update(room_update).eq("id", resolved_uuid).execute()

        # Create deposit history record if deposit > 0
        if req.deposit_amount > 0:
            dep_history = {
                "room_id": resolved_uuid,
                "type": "received",
                "amount": req.deposit_amount,
                "note": "รับมัดจำเริ่มสัญญา"
            }
            client.table("deposit_history").insert(dep_history).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{room_id}/checkout")
async def checkout_tenant(room_id: str, req: CheckoutRequest, client: Client = Depends(get_supabase_client)):
    try:
        # Resolve room_id to database UUID
        resolved_uuid = resolve_room_id(room_id, client)

        # Get active lease for this room
        lease_res = client.table("leases").select("*").eq("room_id", resolved_uuid).eq("status", "active").execute()
        if not lease_res.data:
            raise HTTPException(status_code=400, detail="ไม่พบสัญญาเช่าที่ใช้งานอยู่ในห้องนี้")
        
        lease = lease_res.data[0]
        active_lease_id = lease["id"]
        dep_amt = float(lease.get("deposit_amount") or 0)

        # Terminate active lease
        lease_update = {
            "status": "terminated",
            "deposit_status": "returned" if dep_amt > 0 else "none",
            "deposit_note": req.note or "คืนมัดจำเมื่อย้ายออก"
        }
        client.table("leases").update(lease_update).eq("id", active_lease_id).execute()

        # Update room to vacant
        room_update = {
            "status": "vacant"
        }
        client.table("rooms").update(room_update).eq("id", resolved_uuid).execute()

        # Log deposit return if applicable
        if dep_amt > 0:
            dep_history = {
                "room_id": resolved_uuid,
                "type": "returned",
                "amount": dep_amt,
                "note": req.note or "คืนมัดจำเมื่อย้ายออก"
            }
            client.table("deposit_history").insert(dep_history).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{room_id}/deposit")
async def manage_deposit(room_id: str, req: DepositRequest, client: Client = Depends(get_supabase_client)):
    try:
        # Resolve room_id to database UUID
        resolved_uuid = resolve_room_id(room_id, client)

        # Get active lease
        lease_res = client.table("leases").select("*").eq("room_id", resolved_uuid).eq("status", "active").execute()
        if not lease_res.data:
            raise HTTPException(status_code=400, detail="ไม่พบสัญญาเช่าที่ใช้งานอยู่ในห้องนี้")
            
        lease = lease_res.data[0]
        active_lease_id = lease["id"]
        curr_dep = float(lease.get("deposit_amount") or 0)

        if req.type == "received":
            new_dep = curr_dep + req.amount
            new_status = "held"
        elif req.type == "returned":
            new_dep = max(0.0, curr_dep - req.amount)
            new_status = "returned" if new_dep == 0 else "held"
        else: # partial/forfeited
            new_dep = req.amount
            new_status = "held"

        # Create deposit history record
        dep_history = {
            "room_id": resolved_uuid,
            "type": req.type,
            "amount": req.amount,
            "note": req.note or ""
        }
        res_history = client.table("deposit_history").insert(dep_history).execute()
        if not res_history.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถบันทึกประวัติมัดจำได้")

        # Update active lease
        client.table("leases").update({
            "deposit_amount": new_dep,
            "deposit_status": new_status,
            "deposit_note": req.note or ""
        }).eq("id", active_lease_id).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
