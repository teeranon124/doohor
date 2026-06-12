import sys
import logging
import os
from dotenv import load_dotenv

# Add the root project directory to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from supabase import create_client, Client

logging.basicConfig(level=logging.DEBUG)

def main():
    try:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_ANON_KEY")
        print(f"Connecting to {url}")
        supabase: Client = create_client(url, key)
        print("Signing up user...")
        res = supabase.auth.sign_up({
            "email": "testadmin@gmail.com",
            "password": "password123",
            "options": {
                "data": {
                    "name": "Test Admin",
                    "role": "admin"
                }
            }
        })
        print(f"Success! Response: {res}")
    except Exception:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
