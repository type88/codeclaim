-- CodeDrop Platform: Initial Database Schema
-- Migration: 00001_initial_schema
-- Description: Creates all core tables for promo code distribution platform

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fuzzy text search (useful for code lookups)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Platform types for promo codes
CREATE TYPE platform_type AS ENUM ('ios', 'android', 'steam', 'web', 'windows', 'macos', 'playstation', 'xbox', 'nintendo');

-- Batch status for tracking upload processing
CREATE TYPE batch_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Developers: Extended profile for authenticated users
-- Links to Supabase auth.users via auth_user_id
CREATE TABLE developers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    company_name TEXT,
    website_url TEXT,

    -- API access
    api_key UUID DEFAULT uuid_generate_v4(),
    api_key_created_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT developers_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Projects: Apps/services that need promo codes
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    website_url TEXT,
    icon_url TEXT,

    -- Settings
    is_active BOOLEAN NOT NULL DEFAULT true,
    allow_multiple_redemptions BOOLEAN NOT NULL DEFAULT false, -- Can same user get multiple codes?

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete

    CONSTRAINT projects_slug_format CHECK (slug ~* '^[a-z0-9-]+$'),
    CONSTRAINT projects_slug_length CHECK (char_length(slug) >= 3 AND char_length(slug) <= 50),
    CONSTRAINT projects_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Unique slug per developer (allows different developers to have same slug)
CREATE UNIQUE INDEX projects_developer_slug_unique ON projects(developer_id, slug) WHERE deleted_at IS NULL;

-- Code Batches: Groups of promo codes uploaded together
CREATE TABLE code_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Batch info
    name TEXT NOT NULL,
    description TEXT,
    platform platform_type NOT NULL,

    -- Processing status
    status batch_status NOT NULL DEFAULT 'pending',
    error_message TEXT,

    -- Statistics (denormalized for performance)
    total_codes INTEGER NOT NULL DEFAULT 0,
    used_codes INTEGER NOT NULL DEFAULT 0,

    -- Expiration
    expires_at TIMESTAMPTZ,

    -- Source file reference (Supabase Storage)
    source_file_path TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete

    CONSTRAINT code_batches_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT code_batches_counts_valid CHECK (used_codes >= 0 AND total_codes >= 0 AND used_codes <= total_codes)
);

-- Codes: Individual promo codes
CREATE TABLE codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES code_batches(id) ON DELETE CASCADE,

    -- The actual code value
    code_value TEXT NOT NULL,

    -- Redemption tracking
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,

    -- Redeemer info (anonymous tracking)
    redeemer_fingerprint TEXT, -- Browser/device fingerprint
    redeemer_ip_hash TEXT, -- Hashed IP for abuse prevention
    redeemer_platform TEXT, -- Detected platform at redemption time
    redeemer_user_agent TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT codes_value_length CHECK (char_length(code_value) >= 1 AND char_length(code_value) <= 500)
);

-- Unique code per batch (same code can exist in different batches)
CREATE UNIQUE INDEX codes_batch_value_unique ON codes(batch_id, code_value);

-- Redemption Log: Detailed tracking of all redemption attempts
CREATE TABLE redemption_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID REFERENCES codes(id) ON DELETE SET NULL,
    batch_id UUID NOT NULL REFERENCES code_batches(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Request info
    requested_platform platform_type NOT NULL,
    detected_platform TEXT,

    -- Outcome
    success BOOLEAN NOT NULL,
    failure_reason TEXT, -- 'no_codes_available', 'batch_expired', 'rate_limited', etc.

    -- Redeemer info
    fingerprint TEXT,
    ip_hash TEXT,
    user_agent TEXT,
    country_code TEXT, -- From IP geolocation if available

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Developers
CREATE INDEX developers_auth_user_id_idx ON developers(auth_user_id);
CREATE INDEX developers_api_key_idx ON developers(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX developers_email_idx ON developers(email);

-- Projects
CREATE INDEX projects_developer_id_idx ON projects(developer_id);
CREATE INDEX projects_slug_idx ON projects(slug);
CREATE INDEX projects_is_active_idx ON projects(is_active) WHERE deleted_at IS NULL;
CREATE INDEX projects_created_at_idx ON projects(created_at DESC);

-- Code Batches
CREATE INDEX code_batches_project_id_idx ON code_batches(project_id);
CREATE INDEX code_batches_platform_idx ON code_batches(platform);
CREATE INDEX code_batches_status_idx ON code_batches(status);
CREATE INDEX code_batches_expires_at_idx ON code_batches(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX code_batches_available_idx ON code_batches(project_id, platform, status)
    WHERE deleted_at IS NULL AND status = 'completed';

-- Codes - Critical for fast code allocation
CREATE INDEX codes_batch_id_idx ON codes(batch_id);
CREATE INDEX codes_is_used_idx ON codes(is_used);
CREATE INDEX codes_available_idx ON codes(batch_id, is_used) WHERE is_used = false;
CREATE INDEX codes_code_value_trgm_idx ON codes USING gin(code_value gin_trgm_ops);

-- Redemption Logs
CREATE INDEX redemption_logs_code_id_idx ON redemption_logs(code_id);
CREATE INDEX redemption_logs_batch_id_idx ON redemption_logs(batch_id);
CREATE INDEX redemption_logs_project_id_idx ON redemption_logs(project_id);
CREATE INDEX redemption_logs_created_at_idx ON redemption_logs(created_at DESC);
CREATE INDEX redemption_logs_fingerprint_idx ON redemption_logs(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX redemption_logs_success_idx ON redemption_logs(success, created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atomic code allocation function
-- This prevents race conditions when multiple users request codes simultaneously
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
    ORDER BY cb.created_at ASC -- FIFO: oldest batch first
    LIMIT 1
    FOR UPDATE SKIP LOCKED; -- Skip if another transaction is using this batch

    IF v_batch_id IS NULL THEN
        -- Log the failed attempt
        INSERT INTO redemption_logs (batch_id, project_id, requested_platform, detected_platform, success, failure_reason, fingerprint, ip_hash, user_agent)
        SELECT cb.id, p_project_id, p_platform, p_detected_platform, false, 'no_codes_available', p_fingerprint, p_ip_hash, p_user_agent
        FROM code_batches cb
        WHERE cb.project_id = p_project_id AND cb.platform = p_platform
        LIMIT 1;

        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, 'No codes available for this platform'::TEXT;
        RETURN;
    END IF;

    -- Allocate a code from this batch (atomic operation)
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
        ORDER BY created_at ASC -- FIFO: oldest code first
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING id, code_value INTO v_code_id, v_code_value;

    IF v_code_id IS NULL THEN
        -- Race condition: codes ran out between check and allocation
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, 'No codes available (please retry)'::TEXT;
        RETURN;
    END IF;

    -- Update batch statistics
    UPDATE code_batches
    SET used_codes = used_codes + 1,
        updated_at = NOW()
    WHERE id = v_batch_id;

    -- Log successful redemption
    INSERT INTO redemption_logs (code_id, batch_id, project_id, requested_platform, detected_platform, success, fingerprint, ip_hash, user_agent)
    VALUES (v_code_id, v_batch_id, p_project_id, p_platform, p_detected_platform, true, p_fingerprint, p_ip_hash, p_user_agent);

    RETURN QUERY SELECT true, v_code_id, v_code_value, v_batch_name, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get project statistics
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID)
RETURNS TABLE (
    total_batches BIGINT,
    total_codes BIGINT,
    used_codes BIGINT,
    available_codes BIGINT,
    redemption_rate NUMERIC,
    codes_by_platform JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT cb.id)::BIGINT as total_batches,
        COALESCE(SUM(cb.total_codes), 0)::BIGINT as total_codes,
        COALESCE(SUM(cb.used_codes), 0)::BIGINT as used_codes,
        COALESCE(SUM(cb.total_codes - cb.used_codes), 0)::BIGINT as available_codes,
        CASE
            WHEN SUM(cb.total_codes) > 0
            THEN ROUND((SUM(cb.used_codes)::NUMERIC / SUM(cb.total_codes)::NUMERIC) * 100, 2)
            ELSE 0
        END as redemption_rate,
        COALESCE(
            jsonb_object_agg(
                cb.platform::TEXT,
                jsonb_build_object('total', cb.total_codes, 'used', cb.used_codes)
            ),
            '{}'::JSONB
        ) as codes_by_platform
    FROM code_batches cb
    WHERE cb.project_id = p_project_id
      AND cb.deleted_at IS NULL
      AND cb.status = 'completed'
    GROUP BY cb.project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE TRIGGER update_developers_updated_at
    BEFORE UPDATE ON developers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_batches_updated_at
    BEFORE UPDATE ON code_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE developers IS 'Extended profile for authenticated users (developers who upload codes)';
COMMENT ON TABLE projects IS 'Apps/services that need promo code distribution';
COMMENT ON TABLE code_batches IS 'Groups of promo codes uploaded together, organized by platform';
COMMENT ON TABLE codes IS 'Individual promo codes with redemption tracking';
COMMENT ON TABLE redemption_logs IS 'Audit log of all code redemption attempts (successful and failed)';

COMMENT ON FUNCTION allocate_code IS 'Atomically allocates an available code to a user, preventing race conditions';
COMMENT ON FUNCTION get_project_stats IS 'Returns aggregated statistics for a project dashboard';

COMMENT ON COLUMN developers.api_key IS 'Optional API key for programmatic access to code management';
COMMENT ON COLUMN codes.redeemer_fingerprint IS 'Browser/device fingerprint for abuse prevention (not PII)';
COMMENT ON COLUMN codes.redeemer_ip_hash IS 'One-way hash of IP address for rate limiting (not reversible)';
