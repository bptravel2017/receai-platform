import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api/responses";
import { markCostsPaidRecord } from "@/modules/costs/actions";
import { CostsError } from "@/modules/costs/costs";
import { FeatureAccessError } from "@/modules/plans/access";

function parseCostIds(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new CostsError("Request body must be a JSON object.");
  }

  const costIds = (payload as { costIds?: unknown }).costIds;

  if (!Array.isArray(costIds)) {
    throw new CostsError("costIds must be an array.");
  }

  return costIds.filter((value): value is string => typeof value === "string");
}

export async function POST(request: Request) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    const payload = await parseJsonBody(request);
    const costIds = parseCostIds(payload);
    await markCostsPaidRecord(context, costIds);

    return apiSuccess({ costIds });
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
        : "We could not mark the selected costs as paid.";

    return apiError(400, "cost_bulk_pay_failed", message);
  }
}
