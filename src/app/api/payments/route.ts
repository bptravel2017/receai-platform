import { apiError, apiSuccess, parseJsonBody } from "@/lib/api/responses";
import { getApiAppContext } from "@/lib/api/auth";
import {
  recordInvoicePaymentEvent,
  toRouteErrorResponse,
} from "@/modules/invoice-flow/api";

export async function POST(request: Request) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  try {
    const payload = await parseJsonBody(request);
    const data = await recordInvoicePaymentEvent(context, payload);

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
