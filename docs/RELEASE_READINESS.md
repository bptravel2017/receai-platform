# Release Readiness

Use `/settings/deployment` in the signed-in app as the live runtime audit. Use this document as the operator runbook before launch.

## Release Checklist

1. Apply every SQL migration in `supabase/migrations`.
2. Confirm the `receipt-intake` storage bucket exists and is accessible by the expected server-side flows.
3. Set real values for:
   - `NEXT_PUBLIC_APP_URL`
   - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `PLATFORM_EMAIL_FROM_EMAIL`
   - optional `PLATFORM_EMAIL_FROM_NAME`
   - optional `PLATFORM_EMAIL_API_BASE_URL`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_STARTER_MONTHLY`
   - `STRIPE_PRICE_GROWTH_MONTHLY`
4. Configure Supabase auth redirect URLs for the deployed origin.
5. Verify the platform sender domain with the email provider.
6. Set a workspace reply-to email in workspace settings for any workspace that will send invoices.
7. Create and verify live Stripe products, prices, and webhook endpoint configuration before enabling real billing work.
8. Build and run the production bundle with production env values, not only `npm run dev`.

## Manual Acceptance Checklist

1. Auth and bootstrap
   - Sign up, confirm email, sign in, sign out.
   - Verify first-login workspace bootstrap and missing-profile/workspace recovery behavior.
2. Workspace administration
   - Verify profile settings, workspace settings, reply-to email, members list, and invite acceptance.
3. Customers
   - Create, edit, and search customers.
4. Revenue
   - Create and edit revenue drafts.
   - Add, edit, remove, and reorder revenue line items.
5. Invoices
   - Generate invoice drafts from revenue.
   - Edit draft fields.
   - Finalize and confirm numbering format `INV-YYYYMMDD-001`.
   - Open print/export rendering and save a browser PDF.
   - Run send, resend, and reminder flows and verify delivery history.
6. Payments and bank reconciliation
   - Record manual payments.
   - Import bank transactions.
   - Reconcile and unreconcile bank transactions and confirm invoice payment snapshots recalculate.
7. Costs and receipts
   - Create company and group-linked cost records.
   - Create receipt intake records.
   - Run receipt parser scaffold.
   - Review parsed candidates, classify, and post into formal costs.
8. Reporting
   - Verify `/profit` totals and breakdowns match the current workspace data.

## Explicitly Not Covered By This Checklist

- Customer-owned SMTP/provider integration
- Direct bank API integration
- Automated OCR confidence workflows
- Full accounting export and ledger behavior
