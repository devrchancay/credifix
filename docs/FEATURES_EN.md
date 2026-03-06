# Credit Helper — Feature Documentation

**Product:** Credit Helper by Florida Hitech Services INC
**Type:** AI-powered Credit Analysis SaaS Platform
**Version:** 1.0.0

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [User Features](#user-features)
3. [Admin Features](#admin-features)
4. [Security & Infrastructure](#security--infrastructure)
5. [External Services](#external-services)
6. [API Reference](#api-reference)
7. [Environment Variables](#environment-variables)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui |
| Backend | Next.js serverless functions (Vercel) |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| Authentication | Supabase Auth (email/password) |
| AI Engine | OpenAI API (GPT-4o, GPT-4o-mini), AI SDK v6, Vector Store (RAG) |
| Payments | Stripe (subscriptions, webhooks, customer portal) |
| Rate Limiting | Upstash Redis (sliding window) |
| Internationalization | next-intl (English, Spanish) |
| Deployment | Vercel |

---

## User Features

### 1. Authentication & Account Management

- **Sign-up / Sign-in** with email and password
- **Password reset** via email link
- **Profile management** — update name and personal information
- **Account settings** — preferences and password changes
- **Automatic session management** — sessions refresh transparently via middleware
- **Bilingual interface** — full support for English and Spanish

### 2. AI Credit Analysis Chat (Core Feature)

The central feature of Credit Helper: an AI-powered chat assistant specialized in credit analysis.

**Capabilities:**
- Real-time streaming responses
- Credit report analysis and interpretation
- Personalized recommendations to improve credit scores
- Explanation of credit scoring factors (payment history, utilization, credit age, new accounts, credit mix)
- Credit repair strategy guidance
- Education on consumer rights (FCRA, FDCPA)
- Bilingual responses — the assistant responds in the user's language

**File Attachments:**
- Supported formats: PDF, DOCX, XLSX, CSV, TXT
- Up to 5 files per message, 10 MB each
- Automatic text extraction and analysis
- Magic byte validation for security

**Conversation Management:**
- Full conversation history with persistence
- Search across all past conversations
- Create, switch, and delete conversations
- Automatic title generation

**Multi-Agent System:**
- **Basic Agent** (free tier) — GPT-4o-mini, general credit guidance
- **Premium Agent** (paid tiers) — GPT-4o, advanced analysis, dispute letter drafting, personalized action plans
- Agents are automatically available based on the user's subscription plan

**AI Tools:**
- **Web search** — scoped to US credit topics (credit bureaus, FCRA, debt management, credit repair)
- **Knowledge base search** — searches admin-uploaded documents for accurate, sourced answers

### 3. Subscription Plans & Billing

Three subscription tiers managed through Stripe:

| Plan | Price | Includes |
|------|-------|----------|
| Free | $0 | Basic agent, community features |
| Pro | $19/mo or $190/yr | Premium agents, priority support, API access |
| Enterprise | $99/mo or $990/yr | Custom support, SLA, advanced features |

**Billing features:**
- Stripe Checkout for secure payments
- Stripe Customer Portal for self-service management (update payment method, cancel, view invoices)
- Automatic subscription sync via webhooks
- Plan upgrade and downgrade support
- Trial period support

### 4. Credits System

A virtual currency system that rewards user engagement:

- **Earn credits** through the referral program
- **Redeem credits** as discounts on subscription payments
- Default rate: 1 credit = $0.25 (configurable by admin)
- Maximum discount: 75% of subscription price (configurable)
- **Auto-redeem** option — automatically apply credits on each billing cycle
- Manual redemption with preview of discount amount
- Full transaction history tracking

### 5. Referral Program

- Each user receives a unique referral code
- Share via link — referred users see a personalized invite page
- **Referrer earns credits** when the referred user signs up
- **Referred user receives bonus credits** on registration
- Referral dashboard showing:
  - Total, completed, and pending referrals
  - Credit balance (earned, spent, available)
  - Referral history with dates and status

### 6. User Dashboard

- Welcome message with user's name
- Current plan and subscription status
- Account information (ID, email)
- Active/inactive status indicator
- Upgrade prompt for free-tier users

### 7. Pricing Page

- Public-facing pricing comparison
- Monthly/yearly toggle
- Feature comparison across plans
- "Popular" badge highlighting
- Direct checkout integration

---

## Admin Features

### 1. User Management

- View all registered users with search and filtering
- User details: name, email, role, join date
- Assign roles (user / admin)
- Paginated user list

### 2. AI Agent Management

- Create, edit, and delete AI agents
- Per-agent configuration:
  - Name, slug, and description
  - Tier assignment (basic / premium)
  - System prompt (full text editor)
  - Model selection (GPT-4o, GPT-4o-mini, o-series)
  - Temperature, Top P, and Max Tokens tuning
  - Active/inactive toggle
- Map agents to subscription plans (controls which plans unlock which agents)

### 3. Knowledge Base Management

- Upload documents to build the AI's knowledge base (RAG)
- Supported formats: PDF, DOCX, XLSX, CSV, TXT, MD, JSON, HTML
- Per-agent knowledge base isolation
- Document status tracking (processing / ready / failed)
- Delete documents from the knowledge base
- Powered by OpenAI Vector Store

### 4. Plan Management

- Create and edit subscription plans
- Configure per plan:
  - Name, slug, description
  - Monthly and yearly Stripe price IDs
  - Feature list
  - Usage limits
  - Popular flag and sort order
  - Active/inactive toggle
  - Assigned AI agents
- View and link Stripe prices

### 5. Credit Configuration

- Set credit value in cents
- Set maximum discount percentage
- Enable/disable credit redemption globally

### 6. Billing Sync

- Manual synchronization of Stripe subscription data
- Recovery tool for webhook delivery failures

### 7. Audit Logging

All admin actions are logged for compliance:
- Agent, plan, and config changes
- User role modifications
- Knowledge base uploads
- Billing syncs
- Each log includes: user ID, action type, resource, details, IP address, and timestamp

---

## Security & Infrastructure

### Security Headers
- Content-Security-Policy (CSP) with strict directives
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS) with preload
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy restrictions (camera, microphone, geolocation)

### Authentication & Authorization
- Supabase Auth with secure session cookies
- Role-Based Access Control (RBAC): admin and user roles
- Row-Level Security (RLS) on all database tables
- Protected routes with automatic redirect
- API middleware authentication on all endpoints

### Rate Limiting (Upstash Redis)
| Endpoint Type | Limit |
|---------------|-------|
| Auth | 10 requests/min per IP |
| Chat | 30 requests/min per user |
| File Upload | 20 requests/min per user |
| Public | 15 requests/min per IP |
| Billing | 10 requests/min per user |

Fail-open: if Redis is unavailable, requests are allowed through.

### Input Validation
- Zod schema validation on all API inputs
- File size and type validation with magic byte checking
- Message history capped at 100 messages per request
- Safe redirect URL validation

### Pre-commit Security
- Gitleaks pre-commit hook to prevent secret leaks

---

## External Services

The following external services are required:

### 1. Supabase
- **Purpose:** Database (PostgreSQL), authentication, file storage
- **Required:** Project URL, anon key, service role key
- **Setup:** Create project, run migrations, configure auth providers

### 2. Stripe
- **Purpose:** Subscription billing, checkout, customer portal, webhooks
- **Required:** Secret key, publishable key, webhook secret, price IDs
- **Setup:** Create products/prices, configure webhook endpoint (`/api/webhooks/stripe`)
- **Webhook events to register:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.created`
  - `invoice.payment_failed`

### 3. OpenAI
- **Purpose:** AI chat models, vector store for knowledge base, web search
- **Required:** API key
- **Models used:** GPT-4o, GPT-4o-mini (configurable per agent)

### 4. Upstash
- **Purpose:** Redis-based rate limiting
- **Required:** REST URL and token
- **Setup:** Create a Redis database on Upstash

### 5. Vercel
- **Purpose:** Hosting and deployment
- **Setup:** Connect GitHub repository, set environment variables

---

## API Reference

### Public API (`/api/v1/`)

Authentication: Bearer token or Supabase session cookie.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat` | Stream AI chat response |
| POST | `/api/v1/billing/checkout` | Create Stripe checkout session |
| POST | `/api/v1/billing/portal` | Create customer portal link |
| GET | `/api/v1/billing/subscription` | Get active subscription |
| GET | `/api/v1/credits/preview` | Preview credit redemption |
| POST | `/api/v1/credits/redeem` | Redeem credits for discount |
| GET | `/api/v1/credits/auto-redeem` | Get auto-redeem setting |
| PUT | `/api/v1/credits/auto-redeem` | Toggle auto-redeem |
| GET | `/api/v1/referral/code` | Get user's referral code |
| GET | `/api/v1/referral/stats` | Get referral statistics |
| GET | `/api/v1/referral/validate` | Validate a referral code |
| POST | `/api/v1/referral/register` | Register referral at signup |
| POST | `/api/v1/referral/track` | Track referral visit |
| POST | `/api/v1/files/process` | Process uploaded files |
| POST | `/api/v1/transcribe` | Transcribe audio |
| GET | `/api/v1/plans` | List active plans |
| GET | `/api/v1/agents` | List available agents |

### Admin API (`/api/admin/`)

Authentication: Admin role required.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/agents` | List / create agents |
| GET/PUT/DELETE | `/api/admin/agents/[id]` | Get / update / delete agent |
| POST | `/api/admin/agents/[id]/knowledge-base/init` | Initialize knowledge base |
| GET/POST | `/api/admin/agents/[id]/knowledge-base` | List / upload files |
| DELETE | `/api/admin/agents/[id]/knowledge-base/[fileId]` | Delete file |
| GET/POST | `/api/admin/plans` | List / create plans |
| PATCH/DELETE | `/api/admin/plans/[id]` | Update / delete plan |
| GET | `/api/admin/plans/stripe-prices` | List Stripe prices |
| GET/PUT | `/api/admin/ai-config` | Get / update AI config |
| GET/PUT | `/api/admin/credit-config` | Get / update credit config |
| GET | `/api/admin/users` | List users |
| PATCH | `/api/admin/users/[id]/role` | Update user role |
| POST | `/api/admin/billing/sync` | Sync Stripe subscriptions |

### API Documentation UI

Interactive Swagger UI available at `/docs`.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `OPENAI_API_KEY` | OpenAI API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Base URL of the application |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

---

## Feature Summary

| Feature | Available To | Status |
|---------|-------------|--------|
| Email/password authentication | All users | Live |
| Password reset | All users | Live |
| Bilingual interface (EN/ES) | All users | Live |
| AI credit analysis chat | All users | Live |
| File attachments in chat | All users | Live |
| Conversation history & search | All users | Live |
| Basic AI agent | Free users | Live |
| Premium AI agent | Pro / Enterprise | Live |
| Web search in chat | All users | Live |
| Knowledge base (RAG) | All users | Live |
| Stripe subscriptions | All users | Live |
| Customer billing portal | Paid users | Live |
| Credits system | All users | Live |
| Auto-redeem credits | All users | Live |
| Referral program | All users | Live |
| User dashboard | All users | Live |
| Admin: user management | Admins | Live |
| Admin: agent management | Admins | Live |
| Admin: knowledge base | Admins | Live |
| Admin: plan management | Admins | Live |
| Admin: credit config | Admins | Live |
| Admin: audit logging | Admins | Live |
| Rate limiting | System | Live |
| Security headers (CSP, HSTS) | System | Live |
| Row-Level Security (RLS) | System | Live |
| API documentation (Swagger) | Developers | Live |

---

*Document generated for Florida Hitech Services INC — Credit Helper v1.0.0*
