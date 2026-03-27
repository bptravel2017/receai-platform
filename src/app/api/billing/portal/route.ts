import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import {
  createBillingPortalSession,
  toRouteErrorResponse,
} from "@/modules/billing/billing";

export async function POST() {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    const data = await createBillingPortalSession(context);
    return apiSuccess(data);
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
