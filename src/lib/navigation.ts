export type AppRoute = {
  href: string;
  label: string;
  description: string;
  feature?: import("@/modules/plans/types").PlanFeature;
};

export const publicRoutes: AppRoute[] = [
  {
    href: "/",
    label: "Home",
    description: "Public landing page scaffold.",
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "Pricing page placeholder for future plans.",
  },
  {
    href: "/receipts",
    label: "Receipts",
    description: "Guest receipt intake entry point.",
  },
  {
    href: "/privacy",
    label: "Privacy",
    description: "Privacy page placeholder.",
  },
  {
    href: "/terms",
    label: "Terms",
    description: "Terms page placeholder.",
  },
];

export const authRoutes: AppRoute[] = [
  {
    href: "/login",
    label: "Login",
    description: "Authentication entry point placeholder.",
  },
  {
    href: "/sign-up",
    label: "Sign up",
    description: "Registration entry point placeholder.",
  },
];

export const appRoutes: AppRoute[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Workspace overview module.",
    feature: "dashboard",
  },
  {
    href: "/customers",
    label: "Customers",
    description: "Customer records module.",
  },
  {
    href: "/groups",
    label: "Groups",
    description: "Real group entity management module.",
  },
  {
    href: "/revenue",
    label: "Daytime",
    description: "Primary business-entry module.",
  },
  {
    href: "/invoices",
    label: "Invoices",
    description: "Invoice management module.",
  },
  {
    href: "/costs",
    label: "Costs",
    description: "Cost capture and categorization module.",
    feature: "cost",
  },
  {
    href: "/payables",
    label: "Payables",
    description: "Operational payout tracking module.",
    feature: "payables_basic",
  },
  {
    href: "/profit",
    label: "Profit",
    description: "Profit reporting module.",
    feature: "profit",
  },
  {
    href: "/bank",
    label: "Bank",
    description: "Bank import and reconciliation module.",
  },
  {
    href: "/billing",
    label: "Billing",
    description: "Subscription and payments module.",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Workspace settings module.",
  },
];
