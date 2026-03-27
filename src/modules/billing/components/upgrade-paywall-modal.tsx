"use client";

import { useId } from "react";

import { PricingCheckoutButton } from "@/modules/billing/components/pricing-checkout-button";

type UpgradePaywallModalProps = {
  open: boolean;
  onClose: () => void;
  requiredPlan?: "pro" | "business";
  title?: string;
  message?: string;
};

export function UpgradePaywallModal({
  open,
  onClose,
  requiredPlan = "pro",
  title,
  message,
}: UpgradePaywallModalProps) {
  const titleId = useId();
  const plans = [
    {
      name: "Pro",
      plan: "pro" as const,
      priceLabel: "$9.99/mo",
      description: "Unlock receipt save, invoices, Daytime, customers, costs, and basic payables.",
    },
    {
      name: "Business",
      plan: "business" as const,
      priceLabel: "$29.99/mo",
      description: "Unlock dashboard, profit, bulk payables, and business-wide visibility.",
    },
  ].filter((plan) => (requiredPlan === "business" ? plan.plan === "business" : true));

  if (!open) {
    return null;
  }

  return (
    <div className="billing-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="surface section stack billing-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="stack stack-tight">
          <p className="eyebrow">Premium feature</p>
          <h2 className="section-title" id={titleId}>
            {title ?? "Upgrade to unlock this feature"}
          </h2>
          <p className="muted">
            {message ??
              (requiredPlan === "business"
                ? "This feature is available in Business plan."
                : "This feature is available in Pro / Business plan.")}
          </p>
        </div>

        <div className="grid grid-2 billing-plan-grid">
          {plans.map((plan) => (
            <article className="surface section stack billing-plan-card" key={plan.plan}>
              <div className="stack stack-tight">
                <p className="eyebrow">{plan.name}</p>
                <h3 className="section-title billing-price-title">{plan.priceLabel}</h3>
                <p className="muted">{plan.description}</p>
              </div>
              <PricingCheckoutButton
                label="Upgrade now"
                plan={plan.plan}
              />
            </article>
          ))}
        </div>

        <button className="button-secondary billing-full-width-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
