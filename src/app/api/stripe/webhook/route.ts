import { apiError, apiSuccess } from "@/lib/api/responses";
import { verifyStripeWebhookRequest } from "@/lib/stripe/webhooks";
import { handleStripeWebhookEvent, toRouteErrorResponse } from "@/modules/billing/billing";

export async function POST(request: Request) {
  try {
    const event = await verifyStripeWebhookRequest(request);
    console.log("[stripe.webhook] received", {
      type: event.type,
      id: event.id,
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("[stripe.webhook] checkout.session.completed", {
        customer_id:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null,
        subscription_id:
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null,
        workspace_id:
          session.metadata?.workspace_id ?? session.client_reference_id ?? null,
      });
    }

    const data = await handleStripeWebhookEvent(event);
    console.log("[stripe.webhook] handled", {
      type: event.type,
      result: data,
    });

    return apiSuccess(data);
  } catch (error) {
    const response = toRouteErrorResponse(error);
    console.error("[stripe.webhook] failed", {
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : error,
      routeError: response,
    });
    return apiError(
      response.status,
      response.code,
      response.message,
      response.details,
    );
  }
}
