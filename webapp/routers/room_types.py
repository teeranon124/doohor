from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from webapp.db import supabase_admin

router = APIRouter(prefix="/room-types", tags=["room-types"])

class RoomTypeCreateUpdate(BaseModel):
    dorm_id: str
    name: str
    rent: float
    deposit: float

@router.post("")
async def create_room_type(req: RoomTypeCreateUpdate):
    try:
        data = {
            "dorm_id": req.dorm_id,
            "name": req.name,
            "base_rent": req.rent,
            "base_deposit": req.deposit
        }
        res = supabase_admin.table("room_types").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถเพิ่มประเภทห้องพักได้")
        
        rt = res.data[0]
        return {
            "id": str(rt["id"]),
            "name": rt["name"],
            "rent": float(rt["base_rent"]),
            "deposit": float(rt["base_deposit"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{type_id}")
async def update_room_type(type_id: str, req: RoomTypeCreateUpdate):
    try:
        data = {
            "name": req.name,
            "base_rent": req.rent,
            "base_deposit": req.deposit
        }
        res = supabase_admin.table("room_types").update(data).eq("id", type_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบประเภทห้องพักที่ต้องการแก้ไข")
        
        rt = res.data[0]
        # Also update all rooms of this type with the new rent price
        # (According to typical business flow or if user expects it)
        # Note: Vacant rooms of this type will have their rent updated
        supabase_admin.table("rooms").update({
            "rent_price": req.rent,
            "deposit_amount": req.deposit
        }).eq("type_id", type_id).eq("status", "vacant").execute()

        return {
            "id": str(rt["id"]),
            "name": rt["name"],
            "rent": float(rt["base_rent"]),
            "deposit": float(rt["base_deposit"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{type_id}")
async def delete_room_type(type_id: str):
    try:
        # Check if type is in use by any rooms
        rooms_check = supabase_admin.table("rooms").select("id").eq("type_id", type_id).execute()
        if rooms_check.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถลบประเภทห้องพักนี้ได้ เนื่องจากมีห้องพักใช้อยู่")
            
        res = supabase_admin.table("room_types").delete().eq("id", type_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบประเภทห้องพัก")
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
