-- SudoGrab: 24h Ephemeral Data Purge
-- Migration: 00011_ephemeral_data
-- Description: Nullifies PII (fingerprint, IP hash, user agent, auth user ID)
--   from codes and redemption_logs after 24 hours. Aggregate stats remain intact.
--   Scheduled via pg_cron to run daily at 3 AM UTC.

-- ============================================================================
-- PURGE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_old_pii_data() RETURNS JSON AS $$
DECLARE
    v_codes_purged INT := 0;
    v_logs_purged INT := 0;
BEGIN
    -- Nullify PII on redeemed codes older than 24 hours
    WITH updated_codes AS (
        UPDATE codes
        SET
            redeemer_fingerprint = NULL,
            redeemer_ip_hash = NULL,
            redeemer_user_agent = NULL,
            redeemer_auth_user_id = NULL
        WHERE is_used = true
          AND used_at < NOW() - INTERVAL '24 hours'
          AND (redeemer_fingerprint IS NOT NULL
            OR redeemer_ip_hash IS NOT NULL
            OR redeemer_user_agent IS NOT NULL
            OR redeemer_auth_user_id IS NOT NULL)
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

GRANT EXECUTE ON FUNCTION purge_old_pii_data TO service_role;

COMMENT ON FUNCTION purge_old_pii_data IS 'Nullifies PII (fingerprint, IP, user agent) from codes and redemption_logs after 24 hours. Preserves: is_used, used_at, platform, success/failure stats.';

-- ============================================================================
-- SCHEDULE VIA PG_CRON (daily at 3 AM UTC)
-- ============================================================================

SELECT cron.schedule(
    'purge-pii-data',
    '0 3 * * *',
    'SELECT purge_old_pii_data()'
);
