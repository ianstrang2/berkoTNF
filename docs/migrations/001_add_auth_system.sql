-- =====================================================
-- BerkoTNF Authentication System Migration
-- Version: 1.0.0
-- Created: 2025-10-01
-- Description: Adds Supabase Auth integration for admin and player authentication
-- =====================================================

-- IMPORTANT: Review this entire file before running
-- Test on staging environment first
-- Backup production database before applying

BEGIN;

-- =====================================================
-- 1. ADMIN PROFILES TABLE
-- =====================================================
-- Extends Supabase auth.users with admin-specific data
-- One-to-one relationship with auth.users

CREATE TABLE admin_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'superadmin')),
    
    -- Profile information
    display_name TEXT NOT NULL,
    
    -- Optional link to player profile (enables role switching on mobile)
    player_id INT REFERENCES players(player_id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_login_at TIMESTAMPTZ,
    
    -- Role-specific constraints
    CONSTRAINT superadmin_no_tenant CHECK (
        (user_role = 'superadmin' AND tenant_id IS NULL) OR 
        (user_role = 'admin' AND tenant_id IS NOT NULL)
    )
    
    -- Note: Validation that player_id belongs to same tenant is enforced in API routes
    -- (CHECK constraints cannot contain subqueries in PostgreSQL)
);

-- Indexes for admin_profiles
CREATE INDEX idx_admin_profiles_tenant_role ON admin_profiles(tenant_id, user_role) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_admin_profiles_player_id ON admin_profiles(player_id) WHERE player_id IS NOT NULL;
CREATE UNIQUE INDEX idx_admin_profiles_unique_player ON admin_profiles(tenant_id, player_id) WHERE player_id IS NOT NULL;

-- Updated_at trigger for admin_profiles
CREATE TRIGGER update_admin_profiles_updated_at
    BEFORE UPDATE ON admin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE admin_profiles IS 'Admin user profiles linked to Supabase Auth users';
COMMENT ON COLUMN admin_profiles.user_id IS 'Foreign key to auth.users.id';
COMMENT ON COLUMN admin_profiles.tenant_id IS 'NULL for superadmin, UUID for tenant admin';
COMMENT ON COLUMN admin_profiles.player_id IS 'Optional link to player profile for role switching';

-- =====================================================
-- 2. PLAYERS TABLE UPDATE
-- =====================================================
-- Add auth user link and phone number to existing players table

ALTER TABLE players
    ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN phone TEXT;

-- Index for quick lookup when player logs in
CREATE UNIQUE INDEX idx_players_auth_user ON players(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Index for phone-based lookup during profile claiming (E.164 format)
CREATE INDEX idx_players_phone ON players(tenant_id, phone) WHERE phone IS NOT NULL;

COMMENT ON COLUMN players.auth_user_id IS 'Link to Supabase Auth user (for player mobile login)';
COMMENT ON COLUMN players.phone IS 'Player phone number in E.164 format (e.g., +447123456789) for authentication';

-- =====================================================
-- 3. ADMIN INVITATIONS TABLE
-- =====================================================
-- Manage admin user invitations with bcrypt hashed tokens

CREATE TABLE admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    invited_role TEXT NOT NULL CHECK (invited_role IN ('admin', 'superadmin')),
    
    -- Optional: link invitation to existing player
    player_id INT REFERENCES players(player_id) ON DELETE SET NULL,
    
    -- Hashed invitation token (NEVER store raw tokens)
    invitation_token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Only one pending invitation per email per tenant
    CONSTRAINT unique_pending_invitation UNIQUE(tenant_id, email, status) DEFERRABLE
);

-- Indexes for admin_invitations
CREATE INDEX idx_admin_invitations_token_hash ON admin_invitations(invitation_token_hash);
CREATE INDEX idx_admin_invitations_tenant_status ON admin_invitations(tenant_id, status);
CREATE INDEX idx_admin_invitations_email ON admin_invitations(email) WHERE status = 'pending';
CREATE INDEX idx_admin_invitations_expires ON admin_invitations(expires_at) WHERE status = 'pending';

COMMENT ON TABLE admin_invitations IS 'Admin user invitation tokens (bcrypt hashed)';
COMMENT ON COLUMN admin_invitations.invitation_token_hash IS 'bcrypt hash of invitation token - NEVER store raw';
COMMENT ON COLUMN admin_invitations.player_id IS 'Optional link to player for role switching capability';

-- =====================================================
-- 4. AUTH ACTIVITY LOG
-- =====================================================
-- Track authentication events for security monitoring

CREATE TABLE auth_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    
    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'password_reset', 'email_change', 
        'phone_verification', 'profile_claimed', 'role_switched',
        '2fa_enabled', '2fa_disabled', 'invitation_sent', 'tenant_switched'
    )),
    
    -- Context (anonymized for privacy)
    ip_address_hash TEXT,
    user_agent_hash TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    
    -- Simplified metadata (no PII)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for auth_activity_log
CREATE INDEX idx_auth_activity_user ON auth_activity_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_auth_activity_tenant ON auth_activity_log(tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_auth_activity_type_success ON auth_activity_log(activity_type, success, created_at DESC);
CREATE INDEX idx_auth_activity_created ON auth_activity_log(created_at DESC);

COMMENT ON TABLE auth_activity_log IS 'Authentication and security event log';
COMMENT ON COLUMN auth_activity_log.ip_address_hash IS 'SHA256 hash of IP address for privacy';
COMMENT ON COLUMN auth_activity_log.user_agent_hash IS 'SHA256 hash of user agent for privacy';

-- =====================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin Profiles Policies
-- Admins can view their own profile
CREATE POLICY admin_profiles_own_access ON admin_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can update their own profile
CREATE POLICY admin_profiles_own_update ON admin_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Superadmins can view all admin profiles
CREATE POLICY admin_profiles_superadmin_access ON admin_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() 
            AND ap.user_role = 'superadmin'
        )
    );

-- Admin Invitations Policies
-- Admins can view invitations for their tenant
CREATE POLICY admin_invitations_tenant_access ON admin_invitations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() 
            AND (ap.tenant_id = admin_invitations.tenant_id OR ap.user_role = 'superadmin')
        )
    );

-- Admins can create invitations for their tenant
CREATE POLICY admin_invitations_tenant_insert ON admin_invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() 
            AND (ap.tenant_id = admin_invitations.tenant_id OR ap.user_role = 'superadmin')
        )
    );

-- Admins can update invitations for their tenant (status changes)
CREATE POLICY admin_invitations_tenant_update ON admin_invitations
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() 
            AND (ap.tenant_id = admin_invitations.tenant_id OR ap.user_role = 'superadmin')
        )
    );

-- Auth Activity Log Policies
-- Users can view their own activity log
CREATE POLICY auth_activity_own_access ON auth_activity_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can view activity logs for their tenant
CREATE POLICY auth_activity_admin_access ON auth_activity_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() 
            AND (ap.tenant_id = auth_activity_log.tenant_id OR ap.user_role = 'superadmin')
        )
    );

-- System can insert activity logs (service role)
-- Note: INSERT is typically done via service role, but we allow authenticated for logging
CREATE POLICY auth_activity_insert ON auth_activity_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- =====================================================
-- 6. UPDATE EXISTING PLAYER RLS POLICIES
-- =====================================================

-- Drop existing player policies (we'll recreate with auth support)
DROP POLICY IF EXISTS players_tenant_access ON players;
DROP POLICY IF EXISTS players_admin_modify ON players;

-- Players table: admins can manage, players can view own profile
CREATE POLICY players_admin_access ON players
    FOR ALL TO authenticated
    USING (
        -- Admin access: can view/edit all players in their tenant
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() 
            AND (ap.tenant_id = players.tenant_id OR ap.user_role = 'superadmin')
        )
        OR
        -- Player access: can view own profile only
        auth_user_id = auth.uid()
    );

-- Players can update their own profile
CREATE POLICY players_own_update ON players
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- =====================================================
-- 7. HELPER FUNCTION
-- =====================================================

-- Function to check if current user is admin for a tenant
CREATE OR REPLACE FUNCTION is_admin_for_tenant(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_profiles
        WHERE user_id = auth.uid()
        AND (tenant_id = target_tenant_id OR user_role = 'superadmin')
    );
END;
$$;

COMMENT ON FUNCTION is_admin_for_tenant IS 'Check if current user is admin for specified tenant';

-- =====================================================
-- 8. VALIDATION CHECKS
-- =====================================================

-- Verify tables were created
DO $$
DECLARE
    missing_tables TEXT[];
BEGIN
    SELECT ARRAY_AGG(table_name)
    INTO missing_tables
    FROM (
        VALUES ('admin_profiles'), ('admin_invitations'), ('auth_activity_log')
    ) AS expected(table_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = expected.table_name
    );
    
    IF missing_tables IS NOT NULL THEN
        RAISE EXCEPTION 'Migration failed: missing tables %', missing_tables;
    END IF;
    
    RAISE NOTICE 'All tables created successfully';
END;
$$;

-- Verify indexes were created
DO $$
DECLARE
    index_count INT;
BEGIN
    SELECT COUNT(*)
    INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_admin_%'
    OR indexname LIKE 'idx_auth_activity_%'
    OR indexname LIKE 'idx_players_auth%'
    OR indexname LIKE 'idx_players_phone%';
    
    IF index_count < 10 THEN
        RAISE WARNING 'Expected at least 10 auth-related indexes, found %', index_count;
    ELSE
        RAISE NOTICE 'Created % auth-related indexes', index_count;
    END IF;
END;
$$;

-- Verify RLS is enabled
DO $$
DECLARE
    tables_without_rls TEXT[];
BEGIN
    SELECT ARRAY_AGG(tablename)
    INTO tables_without_rls
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('admin_profiles', 'admin_invitations', 'auth_activity_log')
    AND NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE pg_class.oid = (schemaname || '.' || tablename)::regclass
        AND relrowsecurity = true
    );
    
    IF tables_without_rls IS NOT NULL THEN
        RAISE EXCEPTION 'RLS not enabled on tables: %', tables_without_rls;
    END IF;
    
    RAISE NOTICE 'RLS enabled on all auth tables';
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Auth System Migration Complete!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - admin_profiles';
    RAISE NOTICE '  - admin_invitations';  
    RAISE NOTICE '  - auth_activity_log';
    RAISE NOTICE 'Columns added:';
    RAISE NOTICE '  - players.auth_user_id';
    RAISE NOTICE 'Next: Update Prisma schema and run Phase 1B';
    RAISE NOTICE '====================================';
END;
$$;

COMMIT;

-- Next steps:
-- 1. Verify all tables exist: SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%admin%' OR tablename LIKE '%auth%';
-- 2. Check players.auth_user_id column: \d players
-- 3. Verify RLS policies: SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('admin_profiles', 'admin_invitations', 'auth_activity_log');
-- 4. Update Prisma schema to include new tables
-- 5. Generate Prisma client: npx prisma generate

