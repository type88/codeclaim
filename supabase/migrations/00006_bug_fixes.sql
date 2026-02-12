-- SudoGrab: Bug Fixes
-- Migration: 00006_bug_fixes
-- Description: Fixes 3 bugs discovered during feature expansion planning:
--   1. Missing low_code_threshold column on projects (UI references it)
--   2. Missing get_project_analytics() RPC function (analytics tab crashes)
--   3. Missing deleted_at column on codes (batch soft-delete fails)

-- ============================================================================
-- BUG FIX 1: Missing low_code_threshold column
-- The dashboard UI and PATCH API reference this column but it was never created.
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS low_code_threshold INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN projects.low_code_threshold IS 'Show warning when a batch has fewer available codes than this threshold';

-- ============================================================================
-- BUG FIX 2: Missing deleted_at column on codes table
-- Batch deletion tries to soft-delete codes but this column doesn't exist.
-- ============================================================================

ALTER TABLE codes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS codes_deleted_at_idx ON codes(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- BUG FIX 3: Missing get_project_analytics() RPC function
-- The analytics tab calls this via supabase.rpc() but it was never created.
-- Returns JSON matching the AnalyticsData TypeScript interface:
--   { daily_counts, platform_stats, success_rate, total_redemptions, total_success, recent_activity }
-- ============================================================================

CREATE OR REPLACE FUNCTION get_project_analytics(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
    v_developer_id UUID;
    v_result JSON;
BEGIN
    -- Verify the calling user owns this project
    SELECT developer_id INTO v_developer_id
    FROM projects
    WHERE id = p_project_id
      AND deleted_at IS NULL;

    IF v_developer_id IS NULL THEN
        RETURN json_build_object('error', 'not_found');
    END IF;

    -- Verify ownership via the developers table
    IF NOT EXISTS (
        SELECT 1 FROM developers
        WHERE id = v_developer_id
          AND auth_user_id = auth.uid()
    ) THEN
        RETURN json_build_object('error', 'not_found');
    END IF;

    SELECT json_build_object(
        'daily_counts', COALESCE((
            SELECT json_agg(row_to_json(daily_data) ORDER BY daily_data.day DESC)
            FROM (
                SELECT DATE(created_at)::TEXT as day, COUNT(*)::INT as count
                FROM redemption_logs
                WHERE project_id = p_project_id
                  AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at) DESC
            ) daily_data
        ), '[]'::JSON),
        'platform_stats', COALESCE((
            SELECT json_object_agg(
                platform_data.platform,
                json_build_object(
                    'total', platform_data.total_count,
                    'success', platform_data.success_count,
                    'failed', platform_data.failed_count
                )
            )
            FROM (
                SELECT
                    requested_platform::TEXT as platform,
                    COUNT(*)::INT as total_count,
                    COUNT(*) FILTER (WHERE success)::INT as success_count,
                    COUNT(*) FILTER (WHERE NOT success)::INT as failed_count
                FROM redemption_logs
                WHERE project_id = p_project_id
                GROUP BY requested_platform
            ) platform_data
        ), '{}'::JSON),
        'success_rate', COALESCE((
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE success)::NUMERIC / NULLIF(COUNT(*), 0)) * 100
            )::INT
            FROM redemption_logs
            WHERE project_id = p_project_id
        ), 0),
        'total_redemptions', COALESCE((
            SELECT COUNT(*)::INT FROM redemption_logs WHERE project_id = p_project_id
        ), 0),
        'total_success', COALESCE((
            SELECT COUNT(*)::INT FROM redemption_logs WHERE project_id = p_project_id AND success = true
        ), 0),
        'recent_activity', COALESCE((
            SELECT json_agg(row_to_json(activity))
            FROM (
                SELECT created_at, requested_platform, success, failure_reason
                FROM redemption_logs
                WHERE project_id = p_project_id
                ORDER BY created_at DESC
                LIMIT 20
            ) activity
        ), '[]'::JSON)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (developers viewing their dashboard)
GRANT EXECUTE ON FUNCTION get_project_analytics TO authenticated;

COMMENT ON FUNCTION get_project_analytics IS 'Returns analytics data for a project dashboard: daily counts, platform stats, success rate, and recent activity';
