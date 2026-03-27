import type { WorkspacePlan } from "@/modules/plans/types";

export type BillingPlan = "pro" | "business" | "custom";

export type BillingStatus =
  | "not_started"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type WorkspaceBillingAccount = {
  workspaceId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: BillingPlan | null;
  priceId: string | null;
  status: BillingStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceSubscription = {
  id: string;
  workspaceId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  plan: BillingPlan | null;
  status: BillingStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingEventType =
  | "upgrade"
  | "downgrade"
  | "renewal"
  | "payment_failed"
  | "cancellation";

export function mapBillingPlanToWorkspacePlan(
  plan: BillingPlan | null | undefined,
): WorkspacePlan | null {
  if (plan === "pro") {
    return "pro";
  }

  if (plan === "business" || plan === "custom") {
    return "business";
  }

  return null;
}
