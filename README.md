# ReceAI v2

ReceAI v2 is the clean restart of the platform on top of Next.js, Supabase, and Stripe-aligned boundaries. The current repo now contains real workspace-scoped business modules, invoice delivery flows, receipts, bank reconciliation, and reporting, while still keeping billing and other advanced boundaries intentionally limited.

## Stack

- Next.js App Router
- TypeScript
- Supabase auth, storage, and Postgres
- Stripe-aligned billing boundary
- Platform-controlled invoice email sending

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Environment Setup

Copy `.env.example` into your local env file and provide real values for:

- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `PLATFORM_EMAIL_FROM_EMAIL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER_MONTHLY`
- `STRIPE_PRICE_GROWTH_MONTHLY`

Workspace reply-to email is configured in the app under Settings, not via env.

## Deployment Readiness

- In-app runtime readiness is available at `/settings/deployment`
- The release checklist and acceptance checklist live in [`docs/RELEASE_READINESS.md`](/Users/bptravel/.openclaw/workspace/projects/receai-platform/docs/RELEASE_READINESS.md)
- Missing or placeholder env values now fail with operator-facing runtime messages instead of silent boundary failures

## Current Scope

ReceAI v2 currently includes:

- Auth and workspace bootstrap
- Workspace settings and members
- Customers
- Revenue drafts with line items
- Invoice drafts, finalization, export, delivery, and payment tracking
- Costs and receipt intake/posting
- Bank imports and manual reconciliation
- Profit summary reporting

## Deliberate Non-Goals Right Now

- Custom SMTP or customer-owned provider binding
- Direct bank API integrations
- Automated OCR/provider switching
- Advanced accounting/export
- Legacy v1 business logic carry-over
