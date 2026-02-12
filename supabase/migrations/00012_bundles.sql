-- SudoGrab: Multi-Code Bundles
-- Migration: 00012_bundles
-- Description: Allows users to redeem one code per platform in a single action.
--   Atomic allocation: all codes succeed or none are allocated.

-- ============================================================================
-- ENABLE BUNDLES ON PROJECTS
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS enable_bundles BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN projects.enable_bundles IS 'When true, users can select multiple platforms and get one code per platform';

-- ============================================================================
-- BUNDLE REDEMPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bundle_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    fingerprint TEXT,
    ip_hash TEXT,
    auth_user_id UUID,
    platforms TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundle_redemptions_project
    ON bundle_redemptions(project_id, created_at DESC);

-- Link codes to a bundle
ALTER TABLE codes ADD COLUMN IF NOT EXISTS bundle_redemption_id UUID REFERENCES bundle_redemptions(id);

-- ============================================================================
-- BUNDLE REDEEM RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION redeem_bundle(
    p_project_slug TEXT,
    p_platforms TEXT[],
    p_fingerprint TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL
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
    -- Get project
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

    -- Create bundle redemption record
    INSERT INTO bundle_redemptions (project_id, fingerprint, ip_hash, auth_user_id, platforms)
    VALUES (v_project_id, p_fingerprint, p_ip_hash, p_auth_user_id, p_platforms)
    RETURNING id INTO v_bundle_id;

    -- Allocate one code per platform
    FOREACH v_platform IN ARRAY p_platforms
    LOOP
        -- Find an available code for this platform
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
            -- Rollback: delete bundle record (CASCADE will clean up)
            -- Since we're in a transaction, the whole thing will rollback
            RAISE EXCEPTION 'No codes available for platform: %', v_platform;
        END IF;

        -- Mark code as used
        UPDATE codes SET
            is_used = true,
            used_at = NOW(),
            redeemer_fingerprint = p_fingerprint,
            redeemer_ip_hash = p_ip_hash,
            redeemer_user_agent = p_user_agent,
            redeemer_auth_user_id = p_auth_user_id,
            bundle_redemption_id = v_bundle_id
        WHERE id = v_code_id;

        -- Update batch counter
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
        -- Clean up the bundle record on failure
        DELETE FROM bundle_redemptions WHERE id = v_bundle_id;
        RETURN json_build_object(
            'success', false,
            'error_message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION redeem_bundle TO anon;
GRANT EXECUTE ON FUNCTION redeem_bundle TO authenticated;

COMMENT ON FUNCTION redeem_bundle IS 'Atomically allocates one code per selected platform. Rolls back if any platform has no available codes.';

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE bundle_redemptions ENABLE ROW LEVEL SECURITY;

-- Public can insert (for redemption)
CREATE POLICY "Anyone can create bundle redemptions"
    ON bundle_redemptions FOR INSERT
    WITH CHECK (true);

-- Developers can view their project's bundle redemptions
CREATE POLICY "Developers can view own bundle redemptions"
    ON bundle_redemptions FOR SELECT
    USING (project_id IN (
        SELECT p.id FROM projects p
        JOIN developers d ON d.id = p.developer_id
        WHERE d.auth_user_id = auth.uid()
    ));
