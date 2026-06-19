from fastapi import APIRouter, Request, Header, HTTPException
from linebot.v3.webhook import WebhookParser
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.webhooks import PostbackEvent, MessageEvent, TextMessageContent
from webapp.config import settings
from webapp.db import supabase_admin
from datetime import datetime, timezone
import urllib.parse
from webapp.utils_line import send_status_update_to_tenant

router = APIRouter(prefix="/webhook", tags=["webhook"])

@router.post("/line")
async def line_webhook(request: Request, x_line_signature: str = Header(None)):
    if not settings.LINE_CHANNEL_SECRET:
        raise HTTPException(status_code=500, detail="LINE Channel Secret is not configured.")
        
    body = await request.body()
    body_str = body.decode('utf-8')
    
    parser = WebhookParser(settings.LINE_CHANNEL_SECRET)
    try:
        events = parser.parse(body_str, x_line_signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    for event in events:
        if isinstance(event, PostbackEvent):
            postback_data = event.postback.data
            # postback_data is query-string-like: action=approve&order_id=...
            params = dict(urllib.parse.parse_qsl(postback_data))
            action = params.get("action")
            order_id = params.get("order_id")
            
            if not action or not order_id:
                continue
                
            # Fetch current order to see if it's already processed
            order_res = supabase_admin.table("orders").select("*").eq("id", order_id).execute()
            if not order_res.data:
                print(f"Order {order_id} not found in database.")
                continue
                
            order = order_res.data[0]
            if order["status"] != "pending":
                # Already processed, reply that it is already resolved
                try:
                    from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, TextMessage
                    config = Configuration(access_token=settings.LINE_CHANNEL_ACCESS_TOKEN)
                    api_client = ApiClient(config)
                    messaging_api = MessagingApi(api_client)
                    reply_text = f"ขออภัย รายการนี้ได้รับการจัดการไปก่อนหน้านี้แล้ว (สถานะปัจจุบัน: {order['status']})"
                    reply_request = ReplyMessageRequest(
                        replyToken=event.reply_token,
                        messages=[TextMessage(text=reply_text)]
                    )
                    messaging_api.reply_message(reply_request)
                except Exception:
                    pass
                continue
                
            # Perform DB update
            status = "approved" if action == "approve" else "rejected"
            admin_note = None if action == "approve" else "ปฏิเสธผ่าน LINE Bot"
            approved_at = datetime.now(timezone.utc).isoformat() if action == "approve" else None
            
            update_data = {
                "status": status,
                "admin_note": admin_note,
                "approved_at": approved_at
            }
            res = supabase_admin.table("orders").update(update_data).eq("id", order_id).execute()
            
            if action == "approve" and res.data:
                try:
                    from webapp.utils import auto_approve_bill_for_order
                    auto_approve_bill_for_order(res.data[0])
                except Exception as e:
                    print(f"Error auto-approving bill via LINE Bot: {e}")
            
            # Notify the tenant
            try:
                lease_id = order.get("lease_id")
                if lease_id:
                    lease_res = supabase_admin.table("leases").select("line_user_id").eq("id", lease_id).execute()
                    if lease_res.data and lease_res.data[0]["line_user_id"]:
                        line_id = lease_res.data[0]["line_user_id"]
                        send_status_update_to_tenant(line_id, order_id, status, admin_note)
            except Exception as e:
                print(f"Failed to notify tenant of LINE approval/rejection: {e}")
                
            # Reply to the admin thread
            try:
                from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, TextMessage
                config = Configuration(access_token=settings.LINE_CHANNEL_ACCESS_TOKEN)
                api_client = ApiClient(config)
                messaging_api = MessagingApi(api_client)
                
                status_msg = "อนุมัติ" if action == "approve" else "ปฏิเสธ"
                reply_text = f"ทำรายการ {status_msg} ใบสั่งซื้อ #{order_id[-8:]} สำเร็จเรียบร้อยแล้ว!"
                
                reply_request = ReplyMessageRequest(
                    replyToken=event.reply_token,
                    messages=[TextMessage(text=reply_text)]
                )
                messaging_api.reply_message(reply_request)
            except Exception as reply_err:
                print(f"Failed to send reply to admin: {reply_err}")
                
        elif isinstance(event, MessageEvent) and isinstance(event.message, TextMessageContent):
            text = event.message.text.strip()
            # Check if text is a 6-digit code
            if len(text) == 6 and text.isdigit():
                # Query users table to find who generated this code
                user_res = supabase_admin.table("users").select("id, name").eq("line_binding_code", text).execute()
                if user_res.data:
                    user = user_res.data[0]
                    user_id = user["id"]
                    user_name = user.get("name") or "ผู้ใช้งาน"
                    
                    # Update line_user_id on this user, clear the binding code
                    supabase_admin.table("users").update({
                        "line_user_id": event.source.user_id,
                        "line_binding_code": None
                    }).eq("id", user_id).execute()
                    
                    # Reply confirmation
                    try:
                        from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, TextMessage
                        config = Configuration(access_token=settings.LINE_CHANNEL_ACCESS_TOKEN)
                        api_client = ApiClient(config)
                        messaging_api = MessagingApi(api_client)
                        
                        reply_text = f"🎉 เชื่อมต่อบัญชีเจ้าของหอพักสำเร็จแล้ว!\n\nคุณ {user_name} จะได้รับการแจ้งเตือนสลิปโอนเงินค่าเช่าจากผู้เช่าทางห้องแชทนี้โดยอัตโนมัติค่ะ"
                        reply_request = ReplyMessageRequest(
                            replyToken=event.reply_token,
                            messages=[TextMessage(text=reply_text)]
                        )
                        messaging_api.reply_message(reply_request)
                    except Exception as reply_err:
                        print(f"Failed to reply admin binding confirmation: {reply_err}")
                else:
                    # Reply error
                    try:
                        from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, TextMessage
                        config = Configuration(access_token=settings.LINE_CHANNEL_ACCESS_TOKEN)
                        api_client = ApiClient(config)
                        messaging_api = MessagingApi(api_client)
                        
                        reply_text = "❌ ไม่พบรหัสเชื่อมต่อนี้ หรือรหัสหมดอายุแล้ว กรุณาตรวจสอบรหัสบนหน้าเว็บไซต์และลองใหม่อีกครั้งค่ะ"
                        reply_request = ReplyMessageRequest(
                            replyToken=event.reply_token,
                            messages=[TextMessage(text=reply_text)]
                        )
                        messaging_api.reply_message(reply_request)
                    except Exception as reply_err:
                        print(f"Failed to reply invalid binding code: {reply_err}")
                        
    return "OK"
