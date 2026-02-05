-- CodeDrop Platform: Seed Data
-- Description: Sample data for development and testing
-- Note: This requires an authenticated user to exist in auth.users first

-- ============================================================================
-- SAMPLE DEVELOPER (requires manual auth.users entry first)
-- ============================================================================

-- After creating a user via Supabase Auth, uncomment and update this:
-- INSERT INTO developers (auth_user_id, email, display_name, company_name)
-- VALUES (
--     'YOUR_AUTH_USER_UUID_HERE',
--     'developer@example.com',
--     'Demo Developer',
--     'Indie Games Studio'
-- );

-- ============================================================================
-- SAMPLE DATA GENERATION FUNCTION
-- ============================================================================

-- Function to generate sample data for a developer
-- Call this after creating a developer: SELECT generate_sample_data('developer_uuid');
CREATE OR REPLACE FUNCTION generate_sample_data(p_developer_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_project_id UUID;
    v_batch_ios_id UUID;
    v_batch_android_id UUID;
    v_batch_steam_id UUID;
BEGIN
    -- Create sample project
    INSERT INTO projects (developer_id, name, slug, description, website_url)
    VALUES (
        p_developer_id,
        'Super Puzzle Quest',
        'super-puzzle-quest',
        'A challenging puzzle game with hundreds of levels',
        'https://example.com/super-puzzle-quest'
    )
    RETURNING id INTO v_project_id;

    -- Create iOS batch
    INSERT INTO code_batches (project_id, name, platform, status, total_codes, expires_at)
    VALUES (
        v_project_id,
        'iOS Launch Codes',
        'ios',
        'completed',
        50,
        NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_batch_ios_id;

    -- Create Android batch
    INSERT INTO code_batches (project_id, name, platform, status, total_codes, expires_at)
    VALUES (
        v_project_id,
        'Android Launch Codes',
        'android',
        'completed',
        50,
        NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_batch_android_id;

    -- Create Steam batch
    INSERT INTO code_batches (project_id, name, platform, status, total_codes, expires_at)
    VALUES (
        v_project_id,
        'Steam Review Keys',
        'steam',
        'completed',
        25,
        NOW() + INTERVAL '60 days'
    )
    RETURNING id INTO v_batch_steam_id;

    -- Generate iOS codes
    INSERT INTO codes (batch_id, code_value)
    SELECT v_batch_ios_id, 'IOS-' || LPAD(generate_series::TEXT, 4, '0') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6))
    FROM generate_series(1, 50);

    -- Generate Android codes
    INSERT INTO codes (batch_id, code_value)
    SELECT v_batch_android_id, 'AND-' || LPAD(generate_series::TEXT, 4, '0') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6))
    FROM generate_series(1, 50);

    -- Generate Steam codes (format: XXXXX-XXXXX-XXXXX)
    INSERT INTO codes (batch_id, code_value)
    SELECT v_batch_steam_id,
        UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5)) || '-' ||
        UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5)) || '-' ||
        UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5))
    FROM generate_series(1, 25);

    -- Mark some codes as used (for demo purposes)
    UPDATE codes
    SET is_used = true, used_at = NOW() - (RANDOM() * INTERVAL '7 days')
    WHERE batch_id = v_batch_ios_id
      AND id IN (SELECT id FROM codes WHERE batch_id = v_batch_ios_id ORDER BY RANDOM() LIMIT 12);

    UPDATE codes
    SET is_used = true, used_at = NOW() - (RANDOM() * INTERVAL '7 days')
    WHERE batch_id = v_batch_android_id
      AND id IN (SELECT id FROM codes WHERE batch_id = v_batch_android_id ORDER BY RANDOM() LIMIT 8);

    UPDATE codes
    SET is_used = true, used_at = NOW() - (RANDOM() * INTERVAL '14 days')
    WHERE batch_id = v_batch_steam_id
      AND id IN (SELECT id FROM codes WHERE batch_id = v_batch_steam_id ORDER BY RANDOM() LIMIT 5);

    -- Update batch statistics
    UPDATE code_batches SET used_codes = 12 WHERE id = v_batch_ios_id;
    UPDATE code_batches SET used_codes = 8 WHERE id = v_batch_android_id;
    UPDATE code_batches SET used_codes = 5 WHERE id = v_batch_steam_id;

    RETURN 'Sample data generated successfully for project: Super Puzzle Quest';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_sample_data IS 'Generates sample project, batches, and codes for testing. Call with developer_id after auth signup.';
