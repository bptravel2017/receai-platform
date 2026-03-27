import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { markCostPaidRecord } from "@/modules/costs/actions";
import { CostsError } from "@/modules/costs/costs";
import { FeatureAccessError } from "@/modules/plans/access";

type PayCostRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  _request: Request,
  { params }: PayCostRouteProps,
) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    const { id } = await params;
    const cost = await markCostPaidRecord(context, id);
    return apiSuccess({ cost });
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
        : "We could not mark that cost as paid.";

    return apiError(400, "cost_pay_failed", message);
  }
}
