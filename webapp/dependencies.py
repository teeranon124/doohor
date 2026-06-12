from fastapi import Header, HTTPException, Depends
from webapp.db import supabase

async def get_admin_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="โปรดเข้าสู่ระบบใหม่ (Missing or invalid token)")
    
    token = authorization.split(" ")[1]
    try:
        # Get user details from Supabase Auth using the token
        # This calls Supabase to verify the signature of the JWT token
        res = supabase.auth.get_user(token)
        if not res.user:
            raise HTTPException(status_code=401, detail="เซสชั่นหมดอายุ")
            
        # Verify the user has the admin role from metadata
        role = res.user.user_metadata.get("role", "tenant")
        if role != "admin":
            raise HTTPException(status_code=403, detail="สิทธิ์การใช้งานไม่ถูกต้อง")
            
        return res.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"เซสชั่นไม่ถูกต้อง หรือหมดอายุ")
