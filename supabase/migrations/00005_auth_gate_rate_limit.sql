-- CodeClaim Platform: Auth Gate, Rate Limiting, Developer Reserved Codes
-- Migration: 00005_auth_gate_rate_limit
-- Description: Adds optional OAuth requirement per project, DB-backed rate limiting,
--              IP hash passthrough, and developer-reserved codes per batch.

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Per-project setting: require authentication before redeeming
ALTER TABLE projects ADD COLUMN IF NOT EXISTS require_auth BOOLEAN NOT NULL DEFAULT false;

-- Track which authenticated user redeemed a code (when require_auth is on)
ALTER TABLE codes ADD COLUMN IF NOT EXISTS redeemer_auth_user_id UUID;

-- Developer can reserve 1 code per batch for their own use
ALTER TABLE codes ADD COLUMN IF NOT EXISTS is_developer_reserved BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Rate limiting: fast lookup of recent redemptions by fingerprint
CREATE INDEX IF NOT EXISTS redemption_logs_rate_limit_idx
    ON redemption_logs(project_id, fingerprint, created_at DESC)
    WHERE success = true;

-- Rate limiting: fast lookup of recent redemptions by IP hash
CREATE INDEX IF NOT EXISTS redemption_logs_ip_rate_limit_idx
    ON redemption_logs(project_id, ip_hash, created_at DESC)
    WHERE success = true;

-- Exclude developer-reserved codes from the allocation pool
CREATE INDEX IF NOT EXISTS codes_available_unreserved_idx
    ON codes(batch_id, is_used)
    WHERE is_used = false AND is_developer_reserved = false;

-- ============================================================================
-- UPDATED FUNCTIONS
-- ============================================================================

-- Drop old function signatures before recreating with new params
DROP FUNCTION IF EXISTS public_redeem_code(TEXT, platform_type, TEXT, TEXT);
DROP FUNCTION IF EXISTS allocate_code(UUID, platform_type, TEXT, TEXT, TEXT, TEXT);

-- allocate_code: now excludes developer-reserved codes
CREATE OR REPLACE FUNCTION allocate_code(
    p_project_id UUID,
    p_platform platform_type,
    p_fingerprint TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_detected_platform TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    code_id UUID,
    code_value TEXT,
    batch_name TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_batch_id UUID;
    v_code_id UUID;
    v_code_value TEXT;
    v_batch_name TEXT;
BEGIN
    -- Find an available batch for this project and platform
    SELECT cb.id, cb.name INTO v_batch_id, v_batch_name
    FROM code_batches cb
    WHERE cb.project_id = p_project_id
      AND cb.platform = p_platform
      AND cb.status = 'completed'
      AND cb.deleted_at IS NULL
      AND (cb.expires_at IS NULL OR cb.expires_at > NOW())
      AND cb.used_codes < cb.total_codes
    ORDER BY cb.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_batch_id IS NULL THEN
        INSERT INTO redemption_logs (batch_id, project_id, requested_platform, detected_platform, success, failure_reason, fingerprint, ip_hash, user_agent)
        SELECT cb.id, p_project_id, p_platform, p_detected_platform, false, 'no_codes_available', p_fingerprint, p_ip_hash, p_user_agent
        FROM code_batches cb
        WHERE cb.project_id = p_project_id AND cb.platform = p_platform
        LIMIT 1;

        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, 'No codes available for this platform'::TEXT;
        RETURN;
    END IF;

    -- Allocate a code (excludes developer-reserved codes)
    UPDATE codes
    SET is_used = true,
        used_at = NOW(),
        redeemer_fingerprint = p_fingerprint,
        redeemer_ip_hash = p_ip_hash,
        redeemer_user_agent = p_user_agent,
        redeemer_platform = p_detected_platform
    WHERE id = (
        SELECT id FROM codes
        WHERE batch_id = v_batch_id
          AND is_used = false
          AND is_developer_reserved = false
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING id, code_value INTO v_code_id, v_code_value;

    IF v_code_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, 'No codes available (please retry)'::TEXT;
        RETURN;
    END IF;

    UPDATE code_batches
    SET used_codes = used_codes + 1,
        updated_at = NOW()
    WHERE id = v_batch_id;

    INSERT INTO redemption_logs (code_id, batch_id, project_id, requested_platform, detected_platform, success, fingerprint, ip_hash, user_agent)
    VALUES (v_code_id, v_batch_id, p_project_id, p_platform, p_detected_platform, true, p_fingerprint, p_ip_hash, p_user_agent);

    RETURN QUERY SELECT true, v_code_id, v_code_value, v_batch_name, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- public_redeem_code: now with rate limiting, IP hash passthrough, and auth gate
CREATE OR REPLACE FUNCTION public_redeem_code(
    p_project_slug TEXT,
    p_platform platform_type,
    p_fingerprint TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    code_value TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_project_id UUID;
    v_require_auth BOOLEAN;
    v_recent_count INTEGER;
    v_ip_count INTEGER;
    v_result RECORD;
BEGIN
    -- Find the project by slug (must be active)
    SELECT p.id, p.require_auth INTO v_project_id, v_require_auth
    FROM projects p
    WHERE p.slug = p_project_slug
      AND p.is_active = true
      AND p.deleted_at IS NULL;

    IF v_project_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Project not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- Auth gate: if project requires auth, verify user is authenticated
    IF v_require_auth AND p_auth_user_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Authentication required to redeem codes for this project'::TEXT;
        RETURN;
    END IF;

    -- Rate limit: max 3 successful redemptions per fingerprint per project per hour
    IF p_fingerprint IS NOT NULL THEN
        SELECT COUNT(*) INTO v_recent_count
        FROM redemption_logs
        WHERE project_id = v_project_id
          AND fingerprint = p_fingerprint
          AND success = true
          AND created_at > NOW() - INTERVAL '1 hour';

        IF v_recent_count >= 3 THEN
            RETURN QUERY SELECT false, NULL::TEXT, 'Rate limit exceeded. Please try again later.'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Rate limit: max 10 successful redemptions per IP per project per hour
    IF p_ip_hash IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_count
        FROM redemption_logs
        WHERE project_id = v_project_id
          AND ip_hash = p_ip_hash
          AND success = true
          AND created_at > NOW() - INTERVAL '1 hour';

        IF v_ip_count >= 10 THEN
            RETURN QUERY SELECT false, NULL::TEXT, 'Too many requests from this network. Please try again later.'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Call the internal allocate_code function
    SELECT * INTO v_result
    FROM allocate_code(
        v_project_id,
        p_platform,
        p_fingerprint,
        p_ip_hash,
        p_user_agent,
        p_platform::TEXT
    );

    -- If auth was required and allocation succeeded, record the auth user on the code
    IF v_require_auth AND v_result.success AND p_auth_user_id IS NOT NULL AND v_result.code_id IS NOT NULL THEN
        UPDATE codes SET redeemer_auth_user_id = p_auth_user_id WHERE id = v_result.code_id;
    END IF;

    RETURN QUERY SELECT
        v_result.success,
        v_result.code_value,
        v_result.error_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure grants remain
GRANT EXECUTE ON FUNCTION public_redeem_code TO anon;
GRANT EXECUTE ON FUNCTION public_redeem_code TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_code TO anon;
GRANT EXECUTE ON FUNCTION allocate_code TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN projects.require_auth IS 'When true, users must sign in with Google/Apple before redeeming codes';
COMMENT ON COLUMN codes.redeemer_auth_user_id IS 'Auth user ID of the person who redeemed (when project requires auth)';
COMMENT ON COLUMN codes.is_developer_reserved IS 'When true, this code is reserved for the developer and excluded from public allocation';
