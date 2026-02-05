-- CodeDrop Platform: Row Level Security Policies
-- Migration: 00002_row_level_security
-- Description: Implements RLS policies for secure multi-tenant access

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the developer_id for the current authenticated user
CREATE OR REPLACE FUNCTION get_current_developer_id()
RETURNS UUID AS $$
    SELECT id FROM developers WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user owns a project
CREATE OR REPLACE FUNCTION user_owns_project(project_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM projects p
        JOIN developers d ON p.developer_id = d.id
        WHERE p.id = project_id
          AND d.auth_user_id = auth.uid()
          AND p.deleted_at IS NULL
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user owns a batch (through project ownership)
CREATE OR REPLACE FUNCTION user_owns_batch(batch_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM code_batches cb
        JOIN projects p ON cb.project_id = p.id
        JOIN developers d ON p.developer_id = d.id
        WHERE cb.id = batch_id
          AND d.auth_user_id = auth.uid()
          AND p.deleted_at IS NULL
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- DEVELOPERS TABLE POLICIES
-- ============================================================================

-- Users can read their own developer profile
CREATE POLICY "developers_select_own"
    ON developers FOR SELECT
    USING (auth_user_id = auth.uid());

-- Users can update their own developer profile
CREATE POLICY "developers_update_own"
    ON developers FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Users can insert their own developer profile (during onboarding)
CREATE POLICY "developers_insert_own"
    ON developers FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

-- Users cannot delete developer profiles (soft delete via deactivation)
-- No DELETE policy = no deletions allowed

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- Developers can see only their own projects
CREATE POLICY "projects_select_own"
    ON projects FOR SELECT
    USING (developer_id = get_current_developer_id() AND deleted_at IS NULL);

-- Developers can insert projects for themselves
CREATE POLICY "projects_insert_own"
    ON projects FOR INSERT
    WITH CHECK (developer_id = get_current_developer_id());

-- Developers can update their own projects
CREATE POLICY "projects_update_own"
    ON projects FOR UPDATE
    USING (developer_id = get_current_developer_id())
    WITH CHECK (developer_id = get_current_developer_id());

-- Developers can soft-delete their own projects
CREATE POLICY "projects_delete_own"
    ON projects FOR DELETE
    USING (developer_id = get_current_developer_id());

-- ============================================================================
-- CODE_BATCHES TABLE POLICIES
-- ============================================================================

-- Developers can see batches for their projects
CREATE POLICY "code_batches_select_own"
    ON code_batches FOR SELECT
    USING (user_owns_project(project_id) AND deleted_at IS NULL);

-- Developers can insert batches for their projects
CREATE POLICY "code_batches_insert_own"
    ON code_batches FOR INSERT
    WITH CHECK (user_owns_project(project_id));

-- Developers can update batches for their projects
CREATE POLICY "code_batches_update_own"
    ON code_batches FOR UPDATE
    USING (user_owns_project(project_id))
    WITH CHECK (user_owns_project(project_id));

-- Developers can soft-delete batches for their projects
CREATE POLICY "code_batches_delete_own"
    ON code_batches FOR DELETE
    USING (user_owns_project(project_id));

-- ============================================================================
-- CODES TABLE POLICIES
-- ============================================================================

-- Developers can see codes in their batches
CREATE POLICY "codes_select_own"
    ON codes FOR SELECT
    USING (user_owns_batch(batch_id));

-- Developers can insert codes into their batches
CREATE POLICY "codes_insert_own"
    ON codes FOR INSERT
    WITH CHECK (user_owns_batch(batch_id));

-- Developers can update codes in their batches (e.g., manual mark as used)
CREATE POLICY "codes_update_own"
    ON codes FOR UPDATE
    USING (user_owns_batch(batch_id))
    WITH CHECK (user_owns_batch(batch_id));

-- Developers can delete codes from their batches
CREATE POLICY "codes_delete_own"
    ON codes FOR DELETE
    USING (user_owns_batch(batch_id));

-- ============================================================================
-- REDEMPTION_LOGS TABLE POLICIES
-- ============================================================================

-- Developers can see redemption logs for their projects
CREATE POLICY "redemption_logs_select_own"
    ON redemption_logs FOR SELECT
    USING (user_owns_project(project_id));

-- Redemption logs are insert-only (created by allocate_code function)
-- No INSERT policy for regular users - only the function can insert

-- No UPDATE or DELETE policies - logs are immutable

-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================

-- The allocate_code function runs with SECURITY DEFINER, so it bypasses RLS
-- This is necessary because anonymous users need to redeem codes
-- The function handles its own authorization logic

-- Grant execute permission on allocate_code to anonymous users
GRANT EXECUTE ON FUNCTION allocate_code TO anon;
GRANT EXECUTE ON FUNCTION allocate_code TO authenticated;

-- Grant execute permission on get_project_stats to authenticated users only
GRANT EXECUTE ON FUNCTION get_project_stats TO authenticated;

-- ============================================================================
-- PUBLIC API ACCESS (for code redemption)
-- ============================================================================

-- Create a public-facing function for code redemption that validates project slug
-- This wraps allocate_code with additional validation
CREATE OR REPLACE FUNCTION public_redeem_code(
    p_project_slug TEXT,
    p_platform platform_type,
    p_fingerprint TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    code_value TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_project_id UUID;
    v_result RECORD;
BEGIN
    -- Find the project by slug (must be active)
    SELECT p.id INTO v_project_id
    FROM projects p
    WHERE p.slug = p_project_slug
      AND p.is_active = true
      AND p.deleted_at IS NULL;

    IF v_project_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Project not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- Call the internal allocate_code function
    SELECT * INTO v_result
    FROM allocate_code(
        v_project_id,
        p_platform,
        p_fingerprint,
        NULL, -- ip_hash handled at API layer
        p_user_agent,
        p_platform::TEXT
    );

    -- Return simplified result (don't expose internal IDs)
    RETURN QUERY SELECT
        v_result.success,
        v_result.code_value,
        v_result.error_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anonymous users (public code redemption)
GRANT EXECUTE ON FUNCTION public_redeem_code TO anon;
GRANT EXECUTE ON FUNCTION public_redeem_code TO authenticated;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for tables that developers need to monitor
-- Note: RLS policies automatically apply to realtime subscriptions

ALTER PUBLICATION supabase_realtime ADD TABLE code_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE codes;
ALTER PUBLICATION supabase_realtime ADD TABLE redemption_logs;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_current_developer_id IS 'Returns the developer_id for the currently authenticated user';
COMMENT ON FUNCTION user_owns_project IS 'Checks if the current user owns a specific project';
COMMENT ON FUNCTION user_owns_batch IS 'Checks if the current user owns a specific batch (via project)';
COMMENT ON FUNCTION public_redeem_code IS 'Public API for code redemption - validates project and allocates code';
