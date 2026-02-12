# Project Status -- SudoGrab

Last updated: 2026-02-12

## Current State

All 6 phases of the feature expansion plan are complete. The platform has grown from a basic code distribution tool to a full-featured promotional platform with embeddable widgets, webhooks, email notifications, QR codes, SVG badges, public stats pages, campaign templates, expiring links, multi-code bundles, and 24h ephemeral PII data purge. TypeScript compiles clean, Next.js build passes successfully.

## What Was Done Last Session

### Phase 2D: Expiring Links
- Created `supabase/migrations/00008_expiring_links.sql` -- adds `expires_at` to projects
- Added date picker to `components/dashboard/PromotionalSettings.tsx`
- Redemption page shows countdown timer or "Campaign Ended" state

### Phase 2A: Email Notifications
- Created `supabase/migrations/00009_notifications.sql` -- notification preferences + notification_logs table with dedup
- Created `check_notification_conditions()` RPC for batch_low, batch_empty, milestones, campaign_expiring
- Deployed `check-notifications` Edge Function, pg_cron scheduled every 6 hours
- Created `components/dashboard/NotificationBell.tsx` with polling dropdown
- Created API routes: `app/api/notifications/route.ts`, `[id]/route.ts`, `read-all/route.ts`

### Phase 2B: Webhooks
- Created `supabase/migrations/00010_webhooks.sql` -- webhooks + webhook_deliveries tables
- Deployed `send-webhook` Edge Function with HMAC-SHA256 signing
- Created `components/dashboard/WebhookSettings.tsx` with CRUD, test, delivery log
- Created API routes: `app/api/projects/[id]/webhooks/` (CRUD + test + deliveries)
- Redemption API fires `code_redeemed` webhook asynchronously

### Phase 3A: Embeddable Widget
- Created `app/(public)/widget/[slug]/page.tsx` -- minimal iframe-friendly page
- Created `components/dashboard/ShareSettings.tsx` with embed code generator

### Phase 3B: Shareable Analytics & SVG Badges
- Created `app/api/badge/[slug]/route.ts` -- GitHub-style shield badge (5-min cache)
- Created `app/(public)/stats/[slug]/page.tsx` -- public aggregate stats page
- Added badge snippets (Markdown/HTML) to ShareSettings

### Phase 3C: QR Codes
- Added QR code generation to ShareSettings using `qrcode` npm package
- Canvas preview, size selector (256/512/1024px), PNG and SVG download

### Phase 4: 24h Ephemeral Data Purge
- Created `supabase/migrations/00011_ephemeral_data.sql` -- `purge_old_pii_data()` function
- Nullifies redeemer PII (fingerprint, IP hash, user agent, auth user ID) after 24h
- pg_cron scheduled daily at 3 AM UTC

### Phase 5: Multi-Code Bundles
- Created `supabase/migrations/00012_bundles.sql` -- `enable_bundles` column, `bundle_redemptions` table, `redeem_bundle()` RPC
- Created `app/api/redeem/[slug]/bundle/route.ts` -- bundle redemption endpoint
- Updated `app/(public)/redeem/[slug]/page.tsx`:
  - Checkbox multi-select when bundles enabled
  - Bundle redeem handler calling bundle endpoint
  - Multi-code success screen with per-code copy buttons
  - Dynamic CTA: "Get 3 Codes" etc.
- Updated `app/api/redeem/[slug]/route.ts` GET to return `enable_bundles`
- Added `enable_bundles` toggle to PromotionalSettings
- Updated PATCH API to accept `enable_bundles`

## What's Next

- [ ] End-to-end testing of all features with live data
- [ ] Consider monetization model (freemium tiers)
- [ ] Add rate limiting / fraud prevention (fingerprint dedup per project)
- [ ] Open Graph meta tags for social card previews on stats pages
- [ ] Consider adding `bundle_redeemed` webhook event
- [ ] Widget CORS headers in `next.config.mjs` if embedding on external domains

## Known Issues / Gotchas

- Supabase types don't auto-match the schema yet -- `as any` casts used on `.from()` calls to work around TypeScript errors with new tables
- The `check-notifications` Edge Function uses Supabase Auth email which depends on having email templates configured in the Supabase dashboard
- pg_cron jobs (`check-notifications` every 6h, `purge-pii-data` daily 3AM UTC) are running on the live database
- Widget page uses inline styles only (no Tailwind) for iframe CSS isolation

## Key Files

### Migrations (applied to Supabase project `cqlehugzvvaqtbxaqsms`)
- `supabase/migrations/00008_expiring_links.sql`
- `supabase/migrations/00009_notifications.sql`
- `supabase/migrations/00010_webhooks.sql`
- `supabase/migrations/00011_ephemeral_data.sql`
- `supabase/migrations/00012_bundles.sql`

### Core Modified Files
- `app/(public)/redeem/[slug]/page.tsx` -- redemption page (bundles, expiry, promotional)
- `app/api/redeem/[slug]/route.ts` -- redemption API (expiry, webhooks, bundles flag)
- `app/api/projects/[id]/route.ts` -- PATCH now handles all new fields
- `app/(dashboard)/projects/[id]/page.tsx` -- project detail with all tabs
- `components/dashboard/PromotionalSettings.tsx` -- all settings including bundles toggle

### New Files
- `app/api/redeem/[slug]/bundle/route.ts`
- `app/api/notifications/route.ts` + `[id]/route.ts` + `read-all/route.ts`
- `app/api/projects/[id]/webhooks/route.ts` + `[webhookId]/route.ts` + `test/route.ts` + `deliveries/route.ts`
- `app/api/badge/[slug]/route.ts`
- `app/(public)/widget/[slug]/page.tsx`
- `app/(public)/stats/[slug]/page.tsx`
- `components/dashboard/NotificationBell.tsx`
- `components/dashboard/WebhookSettings.tsx`
- `components/dashboard/ShareSettings.tsx`
