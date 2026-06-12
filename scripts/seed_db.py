import os
from dotenv import load_dotenv

load_dotenv()

from webapp.db import supabase_admin
from webapp.utils import date_fe_to_db

def seed():
    try:
        print("Starting database seed...")
        
        # 1. Check or Create default dorm
        d_check = supabase_admin.table("dorms").select("*").execute()
        if d_check.data:
            print("Dorm already exists, using existing dorm for seeding...")
            dorm = d_check.data[0]
        else:
            dorm_data = {
                "name": "Dormy Residence",
                "address": "สาขาหลัก",
                "promptpay": "081-XXX-XXXX",
                "water_rate": 18,
                "electric_rate": 8,
                "due_day_of_month": 5
            }
            res = supabase_admin.table("dorms").insert(dorm_data).execute()
            dorm = res.data[0]
            print(f"Created default Dorm: {dorm['name']} ({dorm['id']})")

        dorm_id = dorm["id"]

        # 2. Ensure room types exist
        rt_check = supabase_admin.table("room_types").select("*").eq("dorm_id", dorm_id).execute()
        room_types = rt_check.data or []

        standard_type = next((t for t in room_types if t["name"] == "Standard"), None)
        if not standard_type:
            res = supabase_admin.table("room_types").insert({
                "dorm_id": dorm_id, "name": "Standard", "base_rent": 4500, "base_deposit": 9000
            }).execute()
            standard_type = res.data[0]
            print("Inserted missing Standard room type.")

        vip_type = next((t for t in room_types if t["name"] == "VIP"), None)
        if not vip_type:
            res = supabase_admin.table("room_types").insert({
                "dorm_id": dorm_id, "name": "VIP", "base_rent": 6500, "base_deposit": 13000
            }).execute()
            vip_type = res.data[0]
            print("Inserted missing VIP room type.")

        # 3. Insert rooms
        rooms_to_insert = [
            {"room_number": "101", "type_id": standard_type["id"], "rent_price": 4500, "status": "occupied", "tenant_name": "คุณสมชาย ใจดี", "move_in_date": "2024-01-01", "contract_start": "2024-01-01", "contract_end": "2024-12-31", "deposit_amount": 9000, "deposit_status": "held", "last_water_meter": 1250, "last_electric_meter": 4200},
            {"room_number": "102", "type_id": standard_type["id"], "rent_price": 4500, "status": "vacant", "tenant_name": None, "move_in_date": None, "contract_start": None, "contract_end": None, "deposit_amount": 0, "deposit_status": "none", "last_water_meter": 1000, "last_electric_meter": 3000},
            {"room_number": "103", "type_id": vip_type["id"], "rent_price": 6500, "status": "occupied", "tenant_name": "คุณประเสริฐ", "move_in_date": "2024-03-01", "contract_start": "2024-03-01", "contract_end": "2025-02-28", "deposit_amount": 13000, "deposit_status": "held", "last_water_meter": 500, "last_electric_meter": 1200},
            {"room_number": "201", "type_id": vip_type["id"], "rent_price": 6500, "status": "occupied", "tenant_name": "คุณสมหญิง รักดี", "move_in_date": "2024-06-01", "contract_start": "2024-06-01", "contract_end": "2025-05-31", "deposit_amount": 13000, "deposit_status": "held", "last_water_meter": 840, "last_electric_meter": 2150},
            {"room_number": "202", "type_id": standard_type["id"], "rent_price": 4800, "status": "vacant", "tenant_name": None, "move_in_date": None, "contract_start": None, "contract_end": None, "deposit_amount": 0, "deposit_status": "none", "last_water_meter": 0, "last_electric_meter": 0},
            {"room_number": "301", "type_id": standard_type["id"], "rent_price": 4500, "status": "occupied", "tenant_name": "คุณมานะ", "move_in_date": "2025-01-01", "contract_start": "2025-01-01", "contract_end": "2025-12-31", "deposit_amount": 9000, "deposit_status": "held", "last_water_meter": 300, "last_electric_meter": 800},
            {"room_number": "302", "type_id": standard_type["id"], "rent_price": 4500, "status": "vacant", "tenant_name": None, "move_in_date": None, "contract_start": None, "contract_end": None, "deposit_amount": 0, "deposit_status": "none", "last_water_meter": 0, "last_electric_meter": 0},
        ]

        inserted_rooms = []
        for r_data in rooms_to_insert:
            r_data["dorm_id"] = dorm_id
            # Upsert room
            res = supabase_admin.table("rooms").upsert(r_data, on_conflict="dorm_id, room_number").execute()
            if res.data:
                inserted_rooms.append(res.data[0])
        print(f"Upserted {len(inserted_rooms)} rooms.")

        # 4. Insert default bills
        room_101 = next(r for r in inserted_rooms if r["room_number"] == "101")
        room_201 = next(r for r in inserted_rooms if r["room_number"] == "201")

        bills_data = [
            {
                "room_id": room_101["id"],
                "dorm_id": dorm_id,
                "billing_month": 4, # เมษายน
                "billing_year": 2568,
                "issue_date": "2025-04-25",
                "due_date": "2025-05-05",
                "rent": 4500,
                "water_start": 1240,
                "water_end": 1250,
                "electric_start": 4100,
                "electric_end": 4200,
                "extra_charges": [],
                "total": 4500 + (10 * 18) + (100 * 8),
                "status": "paid",
                "paid_date": "2025-05-01",
                "pay_note": ""
            },
            {
                "room_id": room_201["id"],
                "dorm_id": dorm_id,
                "billing_month": 5, # พฤษภาคม
                "billing_year": 2568,
                "issue_date": "2025-05-25",
                "due_date": "2025-06-05",
                "rent": 6500,
                "water_start": 830,
                "water_end": 840,
                "electric_start": 2000,
                "electric_end": 2150,
                "extra_charges": [{"desc": "ค่าส่วนกลาง", "amt": 200}],
                "total": 6500 + (10 * 18) + (150 * 8) + 200,
                "status": "unpaid",
                "paid_date": None,
                "pay_note": ""
            }
        ]

        for b_data in bills_data:
            supabase_admin.table("bills").upsert(b_data, on_conflict="room_id, billing_month, billing_year").execute()
        print("Upserted default bills.")
        print("Database seeding completed successfully!")
    except Exception as e:
        print("Error seeding database:", e)
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    seed()
