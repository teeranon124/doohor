from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from supabase import Client
from webapp.dependencies import get_supabase_client
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
    line_user_id: str | None = None

@router.get("")
async def get_dorms(client: Client = Depends(get_supabase_client)):
    try:
        res = client.table("dorms").select("*").execute()
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
async def create_dorm(req: DormCreateUpdate, client: Client = Depends(get_supabase_client)):
    try:
        owner_id = getattr(client, "user_id", None)
        if not owner_id:
            user_res = client.auth.get_user()
            owner_id = user_res.user.id

        data = {
            "owner_id": owner_id,
            "name": req.name,
            "address": req.address or "",
            "promptpay": req.promptpay or "",
            "due_day_of_month": req.due_day_of_month,
            "water_rate": req.water_rate,
            "electric_rate": req.electric_rate
        }
        res = client.table("dorms").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถเพิ่มหอพักได้")
        
        d = res.data[0]
        # Hydrate default room types
        default_types = [
            {"dorm_id": d["id"], "name": "Standard", "base_rent": 4500, "base_deposit": 9000},
            {"dorm_id": d["id"], "name": "VIP", "base_rent": 6500, "base_deposit": 13000}
        ]
        client.table("room_types").insert(default_types).execute()

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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{dorm_id}")
async def update_dorm(dorm_id: str, req: DormCreateUpdate, client: Client = Depends(get_supabase_client)):
    try:
        data = {
            "name": req.name,
            "address": req.address or "",
            "promptpay": req.promptpay or "",
            "due_day_of_month": req.due_day_of_month,
            "water_rate": req.water_rate,
            "electric_rate": req.electric_rate
        }
        owner_id = getattr(client, "user_id", None)
        if owner_id and req.line_user_id is not None:
            supabase_admin.table("users").update({"line_user_id": req.line_user_id}).eq("id", owner_id).execute()

        res = client.table("dorms").update(data).eq("id", dorm_id).execute()
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
            "electricRate": float(d["electric_rate"]),
            "ownerLineUserId": req.line_user_id or ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dorm_id}/details")
async def get_dorm_details(dorm_id: str, client: Client = Depends(get_supabase_client)):
    """
    Get everything inside a dorm: room types, rooms, bills, repairs, deposit history in ONE query.
    """
    try:
        import uuid
        is_uuid = True
        try:
            uuid.UUID(dorm_id)
        except ValueError:
            is_uuid = False

        # If not a valid UUID (e.g. 'D001'), retrieve the first dorm from auth's owned list
        if not is_uuid:
            dorm_res = client.table("dorms").select("id").limit(1).execute()
            if not dorm_res.data:
                raise HTTPException(status_code=404, detail="ไม่พบหอพัก")
            dorm_id = str(dorm_res.data[0]["id"])

        # Fetch entire dorm hierarchy in a single DB query
        res = client.table("dorms").select(
            "*, room_types(*), rooms(*, leases(*), deposit_history(*)), bills(*), repairs(*)"
        ).eq("id", dorm_id).single().execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบหอพัก")
        
        d = res.data

        # Map Room Types
        room_types = []
        room_type_name_map = {}
        for rt in d.get("room_types") or []:
            room_types.append({
                "id": str(rt["id"]),
                "name": rt["name"],
                "rent": float(rt["base_rent"]),
                "deposit": float(rt["base_deposit"])
            })
            room_type_name_map[rt["id"]] = rt["name"]

        # Map Rooms & Flatten Deposit History
        rooms = []
        room_id_to_number_map = {}
        deposit_history = []
        for r in d.get("rooms") or []:
            room_id_to_number_map[r["id"]] = r["room_number"]
            
            # Find the active lease for this room
            active_lease = None
            for lease in r.get("leases") or []:
                if lease["status"] == "active":
                    active_lease = lease
                    break
            
            if active_lease:
                lease_id = str(active_lease["id"])
                tenant_name = active_lease["tenant_name"]
                move_in = date_db_to_fe(active_lease["move_in_date"])
                contract_start = date_db_to_fe(active_lease["contract_start"])
                contract_end = date_db_to_fe(active_lease["contract_end"])
                deposit_amt = float(active_lease["deposit_amount"] or 0)
                deposit_stat = active_lease["deposit_status"] or "none"
                deposit_note = active_lease["deposit_note"] or ""
            else:
                lease_id = str(r["id"]) # Fallback to physical room ID if vacant
                tenant_name = None
                move_in = None
                contract_start = None
                contract_end = None
                deposit_amt = 0.0
                deposit_stat = "none"
                deposit_note = ""

            rooms.append({
                "id": r["room_number"],
                "uuid": lease_id, # Frontend gets this key as tenant login key
                "type": room_type_name_map.get(r["type_id"], "Standard"),
                "rentPrice": float(r["rent_price"]),
                "status": r["status"],
                "tenant": tenant_name,
                "moveInDate": move_in,
                "contractStart": contract_start,
                "contractEnd": contract_end,
                "depositAmount": deposit_amt,
                "depositStatus": deposit_stat,
                "depositNote": deposit_note,
                "lastWaterMeter": float(r["last_water_meter"]),
                "lastElectricMeter": float(r["last_electric_meter"]),
                "roomUuid": str(r["id"]) # Physical room UUID
            })

            # Map deposit history from room records
            for dep in r.get("deposit_history") or []:
                deposit_history.append({
                    "id": str(dep["id"]),
                    "room": r["room_number"],
                    "type": dep["type"],
                    "amount": float(dep["amount"]),
                    "date": date_db_to_fe(dep["created_at"]),
                    "note": dep["note"] or ""
                })

        # Sort rooms by room number/id
        rooms.sort(key=lambda x: x["id"])
        
        # Sort deposit history by date desc
        deposit_history.sort(key=lambda x: x["date"] or "", reverse=True)

        # Map Bills
        bills = []
        for b in d.get("bills") or []:
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

        # Map Repairs
        repairs = []
        for rep in d.get("repairs") or []:
            repairs.append({
                "id": str(rep["id"]),
                "room": room_id_to_number_map.get(rep["room_id"], ""),
                "issue": rep["issue"],
                "date": date_db_to_fe(rep["created_at"]),
                "status": rep["status"]
            })

        owner_line_user_id = ""
        owner_id = d.get("owner_id")
        if owner_id:
            user_res = supabase_admin.table("users").select("line_user_id").eq("id", owner_id).execute()
            if user_res.data:
                owner_line_user_id = user_res.data[0].get("line_user_id") or ""

        return {
            "id": str(d["id"]),
            "name": d["name"],
            "addr": d["address"] or "",
            "promptpay": d["promptpay"] or "",
            "dueDayOfMonth": d["due_day_of_month"],
            "waterRate": float(d["water_rate"]),
            "electricRate": float(d["electric_rate"]),
            "ownerLineUserId": owner_line_user_id,
            "roomTypes": room_types,
            "rooms": rooms,
            "bills": bills,
            "repairs": repairs,
            "depositHistory": deposit_history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dorm_id}/dashboard-stats")
async def get_dorm_dashboard_stats(dorm_id: str, client: Client = Depends(get_supabase_client)):
    try:
        # Try calling the database RPC
        res = client.rpc("get_dashboard_stats", {"dorm_uuid": dorm_id}).execute()
        if res.data:
            return res.data
            
        # Fallback to simple queries if RPC is not loaded in SQL editor yet
        return await _get_stats_fallback(client, dorm_id)
    except Exception:
        # Fallback in case RPC execution throws database errors
        return await _get_stats_fallback(client, dorm_id)

async def _get_stats_fallback(client: Client, dorm_id: str):
    try:
        rooms_res = client.table("rooms").select("status").eq("dorm_id", dorm_id).execute()
        rooms = rooms_res.data or []
        total = len(rooms)
        occ = sum(1 for r in rooms if r["status"] == "occupied")
        
        bills_res = client.table("bills").select("total").eq("dorm_id", dorm_id).in_("status", ["unpaid", "pending_approval"]).execute()
        income = sum(float(b["total"]) for b in (bills_res.data or []))
        
        repairs_res = client.table("repairs").select("id").eq("dorm_id", dorm_id).eq("status", "pending").execute()
        repairs_count = len(repairs_res.data or [])
        
        return {
            "occupied_rooms": occ,
            "total_rooms": total,
            "pending_income": income,
            "pending_repairs": repairs_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
