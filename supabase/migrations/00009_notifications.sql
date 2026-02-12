-- SudoGrab: Email & In-App Notifications
-- Migration: 00009_notifications
-- Description: Notification preferences per project, notification log table,
--   and a background check function for low/empty batches, milestones, and expiring campaigns.

-- ============================================================================
-- NOTIFICATION PREFERENCES ON PROJECTS
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notify_on_batch_low BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notify_on_batch_empty BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notify_on_milestones BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN projects.email_notifications_enabled IS 'Master toggle for notification generation';
COMMENT ON COLUMN projects.notify_on_batch_low IS 'Notify when a batch drops below low_code_threshold';
COMMENT ON COLUMN projects.notify_on_batch_empty IS 'Notify when a batch runs out of codes';
COMMENT ON COLUMN projects.notify_on_milestones IS 'Notify at redemption milestones (100, 500, 1K, 5K, 10K)';

-- ============================================================================
-- NOTIFICATION LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('batch_low', 'batch_empty', 'milestone', 'campaign_expiring')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT false,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    dedup_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_developer_unread
    ON notification_logs(developer_id, created_at DESC) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notification_logs_project_type
    ON notification_logs(project_id, event_type, created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can read own notifications"
    ON notification_logs FOR SELECT
    USING (developer_id IN (
        SELECT id FROM developers WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Developers can update own notifications"
    ON notification_logs FOR UPDATE
    USING (developer_id IN (
        SELECT id FROM developers WHERE auth_user_id = auth.uid()
    ));

-- ============================================================================
-- HELPER: CREATE NOTIFICATION (with dedup)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
    p_project_id UUID,
    p_event_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_event_data JSONB DEFAULT '{}',
    p_dedup_key TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_developer_id UUID;
    v_notification_id UUID;
    v_key TEXT;
BEGIN
    SELECT developer_id INTO v_developer_id
    FROM projects WHERE id = p_project_id;

    IF v_developer_id IS NULL THEN
        RETURN NULL;
    END IF;

    v_key := COALESCE(
        p_dedup_key,
        p_project_id || ':' || p_event_type || ':' || TO_CHAR(NOW(), 'YYYY-MM-DD')
    );

    INSERT INTO notification_logs (project_id, developer_id, event_type, title, message, event_data, dedup_key)
    VALUES (p_project_id, v_developer_id, p_event_type, p_title, p_message, p_event_data, v_key)
    ON CONFLICT (dedup_key) DO NOTHING
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BACKGROUND CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_notification_conditions() RETURNS JSON AS $$
DECLARE
    proj RECORD;
    batch RECORD;
    v_total_redeemed INT;
    v_milestones INT[] := ARRAY[100, 500, 1000, 5000, 10000];
    v_milestone INT;
    v_created INT := 0;
BEGIN
    FOR proj IN
        SELECT p.id, p.name, p.low_code_threshold,
               p.notify_on_batch_low, p.notify_on_batch_empty,
               p.notify_on_milestones, p.expires_at
        FROM projects p
        WHERE p.deleted_at IS NULL
          AND p.is_active = true
          AND p.email_notifications_enabled = true
    LOOP
        -- Check batch conditions
        IF proj.notify_on_batch_low OR proj.notify_on_batch_empty THEN
            FOR batch IN
                SELECT id, name, platform, total_codes, used_codes
                FROM code_batches
                WHERE project_id = proj.id AND deleted_at IS NULL
            LOOP
                IF proj.notify_on_batch_empty AND batch.used_codes >= batch.total_codes THEN
                    IF create_notification(
                        proj.id, 'batch_empty',
                        batch.name || ' is out of codes',
                        'All ' || batch.total_codes || ' codes in "' || batch.name || '" (' || batch.platform || ') have been redeemed.',
                        jsonb_build_object('batch_id', batch.id, 'batch_name', batch.name, 'platform', batch.platform),
                        proj.id || ':batch_empty:' || batch.id
                    ) IS NOT NULL THEN
                        v_created := v_created + 1;
                    END IF;

                ELSIF proj.notify_on_batch_low
                    AND (batch.total_codes - batch.used_codes) <= proj.low_code_threshold
                    AND batch.used_codes < batch.total_codes THEN
                    IF create_notification(
                        proj.id, 'batch_low',
                        batch.name || ' is running low',
                        'Only ' || (batch.total_codes - batch.used_codes) || ' codes left in "' || batch.name || '" (' || batch.platform || ').',
                        jsonb_build_object('batch_id', batch.id, 'batch_name', batch.name, 'platform', batch.platform, 'remaining', batch.total_codes - batch.used_codes),
                        proj.id || ':batch_low:' || batch.id
                    ) IS NOT NULL THEN
                        v_created := v_created + 1;
                    END IF;
                END IF;
            END LOOP;
        END IF;

        -- Check milestones
        IF proj.notify_on_milestones THEN
            SELECT COALESCE(SUM(used_codes), 0) INTO v_total_redeemed
            FROM code_batches
            WHERE project_id = proj.id AND deleted_at IS NULL;

            FOREACH v_milestone IN ARRAY v_milestones
            LOOP
                IF v_total_redeemed >= v_milestone THEN
                    IF create_notification(
                        proj.id, 'milestone',
                        proj.name || ' hit ' || v_milestone || ' redemptions!',
                        'Your project "' || proj.name || '" has reached ' || v_milestone || ' total code redemptions.',
                        jsonb_build_object('milestone', v_milestone, 'total_redeemed', v_total_redeemed),
                        proj.id || ':milestone:' || v_milestone
                    ) IS NOT NULL THEN
                        v_created := v_created + 1;
                    END IF;
                END IF;
            END LOOP;
        END IF;

        -- Check campaign expiring within 24 hours
        IF proj.expires_at IS NOT NULL
           AND proj.expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours' THEN
            IF create_notification(
                proj.id, 'campaign_expiring',
                proj.name || ' expires soon',
                'Your campaign "' || proj.name || '" expires at ' || TO_CHAR(proj.expires_at, 'YYYY-MM-DD HH24:MI') || ' UTC.',
                jsonb_build_object('expires_at', proj.expires_at),
                proj.id || ':campaign_expiring:' || TO_CHAR(proj.expires_at, 'YYYY-MM-DD')
            ) IS NOT NULL THEN
                v_created := v_created + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN json_build_object('notifications_created', v_created);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service_role (for Edge Function / cron) and authenticated (for manual trigger)
GRANT EXECUTE ON FUNCTION check_notification_conditions TO service_role;
GRANT EXECUTE ON FUNCTION create_notification TO service_role;

COMMENT ON FUNCTION check_notification_conditions IS 'Checks all active projects for notification conditions (low/empty batches, milestones, expiring campaigns) and creates notification_log entries with dedup';
