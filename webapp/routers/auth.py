from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from webapp.db import supabase_admin, supabase

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
        is_uuid = True
        try:
            uuid.UUID(room_uuid)
        except ValueError:
            is_uuid = False

        query = supabase_admin.table("rooms").select("*, dorms(id, name)").eq("status", "occupied")
        if is_uuid:
            query = query.eq("id", room_uuid)
        else:
            query = query.eq("room_number", room_uuid)

        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="ไม่พบข้อมูลห้องพักนี้")
        
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
