import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { BillingPortalButton } from "@/modules/billing/components/billing-portal-button";
import { PricingCheckoutButton } from "@/modules/billing/components/pricing-checkout-button";

type BillingPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatPeriodEnd(value: string | null) {
  if (!value) {
    return "Not available yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatPlan(plan: string | null | undefined) {
  if (!plan) {
    return "No plan yet";
  }

  if (plan === "pro") {
    return "Pro";
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "custom") {
    return "Custom";
  }

  return plan[0].toUpperCase() + plan.slice(1);
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const billing = context.billing;
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Billing"
      title="Billing"
      description="Review the current workspace plan and switch plans with the temporary upgrade flow."
    >
      {status ? (
        <p className={status.kind === "error" ? "status status-error" : "status status-message"}>
          {status.text}
        </p>
      ) : null}

      <section className="grid grid-2 billing-summary-grid">
        <article className="surface section stack profit-summary-card">
          <p className="eyebrow">Current plan</p>
          <h2 className="section-title">{formatPlan(context.workspace.plan)}</h2>
          <p className="muted">
            Temporary plan switching is active for this phase.
          </p>
        </article>

        <article className="surface section stack profit-summary-card">
          <p className="eyebrow">Subscription status</p>
          <h2 className="section-title">{billing?.status ?? "not_started"}</h2>
          <p className="muted">
            Current period end: {formatPeriodEnd(billing?.currentPeriodEnd ?? null)}
          </p>
        </article>
      </section>

      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Upgrade</p>
          <h2 className="section-title">Move to Pro or Business</h2>
          <p className="muted">
            Start a real Stripe Checkout session for paid plans. Workspace plan changes
            are applied after Stripe webhook sync completes.
          </p>
        </div>

        <div className="grid grid-3 billing-plan-grid">
          <article className="surface section stack billing-plan-card">
            <p className="eyebrow">Free</p>
            <h3 className="section-title billing-price-title">$0</h3>
            <p className="muted">For limited operational usage.</p>
            <a className="button-secondary billing-full-width-button" href="/pricing">
              View Free details
            </a>
          </article>

          <article className="surface section stack billing-plan-card billing-plan-card-featured">
            <p className="eyebrow">Pro</p>
            <h3 className="section-title billing-price-title">$9.99/mo</h3>
            <p className="muted">Core operations, costs, and basic payables.</p>
            <PricingCheckoutButton
              label="Upgrade to Pro"
              plan="pro"
            />
          </article>

          <article className="surface section stack billing-plan-card">
            <p className="eyebrow">Business</p>
            <h3 className="section-title billing-price-title">$29.99/mo</h3>
            <p className="muted">Dashboard, profit, and advanced operations.</p>
            <PricingCheckoutButton
              label="Upgrade to Business"
              plan="business"
            />
          </article>
        </div>
      </section>

      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Manage billing</p>
          <h2 className="section-title">Stripe billing portal</h2>
          <p className="muted">
            Use the portal to manage payment methods or future subscription changes
            once a billing customer exists.
          </p>
        </div>

        {billing?.stripeCustomerId ? (
          <BillingPortalButton />
        ) : (
          <p className="status status-message">
            No Stripe billing customer exists for this workspace yet. Start from an
            upgrade checkout first.
          </p>
        )}
      </section>
    </PageShell>
  );
}
