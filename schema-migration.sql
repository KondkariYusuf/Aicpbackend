-- ==========================================
-- AICP SCHEMA MIGRATION v2
-- Run this in the Supabase SQL Editor
-- ==========================================
-- IMPORTANT: Run this entire script at once. It drops all policies,
-- migrates ENUMs, then recreates everything.

-- ==========================================
-- 0. DROP ALL EXISTING RLS POLICIES & HELPER FUNCTIONS FIRST
--    (Must happen before ALTER COLUMN TYPE)
-- ==========================================

-- Institutes
DROP POLICY IF EXISTS "Institutes are viewable by all authenticated users." ON institutes;

-- Users
DROP POLICY IF EXISTS "Users can view members of their own institute." ON users;
DROP POLICY IF EXISTS "Users can read own profile." ON users;
DROP POLICY IF EXISTS "Users can insert own profile." ON users;

-- Documents
DROP POLICY IF EXISTS "Users can view documents for their institute." ON documents;
DROP POLICY IF EXISTS "Clerks can insert documents." ON documents;

-- Approvals
DROP POLICY IF EXISTS "Users can view approvals for their institute's documents." ON approvals;
DROP POLICY IF EXISTS "Staff and Principals can manage approvals." ON approvals;

-- Storage (these reference role directly via subquery)
DROP POLICY IF EXISTS "Clerks can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;

-- Helper functions that return the old ENUM type
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.get_my_institute_id();

-- ==========================================
-- 1. ROLE ENUM MIGRATION
-- ==========================================
-- Step 1a: Detach column from old ENUM
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN role TYPE TEXT USING role::TEXT;

-- Step 1b: Drop the old ENUM
DROP TYPE IF EXISTS user_role;

-- Step 1c: Remap old values to new values (column is TEXT now, safe)
UPDATE public.users SET role = 'HOD' WHERE role = 'Staff';
UPDATE public.users SET role = 'Admin' WHERE role = 'Institute Authority';

-- Step 1d: Create new ENUM and cast column back
CREATE TYPE user_role AS ENUM ('Clerk', 'HOD', 'Principal', 'Admin');
ALTER TABLE public.users ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- ==========================================
-- 2. APPROVAL STEP ENUM MIGRATION
-- ==========================================
ALTER TABLE public.approvals ALTER COLUMN step DROP DEFAULT;
ALTER TABLE public.approvals ALTER COLUMN step TYPE TEXT USING step::TEXT;

DROP TYPE IF EXISTS approval_step;

UPDATE public.approvals SET step = 'HOD Reviewed' WHERE step = 'Staff Reviewed';

CREATE TYPE approval_step AS ENUM ('Pending', 'HOD Reviewed', 'Principal Approved', 'Rejected');
ALTER TABLE public.approvals ALTER COLUMN step TYPE approval_step USING step::approval_step;
ALTER TABLE public.approvals ALTER COLUMN step SET DEFAULT 'Pending';

-- ==========================================
-- 3. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. RECREATE HELPER FUNCTIONS (with new ENUM type)
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_institute_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institute_id FROM public.users WHERE id = auth.uid();
$$;

-- ==========================================
-- 5. RECREATE ALL RLS POLICIES (Admin bypasses institute filter)
-- ==========================================

-- ── NOTIFICATIONS ──
CREATE POLICY "Users can view own notifications."
ON notifications FOR SELECT TO authenticated USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can update own notifications."
ON notifications FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
) WITH CHECK (
    user_id = auth.uid()
);

-- ── INSTITUTES ──
CREATE POLICY "Institutes are viewable by all authenticated users."
ON institutes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert institutes."
ON institutes FOR INSERT TO authenticated WITH CHECK (
    public.get_my_role() = 'Admin'
);

CREATE POLICY "Admin can update institutes."
ON institutes FOR UPDATE TO authenticated USING (
    public.get_my_role() = 'Admin'
) WITH CHECK (
    public.get_my_role() = 'Admin'
);

-- ── USERS ──
CREATE POLICY "Users can read own profile."
ON users FOR SELECT TO authenticated USING (
    id = auth.uid()
);

CREATE POLICY "Users can view members of their own institute."
ON users FOR SELECT TO authenticated USING (
    institute_id = public.get_my_institute_id()
    OR
    public.get_my_role() = 'Admin'
);

CREATE POLICY "Users can insert own profile."
ON users FOR INSERT TO authenticated WITH CHECK (
    id = auth.uid()
);

-- ── DOCUMENTS ──
CREATE POLICY "Users can view documents for their institute."
ON documents FOR SELECT TO authenticated USING (
    institute_id = public.get_my_institute_id()
    OR
    public.get_my_role() = 'Admin'
);

CREATE POLICY "Clerks can insert documents."
ON documents FOR INSERT TO authenticated WITH CHECK (
    public.get_my_role() = 'Clerk'
    AND
    institute_id = public.get_my_institute_id()
);

CREATE POLICY "Admin can insert documents."
ON documents FOR INSERT TO authenticated WITH CHECK (
    public.get_my_role() = 'Admin'
);

CREATE POLICY "Admin can update documents."
ON documents FOR UPDATE TO authenticated USING (
    public.get_my_role() = 'Admin'
) WITH CHECK (
    public.get_my_role() = 'Admin'
);

-- ── APPROVALS ──
CREATE POLICY "Users can view approvals for their institute's documents."
ON approvals FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = approvals.document_id
        AND documents.institute_id = public.get_my_institute_id()
    )
    OR
    public.get_my_role() = 'Admin'
);

CREATE POLICY "HOD and Principals can manage approvals."
ON approvals FOR ALL TO authenticated USING (
    public.get_my_role() IN ('HOD', 'Principal')
);

CREATE POLICY "Admin can manage all approvals."
ON approvals FOR ALL TO authenticated USING (
    public.get_my_role() = 'Admin'
);

-- ── STORAGE ──
CREATE POLICY "Clerks can upload documents"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'compliance-docs'
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'Clerk'
);

CREATE POLICY "Admin can upload documents"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'compliance-docs'
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);

CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT TO authenticated USING (
    bucket_id = 'compliance-docs'
);
