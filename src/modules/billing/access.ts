import type { AuthenticatedAppContext } from "@/lib/auth/types";
import type { WorkspaceBillingAccount } from "@/modules/billing/types";

export function hasActiveSubscription(
  billing: WorkspaceBillingAccount | null | undefined,
) {
  return billing?.status === "active" || billing?.status === "trialing";
}

export function hasActiveSubscriptionInContext(
  context: AuthenticatedAppContext,
) {
  return hasActiveSubscription(context.billing);
}
