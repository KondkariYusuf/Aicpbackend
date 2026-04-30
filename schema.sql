-- ==========================================
-- AICP CANONICAL SCHEMA (v2)
-- ==========================================
-- This file is the reference "fresh install" schema.
-- It does NOT need to be re-run on existing databases.
-- For migrations, see: schema-migration.sql

-- ==========================================
-- 1. STRICT TYPING (ENUMS)
-- ==========================================
CREATE TYPE user_role AS ENUM ('Clerk', 'HOD', 'Principal', 'Admin');
CREATE TYPE doc_status AS ENUM ('Valid', 'Expiring Soon', 'Near Expiration', 'Expired');
CREATE TYPE approval_step AS ENUM ('Pending', 'HOD Reviewed', 'Principal Approved', 'Rejected');
CREATE TYPE renewal_status AS ENUM ('Pending HOD', 'Pending Principal', 'Approved', 'Rejected');

-- ==========================================
-- 2. TABLE DEFINITIONS
-- ==========================================

-- Institutes Table
CREATE TABLE institutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table (Extends Supabase's native auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    institute_id UUID REFERENCES institutes(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    phone TEXT,  -- Phone number (e.g. '919876543210')
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID REFERENCES institutes(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    document_name TEXT NOT NULL,
    category TEXT NOT NULL,
    responsible_person TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    file_path TEXT NOT NULL, -- The Supabase Storage file path reference
    status doc_status DEFAULT 'Valid',
    notified_3m BOOLEAN DEFAULT FALSE,
    notified_2m BOOLEAN DEFAULT FALSE,
    notified_1m BOOLEAN DEFAULT FALSE,
    notified_0d BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals Table
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback TEXT,
    step approval_step DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Renewals Table
CREATE TABLE document_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    status renewal_status DEFAULT 'Pending HOD',
    hod_feedback TEXT,
    principal_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table (In-App)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- ==========================================
-- 3. SECURITY DEFINER HELPERS (prevent RLS recursion)
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_my_institute_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institute_id FROM public.users WHERE id = auth.uid();
$$;

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
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- ── DOCUMENT RENEWALS ──
CREATE POLICY "Users can view renewals for their institute."
ON document_renewals FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_renewals.document_id
        AND documents.institute_id = public.get_my_institute_id()
    )
    OR
    public.get_my_role() = 'Admin'
);

CREATE POLICY "Clerks can insert document renewals."
ON document_renewals FOR INSERT TO authenticated WITH CHECK (
    public.get_my_role() = 'Clerk'
    AND
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_renewals.document_id
        AND documents.institute_id = public.get_my_institute_id()
    )
);

CREATE POLICY "HOD and Principals can manage renewals."
ON document_renewals FOR ALL TO authenticated USING (
    public.get_my_role() IN ('HOD', 'Principal')
);

CREATE POLICY "Admin can manage all renewals."
ON document_renewals FOR ALL TO authenticated USING (
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

-- ==========================================
-- 5. STORAGE POLICIES (Supabase Storage)
-- ==========================================

CREATE POLICY "Clerks can upload documents"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'compliance-docs'
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'Clerk'
    AND (octet_length(file) <= 10485760)
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