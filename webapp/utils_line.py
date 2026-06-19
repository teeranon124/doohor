import os
from linebot.v3.messaging import (
    Configuration,
    ApiClient,
    MessagingApi,
    PushMessageRequest,
    ReplyMessageRequest,
    FlexMessage,
    FlexContainer,
    TextMessage
)
from webapp.config import settings

def get_line_messaging_api() -> MessagingApi | None:
    if not settings.LINE_CHANNEL_ACCESS_TOKEN:
        print("LINE_CHANNEL_ACCESS_TOKEN is not configured.")
        return None
    config = Configuration(access_token=settings.LINE_CHANNEL_ACCESS_TOKEN)
    api_client = ApiClient(config)
    return MessagingApi(api_client)

def send_order_notification_to_admin(
    order_id: str, 
    dorm_name: str, 
    room_number: str, 
    amount: float, 
    slip_url: str | None = None,
    admin_line_id: str | None = None
) -> bool:
    api = get_line_messaging_api()
    target_admin_id = admin_line_id or settings.LINE_ADMIN_USER_ID
    if not api or not target_admin_id:
        print("LINE Bot API not fully configured (missing Access Token or Admin User ID).")
        return False
        
    # ALT Alt text of the Flex message
    alt_text = f"มีสลิปใหม่รอตรวจสอบ ห้อง {room_number} ยอด ฿{amount:,.2f}"

    flex_contents = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#17a2b8",
            "contents": [
                {
                    "type": "text",
                    "text": "แจ้งชำระเงินใหม่ (รอตรวจสอบ)",
                    "weight": "bold",
                    "color": "#ffffff",
                    "size": "md"
                }
            ]
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": f"หอพัก: {dorm_name}",
                    "size": "sm",
                    "margin": "xs",
                    "weight": "bold"
                },
                {
                    "type": "text",
                    "text": f"ห้อง: {room_number}",
                    "size": "sm",
                    "margin": "xs"
                },
                {
                    "type": "text",
                    "text": f"ยอดเงิน: ฿{amount:,.2f}",
                    "weight": "bold",
                    "size": "lg",
                    "margin": "md",
                    "color": "#28a745"
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#28a745",
                    "action": {
                        "type": "postback",
                        "label": "อนุมัติ",
                        "data": f"action=approve&order_id={order_id}",
                        "displayText": "ส่งอนุมัติรายการ"
                    }
                },
                {
                    "type": "button",
                    "style": "secondary",
                    "color": "#dc3545",
                    "action": {
                        "type": "postback",
                        "label": "ปฏิเสธ",
                        "data": f"action=reject&order_id={order_id}",
                        "displayText": "ส่งปฏิเสธรายการ"
                    }
                }
            ]
        }
    }
    
    # Embed slip image if URL is valid
    if slip_url:
        flex_contents["body"]["contents"].append({
            "type": "image",
            "url": slip_url,
            "size": "full",
            "aspectRatio": "3:4",
            "aspectMode": "cover",
            "margin": "md"
        })

    try:
        container = FlexContainer.from_dict(flex_contents)
        message = FlexMessage(altText=alt_text, contents=container)
        request = PushMessageRequest(
            to=target_admin_id,
            messages=[message]
        )
        api.push_message(request)
        print(f"Successfully pushed order notification for {order_id} to Admin.")
        return True
    except Exception as e:
        print(f"Error pushing LINE notification: {e}")
        return False

def send_status_update_to_tenant(
    tenant_line_id: str | None, 
    order_id: str, 
    status: str, 
    note: str | None = None
) -> bool:
    api = get_line_messaging_api()
    if not api or not tenant_line_id:
        print("Tenant LINE notification skipped (missing API configuration or user line_user_id).")
        return False
        
    status_thai = "อนุมัติเรียบร้อยแล้ว" if status == "approved" else "ถูกปฏิเสธ"
    msg_text = f"📢 แจ้งเตือนสถานะการชำระเงิน\nรายการ #{order_id[-8:]}\nสถานะ: {status_thai}"
    if status == "rejected" and note:
        msg_text += f"\nเหตุผล: {note}"
        
    try:
        message = TextMessage(text=msg_text)
        request = PushMessageRequest(
            to=tenant_line_id,
            messages=[message]
        )
        api.push_message(request)
        print(f"Successfully pushed status update for {order_id} to Tenant.")
        return True
    except Exception as e:
        print(f"Error sending LINE update to tenant: {e}")
        return False

def send_bill_notification_to_tenant(
    tenant_line_id: str | None,
    room_number: str,
    month: str,
    year: int,
    total: float,
    due_date: str
) -> bool:
    api = get_line_messaging_api()
    liff_id = settings.NEXT_PUBLIC_LIFF_ID
    if not api or not tenant_line_id:
        print("Tenant LINE notification skipped (missing API configuration or tenant_line_id).")
        return False
        
    liff_url = f"https://liff.line.me/{liff_id}" if liff_id else ""
    msg_text = (
        f"📢 แจ้งยอดค่าเช่าหอพักประจำเดือน {month} {year}\n\n"
        f"ห้องพัก: {room_number}\n"
        f"ยอดที่ต้องชำระ: ฿{total:,.2f}\n"
        f"กำหนดชำระภายใน: {due_date}"
    )
    if liff_url:
        msg_text += f"\n\nดูบิลและแจ้งชำระเงินได้ที่นี่: {liff_url}"
        
    try:
        message = TextMessage(text=msg_text)
        request = PushMessageRequest(
            to=tenant_line_id,
            messages=[message]
        )
        api.push_message(request)
        print(f"Successfully pushed bill notification to tenant {tenant_line_id}.")
        return True
    except Exception as e:
        print(f"Error sending bill notification to tenant: {e}")
        return False

