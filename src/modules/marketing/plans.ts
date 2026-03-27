export const MARKETING_PLANS = [
  {
    name: "Free",
    plan: "free" as const,
    description: "Try the workflow now.",
    priceLabel: "$0",
    badge: null,
    ctaLabel: "Start Free",
    features: [
      "Create receipts instantly",
      "No signup required",
      "Upgrade later when you need more control",
    ],
  },
  {
    name: "Pro",
    plan: "pro" as const,
    description: "For owner-operators.",
    priceLabel: "$9.99/mo",
    badge: "Most popular",
    ctaLabel: "Upgrade to Pro",
    features: [
      "Invoicing",
      "Cost control",
      "Trip-level visibility",
    ],
  },
  {
    name: "Business",
    plan: "business" as const,
    description: "For teams.",
    priceLabel: "$29.99/mo",
    badge: null,
    ctaLabel: "Upgrade to Business",
    features: [
      "Dashboard",
      "Profit visibility",
      "Stronger operational control",
    ],
  },
] as const;

export type MarketingPlan = (typeof MARKETING_PLANS)[number];
