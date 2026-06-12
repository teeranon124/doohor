from supabase import create_client, Client
from webapp.config import settings

# Regular anon client (obeys RLS)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Admin service role client (bypasses RLS, useful for system operations)
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
