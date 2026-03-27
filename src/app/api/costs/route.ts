import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api/responses";
import { createCostRecord } from "@/modules/costs/actions";
import { CostsError, getCostsList } from "@/modules/costs/costs";
import type { CostValidationInput } from "@/modules/costs/validation";
import { assertPlanAccess, FeatureAccessError } from "@/modules/plans/access";

function toCostValidationInput(payload: unknown): CostValidationInput {
  if (!payload || typeof payload !== "object") {
    throw new CostsError("Request body must be a JSON object.");
  }

  const input = payload as Record<string, unknown>;
  const readString = (key: keyof CostValidationInput) =>
    typeof input[key] === "string" ? input[key] : "";

  return {
    costDate: readString("costDate"),
    costType: readString("costType"),
    revenueId: readString("revenueId"),
    customerId: readString("customerId"),
    groupId: readString("groupId"),
    vendorId: readString("vendorId"),
    driverId: readString("driverId"),
    guideId: readString("guideId"),
    costName: readString("costName"),
    description: readString("description"),
    amount: readString("amount"),
    paymentStatus: readString("paymentStatus"),
    notesInternal: readString("notesInternal"),
  };
}

export async function GET(request: Request) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    assertPlanAccess(context, "cost");
    const { searchParams } = new URL(request.url);
    const data = await getCostsList(context, {
      revenueId: searchParams.get("revenue_id")?.trim() || undefined,
      customerId: searchParams.get("customer_id")?.trim() || undefined,
      groupId: searchParams.get("group_id")?.trim() || undefined,
      vendorId: searchParams.get("vendor_id")?.trim() || undefined,
      driverId: searchParams.get("driver_id")?.trim() || undefined,
      guideId: searchParams.get("guide_id")?.trim() || undefined,
      paymentStatus:
        (searchParams.get("payment_status")?.trim() as "unpaid" | "paid" | null) ||
        undefined,
      dateFrom: searchParams.get("date_from")?.trim() || undefined,
      dateTo: searchParams.get("date_to")?.trim() || undefined,
    });

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
        : "We could not load costs right now.";

    return apiError(400, "costs_request_failed", message);
  }
}

export async function POST(request: Request) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    assertPlanAccess(context, "cost");
    const payload = await parseJsonBody(request);
    const cost = await createCostRecord(context, toCostValidationInput(payload));

    return apiSuccess({ cost }, 201);
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
        : error instanceof Error
          ? error.message
          : "We could not create that cost.";

    return apiError(400, "cost_create_failed", message);
  }
}
