import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api/responses";
import { createCostCategoryRecord } from "@/modules/costs/actions";
import { CostsError } from "@/modules/costs/costs";

function toCategoryInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new CostsError("Request body must be a JSON object.");
  }

  const input = payload as Record<string, unknown>;

  return {
    name: typeof input.name === "string" ? input.name : "",
    description: typeof input.description === "string" ? input.description : "",
  };
}

export async function POST(request: Request) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    const payload = await parseJsonBody(request);
    const category = await createCostCategoryRecord(context, toCategoryInput(payload));

    return apiSuccess({ category }, 201);
  } catch (error) {
    const message =
      error instanceof CostsError
        ? error.message
        : error instanceof Error
          ? error.message
          : "We could not create that cost category.";

    return apiError(400, "cost_category_create_failed", message);
  }
}
