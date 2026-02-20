# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run lint             # Run ESLint
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run tests with interactive UI
npm run db:generate-types # Generate Supabase TypeScript types
```

## Architecture Overview

This is a SaaS boilerplate built with Next.js 16 App Router, featuring multi-tenant architecture with authentication, payments, and internationalization.

### Core Stack
- **Auth**: Supabase Auth (email/password, session cookies, native RLS integration)
- **Database**: Supabase with Row-Level Security
- **Payments**: Stripe (subscriptions with webhook sync)
- **i18n**: next-intl (en, es locales)
- **UI**: shadcn/ui + Tailwind CSS v4

### Route Structure

```
app/
├── [locale]/(marketing)/     # Public pages (/, /pricing, /about)
├── [locale]/(auth)/          # Sign-in/sign-up (custom forms)
├── [locale]/(dashboard)/     # Protected routes (require auth)
├── api/v1/billing/           # REST API (checkout, portal, subscription)
├── api/webhooks/             # Stripe webhooks
└── docs/                     # Swagger UI (/docs)
```

### Authentication Flow

1. Supabase Auth handles sign-in/sign-up (email/password)
2. DB trigger (`handle_new_user`) auto-creates `profiles` row on sign-up
3. Middleware refreshes session and protects routes with i18n
4. Roles stored in `profiles.role` column (admin, user)

```typescript
// Check roles in server components/API routes
import { isAdmin, getUserRole, hasRole } from "@/lib/roles";

// Client-side auth context
import { useAuth } from "@/components/providers/auth-provider";
import { useUser } from "@/hooks/use-user";
```

### Database Schema (Supabase)

- `profiles` - User data (auto-created via DB trigger, includes `role` column)
- `subscriptions` - Stripe subscription state
- `organizations` - Multi-tenant orgs
- `organization_memberships` - Org roles (owner, admin, member)
- `referral_codes`, `referrals`, `credit_transactions`, `user_credits` - Referral system

All user IDs are UUID type, linked to `auth.users(id)` with `ON DELETE CASCADE`.

### Billing Integration

Plans managed in `plans` table (seeded via migration).

API endpoints return URLs instead of redirecting (for mobile/external consumption):
- `POST /api/v1/billing/checkout` → `{ checkoutUrl, sessionId }`
- `POST /api/v1/billing/portal` → `{ portalUrl }`
- `GET /api/v1/billing/subscription` → `{ subscription }`

Auth: Cookie (web) or Bearer token (external clients)

### State Management

- **Zustand** (`stores/`): UI preferences, persisted to localStorage
- **Hooks** (`hooks/`): `useSubscription()` for billing data, `useUser()` for profile

### Middleware Logic

`middleware.ts` combines Supabase Auth + next-intl:
- `/api/*` and `/docs` skip i18n
- Public routes: `/`, `/pricing`, `/about`, auth pages
- Protected routes redirect to sign-in if no session

### Key Patterns

**API Routes**: Use `lib/api/middleware.ts` for auth, `lib/api/errors.ts` for responses, Zod schemas in `lib/api/validation.ts`

**Supabase Clients**:
- `lib/supabase/server.ts` - Server components (uses cookies for session)
- `lib/supabase/client.ts` - Client components
- `lib/supabase/admin.ts` - Webhooks/admin operations (service role)

**Auth Provider**: `components/providers/auth-provider.tsx` wraps the app, provides `useAuth()` hook

**Components**: shadcn/ui in `components/ui/`, role protection via `components/auth/require-role.tsx`

### Environment Variables

Required (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` - Database & Auth
- `STRIPE_*` - Payments and price IDs
- `NEXT_PUBLIC_APP_URL` - Base URL for redirects
