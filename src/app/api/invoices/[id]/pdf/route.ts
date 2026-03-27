import { renderToBuffer } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";

import { getApiAppContext } from "@/lib/api/auth";
import { apiError } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInvoiceById } from "@/modules/invoices/invoices";
import { InvoicePdfDocument } from "@/modules/invoices/pdf";
import { assertPlanAccess, FeatureAccessError } from "@/modules/plans/access";

export const runtime = "nodejs";

type InvoicePdfRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type RevenueRecordRow = {
  id: string;
  service_date: string;
  group_name: string | null;
  status: string;
  notes: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
};

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "-");
}

export async function GET(
  _request: Request,
  { params }: InvoicePdfRouteProps,
) {
  const context = await getApiAppContext();

  if (!context) {
    return apiError(401, "unauthorized", "Authentication is required.");
  }

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

  const { id } = await params;
  const invoiceResult = await getInvoiceById(context, id);

  if (!invoiceResult) {
    return apiError(404, "invoice_not_found", "Invoice was not found.");
  }

  const supabase = await createSupabaseServerClient();
  const [customerResponse, revenueRecordResponse] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, company, email, phone")
      .eq("workspace_id", context.workspace.id)
      .eq("id", invoiceResult.invoice.customerId)
      .maybeSingle(),
    supabase
      .from("revenue_records")
      .select("id, service_date, group_name, status, notes")
      .eq("workspace_id", context.workspace.id)
      .eq("id", invoiceResult.invoice.revenueRecordId)
      .maybeSingle(),
  ]);

  if (customerResponse.error || !customerResponse.data) {
    return apiError(
      404,
      "customer_not_found",
      "Customer linked to this invoice was not found.",
    );
  }

  if (revenueRecordResponse.error || !revenueRecordResponse.data) {
    return apiError(
      404,
      "revenue_record_not_found",
      "Revenue record linked to this invoice was not found.",
    );
  }

  const customer = customerResponse.data as CustomerRow;
  const revenueRecord = revenueRecordResponse.data as RevenueRecordRow;
  const document = createElement(InvoicePdfDocument, {
    invoice: invoiceResult.invoice,
    customer,
    revenueRecord: {
      id: revenueRecord.id,
      serviceDate: revenueRecord.service_date,
      groupName: revenueRecord.group_name,
      status: revenueRecord.status,
      notes: revenueRecord.notes,
    },
  }) as ReactElement;
  const buffer = await renderToBuffer(document as never);
  const pdfBytes = new Uint8Array(buffer);

  const filename = sanitizeFileName(
    invoiceResult.invoice.invoiceNumber ?? `invoice-${invoiceResult.invoice.id}`,
  );

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
