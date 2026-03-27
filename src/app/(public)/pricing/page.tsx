import { PageShell } from "@/components/shell/page-shell";
import { PricingCheckoutButton } from "@/modules/billing/components/pricing-checkout-button";
import { MARKETING_PLANS } from "@/modules/marketing/plans";

type PricingPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Pricing"
      title="Pricing"
      description="Choose the plan that matches your current operating stage."
    >
      {status ? (
        <p className={status.kind === "error" ? "status status-error" : "status status-message"}>
          {status.text}
        </p>
      ) : null}

      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Monthly plans</p>
          <h2 className="section-title">Start free, then upgrade when the workflow expands</h2>
          <p className="muted">
            Free gives you a limited operational runway. Pro unlocks the core workflow,
            and Business adds management visibility and higher-control operations.
          </p>
        </div>
      </section>

      <section className="grid grid-3 billing-plan-grid">
        {MARKETING_PLANS.map((plan) => (
          <article
            className={`surface section billing-plan-card billing-plan-card-${plan.plan}${plan.plan === "pro" ? " billing-plan-card-featured" : ""}`}
            key={plan.name}
          >
            <div className="billing-plan-top">
              <div className="stack stack-tight">
                {plan.badge ? (
                  <p className={`role-badge billing-plan-badge${plan.plan === "pro" ? " billing-plan-badge-popular" : ""}`}>
                    {plan.badge}
                  </p>
                ) : null}
                <p className="eyebrow">{plan.name}</p>
                <h2 className="section-title billing-price-title">{plan.priceLabel}</h2>
                <p className="muted">{plan.description}</p>
              </div>
            </div>

            <div className="billing-plan-middle">
              <ul className="link-list billing-feature-list">
                {plan.features.map((feature) => (
                  <li className="muted" key={feature}>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="billing-plan-bottom">
              {plan.plan === "free" ? (
                <a className="button-primary billing-full-width-button" href="/receipts">
                  {plan.ctaLabel}
                </a>
              ) : (
                <PricingCheckoutButton
                  className="button-accent billing-full-width-button"
                  label={plan.ctaLabel}
                  plan={plan.plan}
                />
              )}
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
