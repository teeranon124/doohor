from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from webapp.db import supabase_admin
from webapp.utils import (
    date_db_to_fe,
    get_thai_month_name,
    date_fe_to_db
)

router = APIRouter(prefix="/dorms", tags=["dorms"])

class DormCreateUpdate(BaseModel):
    name: str
    address: str | None = None
    promptpay: str | None = None
    due_day_of_month: int = 5
    water_rate: float = 18.0
    electric_rate: float = 8.0

@router.get("")
async def get_dorms():
    try:
        res = supabase_admin.table("dorms").select("*").execute()
        # Map DB snake_case fields to camelCase expected by FE
        dorms = []
        for d in res.data:
            dorms.append({
                "id": str(d["id"]),
                "name": d["name"],
                "addr": d["address"] or "",
                "promptpay": d["promptpay"] or "",
                "dueDayOfMonth": d["due_day_of_month"],
                "waterRate": float(d["water_rate"]),
                "electricRate": float(d["electric_rate"])
            })
        return dorms
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_dorm(req: DormCreateUpdate):
    try:
        data = {
            "name": req.name,
            "address": req.address or "",
            "promptpay": req.promptpay or "",
            "due_day_of_month": req.due_day_of_month,
            "water_rate": req.water_rate,
            "electric_rate": req.electric_rate
        }
        res = supabase_admin.table("dorms").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถเพิ่มหอพักได้")
        
        d = res.data[0]
        # Hydrate default room types
        default_types = [
            {"dorm_id": d["id"], "name": "Standard", "base_rent": 4500, "base_deposit": 9000},
            {"dorm_id": d["id"], "name": "VIP", "base_rent": 6500, "base_deposit": 13000}
        ]
        supabase_admin.table("room_types").insert(default_types).execute()

        return {
            "id": str(d["id"]),
            "name": d["name"],
            "addr": d["address"] or "",
            "promptpay": d["promptpay"] or "",
            "dueDayOfMonth": d["due_day_of_month"],
            "waterRate": float(d["water_rate"]),
            "electricRate": float(d["electric_rate"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{dorm_id}")
async def update_dorm(dorm_id: str, req: DormCreateUpdate):
    try:
        data = {
            "name": req.name,
            "address": req.address or "",
            "promptpay": req.promptpay or "",
            "due_day_of_month": req.due_day_of_month,
            "water_rate": req.water_rate,
            "electric_rate": req.electric_rate
        }
        res = supabase_admin.table("dorms").update(data).eq("id", dorm_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบหอพักที่ต้องการแก้ไข")
        d = res.data[0]
        return {
            "id": str(d["id"]),
            "name": d["name"],
            "addr": d["address"] or "",
            "promptpay": d["promptpay"] or "",
            "dueDayOfMonth": d["due_day_of_month"],
            "waterRate": float(d["water_rate"]),
            "electricRate": float(d["electric_rate"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dorm_id}/details")
async def get_dorm_details(dorm_id: str):
    """
    Get everything inside a dorm: room types, rooms, bills, repairs, deposit history.
    This mimics the nested structure of a dorm object in FE.
    """
    try:
        import uuid
        is_uuid = True
        try:
            uuid.UUID(dorm_id)
        except ValueError:
            is_uuid = False

        if not is_uuid:
            # Fallback to the first dorm in the database if dorm_id is not a valid UUID (e.g. 'D001')
            dorm_res = supabase_admin.table("dorms").select("*").limit(1).execute()
            if not dorm_res.data:
                raise HTTPException(status_code=404, detail="ไม่พบหอพัก")
            d = dorm_res.data[0]
            dorm_id = str(d["id"])
        else:
            # Fetch dorm metadata
            dorm_res = supabase_admin.table("dorms").select("*").eq("id", dorm_id).execute()
            if not dorm_res.data:
                raise HTTPException(status_code=404, detail="ไม่พบหอพัก")
            d = dorm_res.data[0]

        # Fetch room types
        rt_res = supabase_admin.table("room_types").select("*").eq("dorm_id", dorm_id).execute()
        room_types = []
        room_type_name_map = {}
        for rt in rt_res.data:
            room_types.append({
                "id": str(rt["id"]),
                "name": rt["name"],
                "rent": float(rt["base_rent"]),
                "deposit": float(rt["base_deposit"])
            })
            room_type_name_map[rt["id"]] = rt["name"]

        # Fetch rooms
        rooms_res = supabase_admin.table("rooms").select("*").eq("dorm_id", dorm_id).execute()
        rooms = []
        room_id_to_number_map = {}
        room_uuids = []
        for r in rooms_res.data:
            room_uuids.append(r["id"])
            room_id_to_number_map[r["id"]] = r["room_number"]
            rooms.append({
                "id": r["room_number"],
                "uuid": str(r["id"]),
                "type": room_type_name_map.get(r["type_id"], "Standard"),
                "rentPrice": float(r["rent_price"]),
                "status": r["status"],
                "tenant": r["tenant_name"],
                "moveInDate": date_db_to_fe(r["move_in_date"]),
                "contractStart": date_db_to_fe(r["contract_start"]),
                "contractEnd": date_db_to_fe(r["contract_end"]),
                "depositAmount": float(r["deposit_amount"]),
                "depositStatus": r["deposit_status"] or "none",
                "depositNote": r["deposit_note"] or "",
                "lastWaterMeter": float(r["last_water_meter"]),
                "lastElectricMeter": float(r["last_electric_meter"])
            })

        # Sort rooms by room number/id
        rooms.sort(key=lambda x: x["id"])

        # Fetch bills
        bills_res = supabase_admin.table("bills").select("*").eq("dorm_id", dorm_id).execute()
        bills = []
        for b in bills_res.data:
            extra_charges = b.get("extra_charges") or []
            other_fees = sum(item.get("amt", 0) for item in extra_charges)
            other_desc = ", ".join(item.get("desc", "") for item in extra_charges) if extra_charges else ""
            bills.append({
                "id": str(b["id"]),
                "room": room_id_to_number_map.get(b["room_id"], ""),
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
                "slipImageUrl": b.get("slip_image_url") or ""
            })

        # Fetch repairs
        repairs_res = supabase_admin.table("repairs").select("*").eq("dorm_id", dorm_id).execute()
        repairs = []
        for rep in repairs_res.data:
            repairs.append({
                "id": str(rep["id"]),
                "room": room_id_to_number_map.get(rep["room_id"], ""),
                "issue": rep["issue"],
                "date": date_db_to_fe(rep["created_at"]),
                "status": rep["status"]
            })

        # Fetch deposit history for all rooms in this dorm
        deposit_history = []
        if room_uuids:
            dep_res = supabase_admin.table("deposit_history").select("*").in_("room_id", room_uuids).execute()
            for dep in dep_res.data:
                deposit_history.append({
                    "id": str(dep["id"]),
                    "room": room_id_to_number_map.get(dep["room_id"], ""),
                    "type": dep["type"],
                    "amount": float(dep["amount"]),
                    "date": date_db_to_fe(dep["created_at"]),
                    "note": dep["note"] or ""
                })

        return {
            "id": str(d["id"]),
            "name": d["name"],
            "addr": d["address"] or "",
            "promptpay": d["promptpay"] or "",
            "dueDayOfMonth": d["due_day_of_month"],
            "waterRate": float(d["water_rate"]),
            "electricRate": float(d["electric_rate"]),
            "roomTypes": room_types,
            "rooms": rooms,
            "bills": bills,
            "repairs": repairs,
            "depositHistory": deposit_history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
