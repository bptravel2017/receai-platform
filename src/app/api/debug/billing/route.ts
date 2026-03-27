import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { hasActiveSubscriptionInContext } from "@/modules/billing/access";

export async function GET() {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  return apiSuccess({
    workspace_id: context.workspace.id,
    billing_status: context.billing?.status ?? "not_started",
    plan: context.billing?.plan ?? null,
    stripe_customer_id: context.billing?.stripeCustomerId ?? null,
    stripe_subscription_id: context.billing?.stripeSubscriptionId ?? null,
    subscription_active: hasActiveSubscriptionInContext(context),
  });
}
