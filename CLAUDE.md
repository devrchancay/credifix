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
- **Auth**: Clerk (session + JWT for Supabase RLS)
- **Database**: Supabase with Row-Level Security
- **Payments**: Stripe (subscriptions with webhook sync)
- **i18n**: next-intl (en, es locales)
- **UI**: shadcn/ui + Tailwind CSS v4

### Route Structure

```
app/
├── [locale]/(marketing)/     # Public pages (/, /pricing, /about)
├── [locale]/(auth)/          # Sign-in/sign-up (Clerk components)
├── [locale]/(dashboard)/     # Protected routes (require auth)
├── api/v1/billing/           # REST API (checkout, portal, subscription)
├── api/webhooks/             # Clerk & Stripe webhooks
└── docs/                     # Swagger UI (/docs)
```

### Authentication Flow

1. Clerk handles sign-in/sign-up
2. Clerk webhook (`/api/webhooks/clerk`) syncs user to Supabase `profiles` table
3. Middleware protects routes and applies i18n
4. Roles stored in Clerk `publicMetadata` (admin, user)

```typescript
// Check roles in server components/API routes
import { isAdmin, getUserRole, hasRole } from "@/lib/roles";
```

### Database Schema (Supabase)

- `profiles` - User data synced from Clerk
- `subscriptions` - Stripe subscription state
- `organizations` - Multi-tenant orgs
- `organization_memberships` - Org roles (owner, admin, member)

### Billing Integration

Plans defined in `lib/stripe/config.ts`: Free, Pro ($19/mo), Enterprise ($99/mo)

API endpoints return URLs instead of redirecting (for mobile/external consumption):
- `POST /api/v1/billing/checkout` → `{ checkoutUrl, sessionId }`
- `POST /api/v1/billing/portal` → `{ portalUrl }`
- `GET /api/v1/billing/subscription` → `{ subscription }`

Auth: Cookie (web) or Bearer token (external clients)

### State Management

- **Zustand** (`stores/`): UI preferences, persisted to localStorage
- **Hooks** (`hooks/`): `useSubscription()` for billing data

### Middleware Logic

`middleware.ts` combines Clerk + next-intl:
- `/api/*` and `/docs` skip i18n
- Public routes: `/`, `/pricing`, `/about`, auth pages, webhooks
- Protected routes trigger `auth.protect()`

### Key Patterns

**API Routes**: Use `lib/api/middleware.ts` for auth, `lib/api/errors.ts` for responses, Zod schemas in `lib/api/validation.ts`

**Supabase Clients**:
- `lib/supabase/server.ts` - Server components (uses Clerk JWT)
- `lib/supabase/client.ts` - Client components
- `lib/supabase/admin.ts` - Webhooks (service role)

**Components**: shadcn/ui in `components/ui/`, role protection via `components/auth/require-role.tsx`

### Environment Variables

Required (see `.env.example`):
- `NEXT_PUBLIC_CLERK_*` / `CLERK_*` - Authentication
- `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_*` - Database
- `STRIPE_*` - Payments and price IDs
- `NEXT_PUBLIC_APP_URL` - Base URL for redirects
