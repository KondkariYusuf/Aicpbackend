-- ==========================================
-- FIX: Infinite recursion in RLS policies
-- ==========================================
-- The users table RLS policy references itself, causing infinite recursion.
-- Fix: Create SECURITY DEFINER helper functions that bypass RLS.

-- Helper: Get current user's institute_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_institute_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institute_id FROM public.users WHERE id = auth.uid();
$$;

-- Helper: Get current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ==========================================
-- DROP old recursive policies
-- ==========================================
DROP POLICY IF EXISTS "Users can view members of their own institute." ON users;
DROP POLICY IF EXISTS "Users can view documents for their institute." ON documents;
DROP POLICY IF EXISTS "Users can view approvals for their institute's documents." ON approvals;

-- ==========================================
-- RECREATE policies using the helper functions
-- ==========================================

-- Users: can see members of their own institute (or all if Authority)
CREATE POLICY "Users can view members of their own institute."
ON users FOR SELECT TO authenticated USING (
    institute_id = public.get_my_institute_id()
    OR
    public.get_my_role() = 'Institute Authority'
);

-- Users: can read their own row (needed for AuthContext profile fetch)
CREATE POLICY "Users can read own profile."
ON users FOR SELECT TO authenticated USING (
    id = auth.uid()
);

-- Users: can insert their own profile row during registration
CREATE POLICY "Users can insert own profile."
ON users FOR INSERT TO authenticated WITH CHECK (
    id = auth.uid()
);

-- Documents: users can view documents for their institute
CREATE POLICY "Users can view documents for their institute."
ON documents FOR SELECT TO authenticated USING (
    institute_id = public.get_my_institute_id()
    OR
    public.get_my_role() = 'Institute Authority'
);

-- Approvals: users can view approvals for their institute's documents
CREATE POLICY "Users can view approvals for their institute's documents."
ON approvals FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = approvals.document_id
        AND documents.institute_id = public.get_my_institute_id()
    )
);
