# ReceAI Platform Dev Setup

## Project Path
/Users/bptravel/.openclaw/workspace/projects/receai-platform

## Run App
npm run dev

## Key UI Files
- src/modules/marketing/components/public-homepage.tsx
- src/app/(public)/page.tsx
- src/app/globals.css

## Supabase

Make sure migrations are applied before testing.

If you see:
column workspaces.plan does not exist

Fix:
- run migrations
- confirm correct database

## Stripe

For local development:
- use test keys (sk_test)
- avoid live keys

Required env:
- STRIPE_SECRET_KEY
- STRIPE_PRICE_PRO_MONTHLY
- STRIPE_PRICE_BUSINESS_MONTHLY

## Common Flow

1. Start dev server
2. Open homepage (/)
3. Test dashboard (/dashboard)
4. Test billing (/billing)
