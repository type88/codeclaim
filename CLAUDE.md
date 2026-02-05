# Project Genesis: CodeDrop Platform

**One-liner:** A platform where developers upload bulk promo codes and users get the right code automatically based on their platform, with real-time tracking of used vs unused codes.

## Core Value Proposition

**For developers:** Stop manually distributing promo codes through spreadsheets, Discord, and Reddit. Upload once, let users get codes automatically, track everything in real-time.

**For users:** No more hunting through comment threads for working codes. Get a fresh, platform-specific code instantly without the frustration of "already used" codes.

**Unfair advantage:** First-mover advantage in a specific niche that existing coupon platforms don't address - they focus on e-commerce, we focus on app/software promo codes.

## Market Context

- **Market size:** $30.8B low-code platform market (2024), growing at 26.1% CAGR
- **Existing solutions:** Voucherify ($179/month), Coupon Carrier ($49/month), Impact ($30/month) - all focused on e-commerce, none solve the developer-specific distribution problem
- **Target users:** Indie developers, small dev teams launching apps/features who currently use manual distribution methods
- **Business model:** TBD - exploring freemium given budget constraints

## Tech Stack Decisions

### Backend: Supabase
**Why:** All-in-one backend platform with PostgreSQL, authentication, real-time subscriptions, and storage. Eliminates need for separate backend server, reduces complexity, generous free tier for MVP.

### Database: Supabase PostgreSQL
**Why:** ACID compliance for code tracking, excellent performance for read-heavy workloads, built-in Row Level Security (RLS) for authorization, real-time subscriptions out of the box.

### Frontend: Next.js 14 + React
**Why:** App Router for modern patterns, API routes for server-side logic when needed, excellent TypeScript support, seamless Vercel deployment.

### Authentication: Supabase Auth
**Why:** Built-in OAuth for GitHub/Google (developers expect this), integrates with RLS policies, handles session management, email verification, and password reset.

### Real-time: Supabase Realtime
**Why:** Native PostgreSQL change notifications, no WebSocket server to manage, automatic reconnection handling, integrates with RLS for secure subscriptions.

### File Storage: Supabase Storage
**Why:** Built-in file uploads for CSV imports, integrates with auth, supports large files, CDN-backed delivery.

### Hosting: Vercel (Frontend) + Supabase (Backend)
**Why:** Free tiers for MVP, automatic deployments, scales easily, minimal DevOps overhead, edge functions available if needed.

## Key Architectural Decisions

### Code Distribution Strategy
- **Pool-based allocation:** Pre-upload codes into pools, assign on-demand to prevent race conditions
- **Platform detection:** Auto-detect user platform (iOS/Android/Steam) via user agent + optional manual selection
- **Real-time tracking:** Supabase Realtime subscriptions for live usage statistics on developer dashboard
- **Atomic operations:** PostgreSQL functions for race-condition-free code allocation

### Data Model
```sql
-- Core entities (managed in Supabase)
developers (id, auth_user_id, email, display_name, created_at)
projects (id, developer_id, name, description, slug, created_at)
code_batches (id, project_id, platform, name, total_codes, used_codes, expires_at)
codes (id, batch_id, code_value, is_used, used_at, redeemer_fingerprint)
platforms (id, name, slug) -- iOS, Android, Steam, Web, etc.
```

### API Design
- Next.js API routes for server-side operations
- Supabase client for direct database access (with RLS)
- Supabase Realtime for live updates
- Rate limiting via Supabase Edge Functions or Vercel middleware
- Platform-specific endpoints: `/api/codes/[platform]`

## File Structure

```
/
├── app/                     # Next.js 14 App Router
│   ├── (auth)/              # Auth routes (login, register)
│   ├── (dashboard)/         # Developer dashboard routes
│   ├── (public)/            # Public code redemption routes
│   ├── api/                 # API routes
│   │   ├── codes/           # Code redemption endpoints
│   │   ├── projects/        # Project management
│   │   └── webhooks/        # Webhook handlers
│   └── layout.tsx           # Root layout with providers
├── components/              # Reusable UI components
│   ├── ui/                  # Shadcn/ui components
│   ├── forms/               # Form components
│   └── dashboard/           # Dashboard-specific components
├── lib/                     # Utilities and configurations
│   ├── supabase/            # Supabase client setup
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   └── middleware.ts    # Auth middleware
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Helper functions
├── supabase/                # Supabase local config
│   ├── migrations/          # Database migrations
│   ├── functions/           # Edge Functions (if needed)
│   └── seed.sql             # Seed data
├── types/                   # TypeScript type definitions
└── docs/                    # Project documentation
```

## Coding Conventions

### JavaScript/TypeScript
- **ESLint + Prettier** for consistency
- **Functional components** with hooks over class components
- **Named exports** over default exports for better refactoring
- **TypeScript strict mode** enabled

### Database
- **Snake_case** for columns, **camelCase** for JavaScript objects
- **Soft deletes** for codes (maintain audit trail)
- **Indexes** on frequently queried fields (platform, is_used, created_at)

### API Responses
```javascript
// Success format
{ success: true, data: {...} }

// Error format  
{ success: false, error: "Human readable message", code: "ERROR_CODE" }
```

## What's Decided vs Open Questions

### ✅ Decided
- Core user flow: Developer uploads → User requests → Auto-assignment
- MVP scope: Basic code distribution + tracking dashboard
- Tech stack: Next.js 14, Supabase (PostgreSQL, Auth, Realtime, Storage)
- Platform detection via user agent + manual override
- Authentication via Supabase Auth (GitHub/Google OAuth)
- Authorization via Row Level Security (RLS) policies
- Real-time updates via Supabase Realtime subscriptions

### ❓ Still Open
- **Monetization model:** Freemium vs transaction-based vs subscription
- **Code expiration:** Time-based vs usage-based expiration
- **Analytics depth:** Basic tracking vs detailed user behavior
- **Fraud prevention:** IP-based limiting vs device fingerprinting
- **Platform expansion:** Web codes? Console codes? Focus on mobile first?

## Immediate Next Steps

1. **Set up Supabase project** (create project, configure auth providers)
2. **Create database schema** (migrations for all tables, RLS policies)
3. **Initialize Next.js 14 project** (App Router, Supabase client setup)
4. **Implement core API endpoints** (`POST /projects`, `GET /api/codes/[platform]`)
5. **Build minimal UI** (upload form for developers, request form for users)
6. **Add real-time tracking** (Supabase Realtime subscriptions for dashboard)
7. **Deploy MVP** (Vercel + Supabase) and test with 3-5 developers

## Key Documentation

- **[PRD.md](./PRD.md)** - Full product requirements and user stories
- **[RESEARCH.md](./RESEARCH.md)** - Market research and competitive analysis
- **[API.md](./API.md)** - API documentation and endpoints
- **[DATABASE.md](./DATABASE.md)** - Schema design and queries

## Success Metrics for MVP

- **Developer adoption:** 10+ developers upload code campaigns
- **User engagement:** 100+ codes distributed automatically  
- **System reliability:** <1% error rate on code requests
- **Performance:** <500ms response time for code allocation

---

**Remember:** This is about solving a specific pain point (manual promo code distribution) for a specific audience (app developers). Stay focused, ship fast, validate the core value proposition before adding complexity.