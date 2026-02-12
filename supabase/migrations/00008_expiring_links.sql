-- SudoGrab: Expiring Links
-- Migration: 00008_expiring_links
-- Description: Adds project-level expiration for time-limited campaigns.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN projects.expires_at IS 'When set, the redemption page shows a countdown and returns 410 Gone after expiry';
