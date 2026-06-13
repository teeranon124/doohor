from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from supabase import Client
from webapp.db import supabase_admin
from webapp.dependencies import get_supabase_client

router = APIRouter(prefix="/repairs", tags=["repairs"])

class RepairCreate(BaseModel):
    room_uuid: str
    dorm_id: str
    issue: str

class RepairUpdate(BaseModel):
    status: str  # pending, in_progress, completed

@router.post("")
async def create_repair(req: RepairCreate):
    """
    Tenant endpoint to report repairs. Bypasses token verification to support room PIN sessions.
    """
    try:
        import uuid
        is_uuid = True
        try:
            uuid.UUID(req.room_uuid)
        except ValueError:
            is_uuid = False

        room_id = req.room_uuid
        lease_id = None
        if is_uuid:
            # Check if it is a lease ID
            lease_res = supabase_admin.table("leases").select("room_id").eq("id", req.room_uuid).execute()
            if lease_res.data:
                room_id = lease_res.data[0]["room_id"]
                lease_id = req.room_uuid

        data = {
            "room_id": room_id,
            "lease_id": lease_id,
            "dorm_id": req.dorm_id,
            "issue": req.issue,
            "status": "pending"
        }
        res = supabase_admin.table("repairs").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="ไม่สามารถส่งแจ้งซ่อมได้")
        
        return {"success": True, "repair": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{repair_id}")
async def update_repair(repair_id: str, req: RepairUpdate, client: Client = Depends(get_supabase_client)):
    """
    Admin endpoint to update repair status.
    """
    try:
        data = {
            "status": req.status
        }
        if req.status == "completed":
            from datetime import datetime, timezone
            data["resolved_at"] = datetime.now(timezone.utc).isoformat()

        res = client.table("repairs").update(data).eq("id", repair_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบข้อมูลแจ้งซ่อม")
        
        return {"success": True, "repair": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
