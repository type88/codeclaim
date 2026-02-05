# CodeClaim Platform - Setup Guide

This guide walks you through setting up the CodeClaim platform for local development and production deployment.

## Prerequisites

- Node.js 18+ installed
- A Supabase account ([supabase.com](https://supabase.com))
- A Vercel account for deployment (optional)

## 1. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Project name**: CodeClaim (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest to your users
4. Click "Create new project" and wait for provisioning

### Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Run the migrations in order:

   **First, run `00001_initial_schema.sql`:**
   - Copy the contents of `supabase/migrations/00001_initial_schema.sql`
   - Paste into the SQL Editor
   - Click "Run"

   **Then, run `00002_row_level_security.sql`:**
   - Copy the contents of `supabase/migrations/00002_row_level_security.sql`
   - Paste into the SQL Editor
   - Click "Run"

### Configure Authentication Providers

1. Go to **Authentication** > **Providers**
2. Enable the providers you want:

   **GitHub:**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create a new OAuth App
   - Set Homepage URL to your domain (or `http://localhost:3000` for dev)
   - Set Authorization callback URL to `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

   **Google:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

### Get Your API Keys

1. Go to **Settings** > **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## 2. Local Development Setup

### Install Dependencies

```bash
cd promo-codes
npm install
```

### Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 3. Production Deployment (Vercel)

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain)
5. Deploy!

### Update OAuth Redirect URLs

After deployment, update your OAuth providers:

1. **GitHub**: Add `https://your-domain.vercel.app` to Homepage URL
2. **Google**: Add `https://YOUR_PROJECT.supabase.co/auth/v1/callback` to authorized redirects
3. **Supabase**: Go to **Authentication** > **URL Configuration**:
   - Add your Vercel domain to "Redirect URLs"

## Project Structure

```
promo-codes/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth pages (login, register)
│   ├── (dashboard)/          # Protected dashboard pages
│   ├── (public)/             # Public code redemption
│   ├── api/                  # API routes
│   └── auth/                 # Auth callbacks
├── lib/
│   ├── supabase/             # Supabase client setup
│   └── hooks/                # Custom React hooks
├── supabase/
│   ├── migrations/           # Database migrations
│   └── seed.sql              # Sample data
├── types/                    # TypeScript definitions
└── components/               # React components
```

## Key Features

- **Authentication**: Email/password + OAuth (GitHub, Google)
- **Project Management**: Create and manage promo code projects
- **Bulk Code Upload**: Add codes via form (CSV coming soon)
- **Platform Detection**: Auto-detect user platform for code distribution
- **Real-time Updates**: Live dashboard updates via Supabase Realtime
- **Row Level Security**: Secure multi-tenant data access

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Soft delete project

### Batches
- `GET /api/projects/[id]/batches` - List batches
- `POST /api/projects/[id]/batches` - Create batch with codes

### Code Redemption
- `GET /api/redeem/[slug]` - Get project info & available platforms
- `POST /api/redeem/[slug]` - Redeem a code

## Troubleshooting

### "Project not found" on redemption
- Check that the project slug matches
- Ensure the project is active (`is_active = true`)
- Verify there are codes available for the requested platform

### OAuth not working
- Verify callback URLs match exactly
- Check that providers are enabled in Supabase
- Ensure environment variables are set correctly

### Real-time not updating
- Check browser console for WebSocket errors
- Verify RLS policies allow the user to see the data
- Ensure tables are added to `supabase_realtime` publication

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Review the [CLAUDE.md](./CLAUDE.md) for project context
