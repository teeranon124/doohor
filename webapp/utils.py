from datetime import datetime

# Helper to convert Frontend Thai Buddhist Era Date (DD/MM/YYYY) to DB Date (YYYY-MM-DD)
def date_fe_to_db(fe_date: str | None) -> str | None:
    if not fe_date:
        return None
    try:
        parts = fe_date.split('/')
        if len(parts) == 3:
            d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
            gregorian_year = y - 543
            return f"{gregorian_year:04d}-{m:02d}-{d:02d}"
    except Exception:
        pass
    return None

# Helper to convert DB Date (YYYY-MM-DD) to Frontend Thai Buddhist Era Date (DD/MM/YYYY)
def date_db_to_fe(db_date: str | None) -> str | None:
    if not db_date:
        return None
    try:
        # DB date might be a string from API response
        if isinstance(db_date, str):
            # Split either YYYY-MM-DD or date-time string
            date_part = db_date.split('T')[0]
            parts = date_part.split('-')
            if len(parts) == 3:
                y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
                be_year = y + 543
                return f"{d:02d}/{m:02d}/{be_year}"
    except Exception:
        pass
    return db_date

def get_thai_month_name(month_int: int) -> str:
    months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
    if 1 <= month_int <= 12:
        return months[month_int - 1]
    return ''

def get_month_int_from_thai(month_name: str) -> int:
    months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
    try:
        return months.index(month_name) + 1
    except ValueError:
        return 1

def auto_approve_bill_for_order(order: dict) -> None:
    """
    Locates the corresponding unpaid or pending bill for the given order
    and automatically marks it as paid.
    """
    from webapp.db import supabase_admin
    
    room_id = order.get("room_id")
    lease_id = order.get("lease_id")
    slip_url = order.get("slip_url")
    
    if not room_id and not lease_id:
        return
        
    # Find the latest unpaid or pending bill
    bill_query = supabase_admin.table("bills").select("id").in_("status", ["unpaid", "pending_approval"])
    if lease_id:
        bill_query = bill_query.eq("lease_id", lease_id)
    else:
        bill_query = bill_query.eq("room_id", room_id)
        
    bill_res = bill_query.order("billing_year", desc=True).order("billing_month", desc=True).execute()
    if bill_res.data:
        bill_id = bill_res.data[0]["id"]
        today_gregorian = datetime.now().date().isoformat()
        try:
            supabase_admin.table("bills").update({
                "status": "paid",
                "paid_date": today_gregorian,
                "slip_image_url": slip_url
            }).eq("id", bill_id).execute()
            print(f"Successfully auto-approved bill {bill_id} for order {order.get('id')}")
        except Exception as e:
            print(f"Failed to auto-approve bill {bill_id} for order {order.get('id')}: {e}")
