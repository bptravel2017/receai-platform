import { getApiAppContext } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { logWorkspaceUsage } from "@/modules/billing/usage";
import { InvoicesError } from "@/modules/invoices/invoices";
import {
  sendInvoiceFlow,
  SendInvoiceFlowError,
} from "@/modules/invoice-flow/send";
import { assertPlanAccess, FeatureAccessError } from "@/modules/plans/access";

type InvoiceSendRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: InvoiceSendRouteProps,
) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

  const { id } = await params;

  try {
    assertPlanAccess(context, "invoice");
  } catch (error) {
    if (error instanceof FeatureAccessError) {
      return apiError(error.status, "feature_forbidden", error.message, {
        feature: error.feature,
        requiredPlan: error.requiredPlan,
        currentPlan: error.currentPlan,
      });
    }
  }

  try {
    const result = await sendInvoiceFlow(id, context);

    try {
      await logWorkspaceUsage(context.workspace.id, "invoice_sent");
    } catch {
      return apiError(
        500,
        "usage_log_failed",
        "The invoice sent, but usage tracking could not be recorded.",
      );
    }

    return apiSuccess({
      ...result,
      remaining_free_quota: null,
    });
  } catch (error) {
    if (error instanceof SendInvoiceFlowError) {
      return apiError(422, "invoice_send_failed", error.message);
    }

    if (error instanceof InvoicesError) {
      return apiError(500, "invoice_state_update_failed", error.message);
    }

    return apiError(500, "internal_error", "An unexpected error occurred.");
  }
}
