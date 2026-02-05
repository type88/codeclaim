-- Public RLS policies for anonymous code redemption flow
-- Migration: 00004_add_public_redeem_policies
-- These allow the public /redeem/[slug] page to work without authentication

-- Allow anonymous users to read active, non-deleted projects (for redeem page)
CREATE POLICY "projects_select_public_active"
    ON projects FOR SELECT
    TO anon
    USING (is_active = true AND deleted_at IS NULL);

-- Allow anonymous users to read completed, non-deleted batches (for platform availability)
CREATE POLICY "code_batches_select_public_available"
    ON code_batches FOR SELECT
    TO anon
    USING (
        deleted_at IS NULL
        AND status = 'completed'
        AND EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = code_batches.project_id
              AND p.is_active = true
              AND p.deleted_at IS NULL
        )
    );

-- Allow anonymous users to read codes (for store ID lookup after redemption)
-- Limited to codes that have been used (just redeemed)
CREATE POLICY "codes_select_public_used"
    ON codes FOR SELECT
    TO anon
    USING (is_used = true);
