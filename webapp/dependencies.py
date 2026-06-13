import time
import base64
import json
from fastapi import Header, HTTPException
from supabase import create_client, Client, ClientOptions
from webapp.config import settings
from webapp.db import supabase_admin

TOKEN_CACHE = {}  # token -> {"valid": bool, "error_detail": str, "user_id": str, "email": str, "role": str, "expires_at": float}
CACHE_TTL = 300   # 5 minutes cache TTL

def decode_jwt_payload_local(token: str) -> dict:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return {}
        payload_b64 = parts[1]
        payload_b64 += '=' * ((4 - len(payload_b64) % 4) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes.decode('utf-8'))
    except Exception:
        return {}

async def get_supabase_client(authorization: str = Header(None)) -> Client:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="โปรดเข้าสู่ระบบใหม่ (Missing or invalid token)")
    
    token = authorization.split(" ")[1]
    now = time.time()
    
    # Check cache first
    cached = TOKEN_CACHE.get(token)
    if cached and cached["expires_at"] > now:
        if not cached["valid"]:
            status_code = 403 if "สิทธิ์" in cached["error_detail"] else 401
            raise HTTPException(status_code=status_code, detail=cached["error_detail"])
        
        # Cache hit and valid! Recreate the client and attach user info
        client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY,
            options=ClientOptions(
                headers={"Authorization": f"Bearer {token}"}
            )
        )
        client.auth.set_session(access_token=token, refresh_token="")
        client.user_id = cached["user_id"]
        client.user_email = cached["email"]
        client.user_role = cached["role"]
        return client

    # Cache miss - decode locally and verify role via DB
    payload = decode_jwt_payload_local(token)
    if not payload:
        raise HTTPException(status_code=401, detail="เซสชั่นไม่ถูกต้อง หรือหมดอายุ")
        
    exp = payload.get("exp")
    if exp and exp < now:
        raise HTTPException(status_code=401, detail="เซสชั่นหมดอายุ")
        
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id:
        raise HTTPException(status_code=401, detail="เซสชั่นไม่ถูกต้อง หรือหมดอายุ")

    try:
        # Verify the user role from public.users table (direct DB query is much faster than auth.get_user)
        user_data = supabase_admin.table("users").select("role").eq("id", user_id).execute()
        role = None
        if user_data.data:
            role = user_data.data[0].get("role")
            
        # Fallback to user_metadata inside the token
        if not role:
            role = payload.get("user_metadata", {}).get("role", "tenant")
            
        if role != "admin":
            TOKEN_CACHE[token] = {
                "valid": False, 
                "error_detail": "สิทธิ์การใช้งานไม่ถูกต้อง", 
                "user_id": user_id,
                "email": email,
                "role": role,
                "expires_at": now + CACHE_TTL
            }
            raise HTTPException(status_code=403, detail="สิทธิ์การใช้งานไม่ถูกต้อง")
            
        # Cache success!
        TOKEN_CACHE[token] = {
            "valid": True, 
            "error_detail": None, 
            "user_id": user_id,
            "email": email,
            "role": role,
            "expires_at": now + CACHE_TTL
        }
        
        client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY,
            options=ClientOptions(
                headers={"Authorization": f"Bearer {token}"}
            )
        )
        client.auth.set_session(access_token=token, refresh_token="")
        client.user_id = user_id
        client.user_email = email
        client.user_role = role
        return client
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=401, detail="เซสชั่นไม่ถูกต้อง หรือหมดอายุ")

