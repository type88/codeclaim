-- SudoGrab: Promotional Redemption Page
-- Migration: 00007_promotional_page
-- Description: Adds fields for developers to customize their redemption page
--   with hero images, custom copy, branding, and social proof.

-- ============================================================================
-- NEW COLUMNS ON PROJECTS TABLE
-- ============================================================================

-- Hero banner image (uploaded to Supabase Storage)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Custom headline for the redemption page
ALTER TABLE projects ADD COLUMN IF NOT EXISTS promo_headline TEXT;

-- Rich description with markdown support
ALTER TABLE projects ADD COLUMN IF NOT EXISTS promo_description TEXT;

-- Custom call-to-action button text
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Get My Code';

-- Social proof: show code claim stats on redemption page
ALTER TABLE projects ADD COLUMN IF NOT EXISTS show_social_proof BOOLEAN NOT NULL DEFAULT true;

-- Social proof display style
ALTER TABLE projects ADD COLUMN IF NOT EXISTS social_proof_style TEXT NOT NULL DEFAULT 'claimed'
    CHECK (social_proof_style IN ('claimed', 'remaining'));

-- Developer/company logo for branding
ALTER TABLE projects ADD COLUMN IF NOT EXISTS developer_logo_url TEXT;

-- Accent color for the redemption page (hex format)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#6366f1';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN projects.hero_image_url IS 'Hero banner image URL from Supabase Storage';
COMMENT ON COLUMN projects.promo_headline IS 'Custom headline for redemption page (e.g., "Get your free premium month")';
COMMENT ON COLUMN projects.promo_description IS 'Rich description with markdown support';
COMMENT ON COLUMN projects.cta_text IS 'Custom call-to-action button text';
COMMENT ON COLUMN projects.show_social_proof IS 'Show code claim stats on redemption page';
COMMENT ON COLUMN projects.social_proof_style IS 'Display style: "claimed" shows redeemed count, "remaining" shows available count';
COMMENT ON COLUMN projects.developer_logo_url IS 'Developer/company logo URL from Supabase Storage';
COMMENT ON COLUMN projects.theme_color IS 'Accent color for redemption page (hex format, e.g. #6366f1)';
