import { PageShell } from "@/components/shell/page-shell";
import { UpgradePaywallTrigger } from "@/modules/billing/components/upgrade-paywall-trigger";
type FeatureGateNoticeProps = {
  eyebrow: string;
  title: string;
  description: string;
  requiredPlan: "pro" | "business";
};

export function FeatureGateNotice({
  eyebrow,
  title,
  description,
  requiredPlan,
}: FeatureGateNoticeProps) {
  return (
    <PageShell eyebrow={eyebrow} title={title} description={description}>
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Plan required</p>
          <h2 className="section-title">Upgrade to unlock this feature</h2>
          <p className="muted">
            {requiredPlan === "business"
              ? "This feature is available in Business plan."
              : "This feature is available in Pro / Business plan."}
          </p>
          <p className="muted">
            Upgrade through Stripe checkout to unlock the required plan for this
            workspace.
          </p>
        </div>

        <div className="cost-link-row">
          <UpgradePaywallTrigger
            className="button-accent"
            label={requiredPlan === "business" ? "Upgrade to Business" : "Upgrade now"}
            requiredPlan={requiredPlan}
            title="Upgrade to unlock this feature"
            message={
              requiredPlan === "business"
                ? "This feature is available in Business plan."
                : "This feature is available in Pro / Business plan."
            }
          />
          <a className="link-pill" href="/pricing">
            View plans
          </a>
        </div>
      </section>
    </PageShell>
  );
}
