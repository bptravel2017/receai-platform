import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { CostsError, getCostsByRevenueId } from "@/modules/costs/costs";
import { assertPlanAccess, FeatureAccessError } from "@/modules/plans/access";

type CostsByRevenueRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: CostsByRevenueRouteProps,
) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    assertPlanAccess(context, "cost");
    const { id } = await params;
    const data = await getCostsByRevenueId(context, id);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof FeatureAccessError) {
      return apiError(error.status, "feature_forbidden", error.message, {
        feature: error.feature,
        requiredPlan: error.requiredPlan,
        currentPlan: error.currentPlan,
      });
    }

    const message =
      error instanceof CostsError
        ? error.message
        : "We could not load costs for that Daytime entry.";

    return apiError(400, "costs_request_failed", message);
  }
}
