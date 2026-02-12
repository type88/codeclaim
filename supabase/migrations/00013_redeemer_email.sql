-- SudoGrab: Persist Redeemer Emails (per-project opt-in)
-- Migration: 00013_redeemer_email
-- Description: Adds redeemer_email column to codes and a per-project flag
--   to retain it through the 24h PII purge. Default: purged like other PII.
--   Developers who enable retain_redeemer_email keep emails permanently.

-- ============================================================================
-- NEW COLUMNS
-- ============================================================================

ALTER TABLE codes ADD COLUMN IF NOT EXISTS redeemer_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS retain_redeemer_email BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN codes.redeemer_email IS 'Email of the authenticated redeemer. Purged after 24h unless project.retain_redeemer_email is true.';
COMMENT ON COLUMN projects.retain_redeemer_email IS 'When true, redeemer emails survive the 24h PII purge.';

CREATE INDEX IF NOT EXISTS idx_codes_redeemer_email
    ON codes(redeemer_email) WHERE redeemer_email IS NOT NULL;

-- ============================================================================
-- UPDATE PURGE FUNCTION: also clear redeemer_email unless project opts out
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_old_pii_data() RETURNS JSON AS $$
DECLARE
    v_codes_purged INT := 0;
    v_logs_purged INT := 0;
BEGIN
    -- Nullify PII on redeemed codes older than 24 hours
    -- redeemer_email is only purged for projects WITHOUT retain_redeemer_email
    WITH updated_codes AS (
        UPDATE codes c
        SET
            redeemer_fingerprint = NULL,
            redeemer_ip_hash = NULL,
            redeemer_user_agent = NULL,
            redeemer_auth_user_id = NULL,
            redeemer_email = CASE
                WHEN EXISTS (
                    SELECT 1 FROM code_batches cb
                    JOIN projects p ON p.id = cb.project_id
                    WHERE cb.id = c.batch_id AND p.retain_redeemer_email = true
                ) THEN c.redeemer_email
                ELSE NULL
            END
        WHERE is_used = true
          AND used_at < NOW() - INTERVAL '24 hours'
          AND (redeemer_fingerprint IS NOT NULL
            OR redeemer_ip_hash IS NOT NULL
            OR redeemer_user_agent IS NOT NULL
            OR redeemer_auth_user_id IS NOT NULL
            OR redeemer_email IS NOT NULL)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_codes_purged FROM updated_codes;

    -- Nullify PII on redemption logs older than 24 hours
    WITH updated_logs AS (
        UPDATE redemption_logs
        SET
            fingerprint = NULL,
            ip_hash = NULL,
            user_agent = NULL
        WHERE created_at < NOW() - INTERVAL '24 hours'
          AND (fingerprint IS NOT NULL
            OR ip_hash IS NOT NULL
            OR user_agent IS NOT NULL)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_logs_purged FROM updated_logs;

    RETURN json_build_object(
        'codes_purged', v_codes_purged,
        'logs_purged', v_logs_purged,
        'purged_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE public_redeem_code TO ACCEPT AND STORE EMAIL
-- ============================================================================

CREATE OR REPLACE FUNCTION public_redeem_code(
    p_project_slug TEXT,
    p_platform platform_type,
    p_fingerprint TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL,
    p_redeemer_email TEXT DEFAULT NULL
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
    SELECT p.id, p.require_auth INTO v_project_id, v_require_auth
    FROM projects p
    WHERE p.slug = p_project_slug
      AND p.is_active = true
      AND p.deleted_at IS NULL;

    IF v_project_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Project not found or inactive'::TEXT;
        RETURN;
    END IF;

    IF v_require_auth AND p_auth_user_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Authentication required to redeem codes for this project'::TEXT;
        RETURN;
    END IF;

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

    SELECT * INTO v_result
    FROM allocate_code(
        v_project_id,
        p_platform,
        p_fingerprint,
        p_ip_hash,
        p_user_agent,
        p_platform::TEXT
    );

    -- Store auth user ID and email on the code
    IF v_result.success AND v_result.code_id IS NOT NULL THEN
        UPDATE codes SET
            redeemer_auth_user_id = p_auth_user_id,
            redeemer_email = p_redeemer_email
        WHERE id = v_result.code_id;
    END IF;

    RETURN QUERY SELECT
        v_result.success,
        v_result.code_value,
        v_result.error_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public_redeem_code TO anon;
GRANT EXECUTE ON FUNCTION public_redeem_code TO authenticated;

-- ============================================================================
-- UPDATE redeem_bundle TO ACCEPT AND STORE EMAIL
-- ============================================================================

CREATE OR REPLACE FUNCTION redeem_bundle(
    p_project_slug TEXT,
    p_platforms TEXT[],
    p_fingerprint TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL,
    p_redeemer_email TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_project_id UUID;
    v_require_auth BOOLEAN;
    v_enable_bundles BOOLEAN;
    v_bundle_id UUID;
    v_platform TEXT;
    v_code_id UUID;
    v_code_value TEXT;
    v_results JSON[] := ARRAY[]::JSON[];
    v_batch_id UUID;
BEGIN
    SELECT id, require_auth, enable_bundles
    INTO v_project_id, v_require_auth, v_enable_bundles
    FROM projects
    WHERE slug = p_project_slug
      AND is_active = true
      AND deleted_at IS NULL;

    IF v_project_id IS NULL THEN
        RETURN json_build_object('success', false, 'error_message', 'Project not found');
    END IF;

    IF NOT v_enable_bundles THEN
        RETURN json_build_object('success', false, 'error_message', 'Bundles not enabled for this project');
    END IF;

    IF v_require_auth AND p_auth_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error_message', 'Authentication required');
    END IF;

    IF array_length(p_platforms, 1) IS NULL OR array_length(p_platforms, 1) = 0 THEN
        RETURN json_build_object('success', false, 'error_message', 'At least one platform required');
    END IF;

    INSERT INTO bundle_redemptions (project_id, fingerprint, ip_hash, auth_user_id, platforms)
    VALUES (v_project_id, p_fingerprint, p_ip_hash, p_auth_user_id, p_platforms)
    RETURNING id INTO v_bundle_id;

    FOREACH v_platform IN ARRAY p_platforms
    LOOP
        SELECT c.id, c.code_value, c.batch_id
        INTO v_code_id, v_code_value, v_batch_id
        FROM codes c
        JOIN code_batches cb ON cb.id = c.batch_id
        WHERE cb.project_id = v_project_id
          AND cb.platform = v_platform
          AND cb.deleted_at IS NULL
          AND (cb.expires_at IS NULL OR cb.expires_at > NOW())
          AND c.is_used = false
          AND c.deleted_at IS NULL
          AND c.is_developer_reserved = false
        ORDER BY c.id
        LIMIT 1
        FOR UPDATE OF c SKIP LOCKED;

        IF v_code_id IS NULL THEN
            RAISE EXCEPTION 'No codes available for platform: %', v_platform;
        END IF;

        UPDATE codes SET
            is_used = true,
            used_at = NOW(),
            redeemer_fingerprint = p_fingerprint,
            redeemer_ip_hash = p_ip_hash,
            redeemer_user_agent = p_user_agent,
            redeemer_auth_user_id = p_auth_user_id,
            redeemer_email = p_redeemer_email,
            bundle_redemption_id = v_bundle_id
        WHERE id = v_code_id;

        UPDATE code_batches SET used_codes = used_codes + 1
        WHERE id = v_batch_id;

        v_results := v_results || json_build_object(
            'platform', v_platform,
            'code_value', v_code_value
        )::JSON;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'bundle_id', v_bundle_id,
        'codes', array_to_json(v_results)
    );

EXCEPTION
    WHEN OTHERS THEN
        DELETE FROM bundle_redemptions WHERE id = v_bundle_id;
        RETURN json_build_object(
            'success', false,
            'error_message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION redeem_bundle TO anon;
GRANT EXECUTE ON FUNCTION redeem_bundle TO authenticated;
