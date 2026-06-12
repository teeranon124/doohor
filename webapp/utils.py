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
