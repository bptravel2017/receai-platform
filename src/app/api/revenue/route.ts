import { apiError, apiSuccess, parseJsonBody } from "@/lib/api/responses";
import { getApiAppContext } from "@/lib/api/auth";
import {
  createRevenueRecord,
  toRouteErrorResponse,
} from "@/modules/invoice-flow/api";

export async function POST(request: Request) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    const payload = await parseJsonBody(request);
    const revenueRecord = await createRevenueRecord(context, payload);

    return apiSuccess({ revenueRecord }, 201);
  } catch (error) {
    const response = toRouteErrorResponse(error);
    return apiError(
      response.status,
      response.code,
      response.message,
      response.details,
    );
  }
}
