-- SudoGrab: Webhooks
-- Migration: 00010_webhooks
-- Description: Webhook infrastructure for developers to receive real-time events
--   via HTTP callbacks. Supports HMAC-signed payloads with delivery tracking.

-- ============================================================================
-- WEBHOOKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT ARRAY['code_redeemed'],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_project ON webhooks(project_id) WHERE is_active = true;

-- ============================================================================
-- WEBHOOK DELIVERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INT,
    response_body TEXT,
    attempt_count INT NOT NULL DEFAULT 1,
    success BOOLEAN NOT NULL DEFAULT false,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
    ON webhook_deliveries(webhook_id, delivered_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Webhooks: developers can manage their own project's webhooks
CREATE POLICY "Developers can manage own webhooks"
    ON webhooks FOR ALL
    USING (project_id IN (
        SELECT p.id FROM projects p
        JOIN developers d ON d.id = p.developer_id
        WHERE d.auth_user_id = auth.uid()
    ));

-- Webhook deliveries: developers can view deliveries for their webhooks
CREATE POLICY "Developers can view own webhook deliveries"
    ON webhook_deliveries FOR SELECT
    USING (webhook_id IN (
        SELECT w.id FROM webhooks w
        JOIN projects p ON p.id = w.project_id
        JOIN developers d ON d.id = p.developer_id
        WHERE d.auth_user_id = auth.uid()
    ));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE webhooks IS 'Developer-configured HTTP callback endpoints for project events';
COMMENT ON COLUMN webhooks.secret IS 'HMAC secret for signing webhook payloads (X-SudoGrab-Signature header)';
COMMENT ON COLUMN webhooks.events IS 'Array of event types: code_redeemed, batch_empty, batch_low, batch_created';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts with response tracking';
