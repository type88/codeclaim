-- CodeDrop Platform: Add Store ID Columns
-- Migration: 00003_add_store_ids
-- Description: Adds app store ID columns to code_batches for direct store redirects

-- ============================================================================
-- ADD STORE ID COLUMNS
-- ============================================================================

-- App Store ID for iOS codes (e.g., "id123456789" or "123456789")
ALTER TABLE code_batches
ADD COLUMN IF NOT EXISTS app_store_id TEXT;

-- Google Play Store package name for Android codes (e.g., "com.example.app")
ALTER TABLE code_batches
ADD COLUMN IF NOT EXISTS play_store_package TEXT;

-- Steam App ID for Steam codes (e.g., "440" for Team Fortress 2)
ALTER TABLE code_batches
ADD COLUMN IF NOT EXISTS steam_app_id TEXT;

-- ============================================================================
-- ADD INDEXES FOR LOOKUP
-- ============================================================================

CREATE INDEX IF NOT EXISTS code_batches_app_store_id_idx
ON code_batches(app_store_id) WHERE app_store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS code_batches_play_store_package_idx
ON code_batches(play_store_package) WHERE play_store_package IS NOT NULL;

CREATE INDEX IF NOT EXISTS code_batches_steam_app_id_idx
ON code_batches(steam_app_id) WHERE steam_app_id IS NOT NULL;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN code_batches.app_store_id IS 'Apple App Store ID for direct redemption link (e.g., "id123456789")';
COMMENT ON COLUMN code_batches.play_store_package IS 'Google Play Store package name for direct redemption link (e.g., "com.example.app")';
COMMENT ON COLUMN code_batches.steam_app_id IS 'Steam App ID for direct redemption link (e.g., "440")';
