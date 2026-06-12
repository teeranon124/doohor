-- ==========================================
-- Doohor Production Database Schema (V2)
-- Run this script in the Supabase SQL Editor
-- WARNING: This will drop existing tables. Do not run on production with data!
-- ==========================================

-- Drop existing tables to recreate (Clean slate)
DROP TABLE IF EXISTS public.deposit_history CASCADE;
DROP TABLE IF EXISTS public.repairs CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.room_types CASCADE;
DROP TABLE IF EXISTS public.dorms CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES
-- ==========================================

-- Users Table
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('admin', 'tenant')),
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Dorms Table
CREATE TABLE public.dorms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    promptpay TEXT,
    due_day_of_month INTEGER DEFAULT 5,
    water_rate NUMERIC DEFAULT 18.0,
    electric_rate NUMERIC DEFAULT 8.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Room Types Table
CREATE TABLE public.room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dorm_id UUID REFERENCES public.dorms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_rent NUMERIC NOT NULL DEFAULT 0,
    base_deposit NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Rooms Table
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dorm_id UUID REFERENCES public.dorms(id) ON DELETE CASCADE,
    type_id UUID REFERENCES public.room_types(id) ON DELETE SET NULL,
    room_number TEXT NOT NULL,
    rent_price NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    tenant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tenant_name TEXT, -- Fallback
    move_in_date DATE,
    contract_start DATE,
    contract_end DATE,
    deposit_amount NUMERIC DEFAULT 0,
    deposit_status TEXT DEFAULT 'none' CHECK (deposit_status IN ('none', 'held', 'returned', 'forfeited')),
    deposit_note TEXT,
    last_water_meter NUMERIC DEFAULT 0,
    last_electric_meter NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(dorm_id, room_number)
);

-- Bills Table
CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    dorm_id UUID REFERENCES public.dorms(id) ON DELETE CASCADE,
    billing_month INTEGER NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
    billing_year INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    rent NUMERIC DEFAULT 0,
    water_start NUMERIC DEFAULT 0,
    water_end NUMERIC DEFAULT 0,
    electric_start NUMERIC DEFAULT 0,
    electric_end NUMERIC DEFAULT 0,
    extra_charges JSONB DEFAULT '[]'::jsonb, -- Array of {"desc": string, "amt": number}
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'pending_approval', 'paid')),
    paid_date DATE,
    pay_note TEXT,
    slip_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(room_id, billing_month, billing_year)
);

-- Repairs Table
CREATE TABLE public.repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    dorm_id UUID REFERENCES public.dorms(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    issue TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Deposit History Table
CREATE TABLE public.deposit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('received', 'partial', 'returned')),
    amount NUMERIC NOT NULL,
    refund NUMERIC DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 2. INDEXES (Crucial for preventing O(N^2) loops)
-- ==========================================
CREATE INDEX idx_dorms_owner_id ON public.dorms(owner_id);
CREATE INDEX idx_room_types_dorm_id ON public.room_types(dorm_id);
CREATE INDEX idx_rooms_dorm_id ON public.rooms(dorm_id);
CREATE INDEX idx_rooms_tenant_id ON public.rooms(tenant_id);
CREATE INDEX idx_bills_room_id ON public.bills(room_id);
CREATE INDEX idx_bills_dorm_id ON public.bills(dorm_id);
CREATE INDEX idx_repairs_room_id ON public.repairs(room_id);
CREATE INDEX idx_repairs_dorm_id ON public.repairs(dorm_id);
CREATE INDEX idx_deposit_history_room_id ON public.deposit_history(room_id);

-- ==========================================
-- 3. TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', COALESCE(new.raw_user_meta_data->>'role', 'tenant'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to prevent errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dorms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_history ENABLE ROW LEVEL SECURITY;

-- Users Table Policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Dorms Table Policies
-- Admins can do everything to their own dorms
CREATE POLICY "Admins manage own dorms" ON public.dorms FOR ALL USING (auth.uid() = owner_id);

-- Room Types Policies
CREATE POLICY "Admins manage own room types" ON public.room_types FOR ALL USING (
    EXISTS (SELECT 1 FROM public.dorms d WHERE d.id = room_types.dorm_id AND d.owner_id = auth.uid())
);

-- Rooms Policies
-- Admins see/edit rooms in their dorms
CREATE POLICY "Admins manage own rooms" ON public.rooms FOR ALL USING (
    EXISTS (SELECT 1 FROM public.dorms d WHERE d.id = rooms.dorm_id AND d.owner_id = auth.uid())
);
-- Tenants can only see their own room
CREATE POLICY "Tenants view own room" ON public.rooms FOR SELECT USING (auth.uid() = tenant_id);

-- Bills Policies
-- Admins manage bills in their dorms
CREATE POLICY "Admins manage own dorm bills" ON public.bills FOR ALL USING (
    EXISTS (SELECT 1 FROM public.dorms d WHERE d.id = bills.dorm_id AND d.owner_id = auth.uid())
);
-- Tenants can view their own bills, and update 'slip_image_url' and 'status' to 'pending_approval'
CREATE POLICY "Tenants view own bills" ON public.bills FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = bills.room_id AND r.tenant_id = auth.uid())
);
CREATE POLICY "Tenants can submit payment" ON public.bills FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = bills.room_id AND r.tenant_id = auth.uid())
) WITH CHECK (
    status IN ('unpaid', 'pending_approval') -- Prevent modifying already paid bills
);

-- Repairs Policies
-- Admins manage repairs in their dorms
CREATE POLICY "Admins manage own dorm repairs" ON public.repairs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.dorms d WHERE d.id = repairs.dorm_id AND d.owner_id = auth.uid())
);
-- Tenants can insert and view their own repairs
CREATE POLICY "Tenants view own repairs" ON public.repairs FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Tenants can create repairs" ON public.repairs FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- Deposit History Policies
-- Admins manage deposit history
CREATE POLICY "Admins manage deposit history" ON public.deposit_history FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rooms r JOIN public.dorms d ON r.dorm_id = d.id WHERE r.id = deposit_history.room_id AND d.owner_id = auth.uid())
);
-- Tenants can view their own deposit history
CREATE POLICY "Tenants view own deposit history" ON public.deposit_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = deposit_history.room_id AND r.tenant_id = auth.uid())
);
