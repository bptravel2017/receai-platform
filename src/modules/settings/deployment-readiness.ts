import { getDeploymentReadinessReport } from "@/lib/env";

export type ReadinessChecklistItem = {
  title: string;
  detail: string;
};

export type ReadinessChecklistSection = {
  title: string;
  items: ReadinessChecklistItem[];
};

export function getReleaseChecklistSections(): ReadinessChecklistSection[] {
  return [
    {
      title: "Apply database changes",
      items: [
        {
          title: "Run all Supabase migrations",
          detail:
            "Apply every migration under `supabase/migrations` in order before the first production deploy.",
        },
        {
          title: "Verify storage buckets and RLS",
          detail:
            "Confirm the `receipt-intake` bucket exists and that receipt, invite, invoice, bank, and cost tables follow the expected workspace-scoped RLS behavior.",
        },
      ],
    },
    {
      title: "Set required environment variables",
      items: [
        {
          title: "App base URL",
          detail:
            "Set `NEXT_PUBLIC_APP_URL` to the real production origin used for auth callbacks, invite links, and operator links.",
        },
        {
          title: "Supabase runtime keys",
          detail:
            "Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. `SUPABASE_URL` can be set explicitly or fall back to the public URL.",
        },
        {
          title: "Platform email sender",
          detail:
            "Set `RESEND_API_KEY`, `PLATFORM_EMAIL_FROM_EMAIL`, optional `PLATFORM_EMAIL_FROM_NAME`, and optional `PLATFORM_EMAIL_API_BASE_URL` before enabling finalized invoice sends.",
        },
        {
          title: "Stripe scaffold boundary",
          detail:
            "Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, and `STRIPE_PRICE_BUSINESS_MONTHLY` before activating real billing.",
        },
      ],
    },
    {
      title: "External service setup",
      items: [
        {
          title: "Supabase auth redirect URLs",
          detail:
            "Register the production callback URL for sign-up confirmation and login redirects.",
        },
        {
          title: "Email provider domain",
          detail:
            "Verify the platform sender domain with the email provider so send attempts do not fail silently.",
        },
        {
          title: "Workspace reply-to process",
          detail:
            "Decide which workspace reply-to addresses operators should configure in workspace settings before live invoice sending.",
        },
        {
          title: "Stripe dashboard setup",
          detail:
            "Create live products/prices and configure the live webhook endpoint even though checkout/portal flows remain scaffolded.",
        },
      ],
    },
    {
      title: "Deployment smoke test",
      items: [
        {
          title: "Build and run the production bundle",
          detail:
            "Verify `npm run build` and a production start succeed with the production env set, not only local development.",
        },
        {
          title: "Check protected routes",
          detail:
            "Confirm the authenticated shell, middleware redirects, and invite/auth callback paths work on the deployed domain.",
        },
        {
          title: "Check printable invoice rendering",
          detail:
            "Open finalized invoice print/export pages on the production domain and save a browser PDF to confirm assets and layout remain intact.",
        },
      ],
    },
  ];
}

export function getAcceptanceChecklistSections(): ReadinessChecklistSection[] {
  return [
    {
      title: "Auth and workspace bootstrap",
      items: [
        {
          title: "Sign-up and sign-in",
          detail:
            "Verify sign-up confirmation, sign-in, sign-out, and protected-route redirects.",
        },
        {
          title: "Workspace bootstrap recovery",
          detail:
            "Verify first-login profile/workspace bootstrap, missing-profile recovery, and the onboarding/bootstrap notices.",
        },
        {
          title: "Profile and workspace settings",
          detail:
            "Verify profile editing, workspace editing, and workspace reply-to email changes.",
        },
      ],
    },
    {
      title: "Core business flows",
      items: [
        {
          title: "Customers",
          detail:
            "Create, edit, and search workspace-scoped customers.",
        },
        {
          title: "Revenue",
          detail:
            "Create and edit revenue drafts, including line-item add/edit/remove/reorder and customer linkage.",
        },
        {
          title: "Invoices",
          detail:
            "Generate invoice drafts from revenue, edit draft fields, finalize with numbering, and open the print/export view.",
        },
        {
          title: "Delivery follow-up",
          detail:
            "Run initial send, resend, and reminder actions on finalized invoices and verify delivery history records success or failure honestly.",
        },
        {
          title: "Payments",
          detail:
            "Record manual payments, confirm payment history entries, and verify unpaid/partial/paid snapshot recalculation.",
        },
      ],
    },
    {
      title: "Operations flows",
      items: [
        {
          title: "Bank import and reconciliation",
          detail:
            "Import CSV or manual bank transactions, reconcile to finalized invoices, and unreconcile to confirm payment snapshots reverse correctly.",
        },
        {
          title: "Costs",
          detail:
            "Create and edit company and group-linked cost records, including category selection and future-safe linkage fields.",
        },
        {
          title: "Receipts",
          detail:
            "Create receipt intake records, run the parser scaffold, review parsed candidates, classify, and post into formal costs without auto-posting.",
        },
        {
          title: "Profit summary",
          detail:
            "Verify `/profit` totals and breakdowns reflect persisted revenue, invoice, and cost data for the active workspace.",
        },
      ],
    },
  ];
}

export function getDeploymentReadinessData() {
  return {
    report: getDeploymentReadinessReport(),
    releaseChecklist: getReleaseChecklistSections(),
    acceptanceChecklist: getAcceptanceChecklistSections(),
  };
}
