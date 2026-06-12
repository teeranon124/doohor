# Implementation Plan: Doohor Production System

## 1. Objective
Transition the validated `doohor.html` prototype into a production-ready full-stack application using Next.js, FastAPI, and Supabase.

## 2. Architecture & Tech Stack
*   **Frontend:** Next.js (App Router, React, Tailwind CSS)
*   **Backend:** FastAPI (Python)
*   **Database:** Supabase (PostgreSQL)
*   **Storage:** Supabase Storage (for payment slip images)
*   **Deployment:** Vercel (Frontend & Backend serverless) fronted by Cloudflare (DNS/CDN)

## 3. Database Schema Design (Supabase PostgreSQL)
We need to design relational tables based on the JSON structure in `doohor.html`.

*   **Users Table:** Admin and Tenant accounts.
*   **Dorms Table:** `id`, `owner_id` (User), `name`, `address`, `promptpay`, `due_day`, `water_rate`, `electric_rate`.
*   **RoomTypes Table:** `id`, `dorm_id`, `name`, `base_rent`, `base_deposit`.
*   **Rooms Table:** `id`, `dorm_id`, `type_id`, `room_number`, `rent_price`, `status`, `tenant_id` (User), `contract_start`, `contract_end`, `deposit_amount`, `deposit_status`, `last_water_meter`, `last_electric_meter`.
*   **Bills Table:** `id`, `room_id`, `month`, `year`, `issue_date`, `due_date`, `rent`, `water_start`, `water_end`, `electric_start`, `electric_end`, `other_fees`, `other_desc`, `total`, `status`, `paid_date`, `pay_note`, `slip_image_url`.
*   **Repairs Table:** `id`, `room_id`, `issue`, `status`, `created_at`, `resolved_at`.
*   **DepositHistory Table:** `id`, `room_id`, `type` (received, partial, returned), `amount`, `note`, `created_at`.

## 4. Implementation Phases

### Phase 1: Supabase Setup & Backend Refactoring (FastAPI)
1.  Set up a Supabase project and define the SQL schema.
2.  Configure Supabase Storage buckets for `slips`.
3.  **Refactor FastAPI (`webapp/`):**
    *   Remove MongoDB (Motor/Beanie) dependencies.
    *   Integrate `supabase-py` (or `SQLModel`/`SQLAlchemy` with `psycopg2` pointing to Supabase Postgres).
    *   Re-implement authentication using **Supabase Auth**.
    *   Build REST API endpoints for Dorms, Rooms, Bills, Repairs, and Settings.
    *   Implement file upload endpoints connecting to Supabase Storage.

### Phase 2: Frontend Development (Next.js)
1.  Initialize a new Next.js project.
2.  Set up Tailwind CSS to match the existing design system.
3.  Create shared UI components (Cards, Modals, Buttons, Inputs).
4.  **Admin Dashboard Migration:**
    *   Overview, Rooms Grid, Meter Reading (Bulk update), Billing, Repairs, Settings.
5.  **Tenant Dashboard Migration:**
    *   PIN Login / Auth.
    *   My Bills (with Slip Upload), Contract Info, Repair Requests.
6.  Connect frontend to FastAPI endpoints.

### Phase 3: Deployment & Integration
1.  Deploy Next.js frontend to Vercel.
2.  Deploy FastAPI backend (either as Vercel Serverless Functions via `vercel.json` or a dedicated platform like Render/Fly.io if long-running processes are needed, though Vercel is requested).
3.  Configure Cloudflare DNS and caching rules.
4.  End-to-end testing.

## 5. Next Steps for User Approval
1.  Review and approve the proposed Database Schema.
2.  Confirm preference for authentication (Supabase Auth vs Custom JWT).
3.  Begin Phase 1 (Database & Backend API creation).
