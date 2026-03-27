import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildInvoiceEmailContent } from "@/modules/invoices/email-rendering";
import { getInvoiceById, InvoicesError } from "@/modules/invoices/invoices";
import { InvoicePdfDocument } from "@/modules/invoices/pdf";
import { getInvoicePrintView } from "@/modules/invoices/rendering";

type CustomerRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
};

type RevenueRecordRow = {
  id: string;
  service_date: string;
  group_name: string | null;
  status: string;
  notes: string | null;
};

export class SendInvoiceFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendInvoiceFlowError";
  }
}

function getSendGridConfig() {
  const apiKey = process.env.SENDGRID_API_KEY?.trim() ?? "";
  const fromEmail = process.env.PLATFORM_EMAIL_FROM_EMAIL?.trim() ?? "";
  const fromName = process.env.PLATFORM_EMAIL_FROM_NAME?.trim() || "ReceAI";

  if (!apiKey) {
    throw new SendInvoiceFlowError(
      "SENDGRID_API_KEY is required before invoice sending can work.",
    );
  }

  if (!fromEmail) {
    throw new SendInvoiceFlowError(
      "PLATFORM_EMAIL_FROM_EMAIL is required before invoice sending can work.",
    );
  }

  return {
    apiKey,
    fromEmail,
    fromName,
  };
}

function toBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

function buildAttachmentFilename(invoiceNumber: string | null, invoiceId: string) {
  const value = invoiceNumber ?? `invoice-${invoiceId}`;
  return `${value.replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf`;
}

export async function sendInvoiceFlow(
  invoiceId: string,
  context: AuthenticatedAppContext,
) {
  const existingInvoice = await getInvoiceById(context, invoiceId);

  if (!existingInvoice) {
    throw new SendInvoiceFlowError(
      "Invoice was not found in the current workspace.",
    );
  }

  if (existingInvoice.invoice.status !== "finalized") {
    throw new SendInvoiceFlowError(
      "Only finalized invoices can be sent.",
    );
  }

  if (existingInvoice.invoice.deliveryStatus === "sent") {
    throw new SendInvoiceFlowError(
      "This invoice has already been sent.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const [customerResponse, revenueRecordResponse, printView] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, company, email, phone")
      .eq("workspace_id", context.workspace.id)
      .eq("id", existingInvoice.invoice.customerId)
      .maybeSingle(),
    supabase
      .from("revenue_records")
      .select("id, service_date, group_name, status, notes")
      .eq("workspace_id", context.workspace.id)
      .eq("id", existingInvoice.invoice.revenueRecordId)
      .maybeSingle(),
    getInvoicePrintView(context, invoiceId),
  ]);

  if (customerResponse.error || !customerResponse.data) {
    throw new SendInvoiceFlowError(
      "Customer linked to this invoice could not be loaded.",
    );
  }

  if (revenueRecordResponse.error || !revenueRecordResponse.data) {
    throw new SendInvoiceFlowError(
      "Revenue record linked to this invoice could not be loaded.",
    );
  }

  if (!printView) {
    throw new SendInvoiceFlowError(
      "Invoice email content could not be prepared.",
    );
  }

  const customer = customerResponse.data as CustomerRow;
  const revenueRecord = revenueRecordResponse.data as RevenueRecordRow;

  if (!customer.email?.trim()) {
    throw new SendInvoiceFlowError(
      "Customer email is required before sending an invoice.",
    );
  }

  const pdfBuffer = await renderToBuffer(
    createElement(InvoicePdfDocument, {
      invoice: existingInvoice.invoice,
      customer,
      revenueRecord: {
        id: revenueRecord.id,
        serviceDate: revenueRecord.service_date,
        groupName: revenueRecord.group_name,
        status: revenueRecord.status,
        notes: revenueRecord.notes,
      },
    }) as never,
  );

  const pdfBase64 = toBase64(pdfBuffer);
  const config = getSendGridConfig();
  const emailContent = buildInvoiceEmailContent(printView, "send");

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      personalizations: [
        {
          to: [{ email: customer.email }],
        },
      ],
      subject: emailContent.subject,
      content: [
        {
          type: "text/plain",
          value: emailContent.text,
        },
        {
          type: "text/html",
          value: emailContent.html,
        },
      ],
      attachments: [
        {
          content: pdfBase64,
          filename: buildAttachmentFilename(
            existingInvoice.invoice.invoiceNumber,
            existingInvoice.invoice.id,
          ),
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
      reply_to: context.workspace.replyToEmail?.trim()
        ? { email: context.workspace.replyToEmail }
        : undefined,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          errors?: Array<{
            message?: string;
          }>;
        }
      | null;

    throw new SendInvoiceFlowError(
      payload?.errors?.[0]?.message ??
        "SendGrid rejected the invoice send request.",
    );
  }

  const sentAt = new Date().toISOString();
  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({
      // The schema tracks send state via delivery_status, not invoice.status.
      delivery_status: "sent",
      delivery_method: "platform_email",
      delivery_recipient_email: customer.email,
      delivery_reply_to_email: context.workspace.replyToEmail?.trim()
        ? context.workspace.replyToEmail
        : null,
      sent_at: sentAt,
      sent_by_user_id: context.user.id,
      updated_by_user_id: context.user.id,
    })
    .eq("id", existingInvoice.invoice.id)
    .eq("workspace_id", context.workspace.id);

  if (invoiceUpdateError) {
    throw new InvoicesError(
      "The invoice email sent, but the invoice delivery state could not be updated.",
    );
  }

  return { success: true as const };
}
