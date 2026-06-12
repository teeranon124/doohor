from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from webapp.db import supabase_admin

router = APIRouter(prefix="/repairs", tags=["repairs"])

class RepairCreate(BaseModel):
    room_uuid: str
    dorm_id: str
    issue: str

class RepairUpdate(BaseModel):
    status: str  # pending, in_progress, completed

@router.post("")
async def create_repair(req: RepairCreate):
    try:
        data = {
            "room_id": req.room_uuid,
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
async def update_repair(repair_id: str, req: RepairUpdate):
    try:
        data = {
            "status": req.status
        }
        if req.status == "completed":
            from datetime import datetime, timezone
            data["resolved_at"] = datetime.now(timezone.utc).isoformat()

        res = supabase_admin.table("repairs").update(data).eq("id", repair_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบข้อมูลแจ้งซ่อม")
        
        return {"success": True, "repair": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
