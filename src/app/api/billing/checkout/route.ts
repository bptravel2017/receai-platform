import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api/responses";
import {
  createBillingCheckoutSession,
  toRouteErrorResponse,
} from "@/modules/billing/billing";

export async function POST(request: Request) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    const payload = await parseJsonBody(request);
    const data = await createBillingCheckoutSession(context, payload);
    return apiSuccess(data, 201);
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
