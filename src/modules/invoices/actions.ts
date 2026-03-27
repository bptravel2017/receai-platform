"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { sendPlatformEmail } from "@/lib/email/platform";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertUsageAllowed,
  logWorkspaceUsage,
} from "@/modules/billing/usage";
import {
  assertCanManageInvoices,
  getInvoiceById,
  getInvoiceByRevenueRecordId,
  getRevenueSourceForInvoiceDraft,
  InvoicesError,
} from "@/modules/invoices/invoices";
import { buildInvoiceEmailContent } from "@/modules/invoices/email-rendering";
import { syncInvoicePaymentSummary } from "@/modules/invoices/payment-events";
import { getInvoicePrintView } from "@/modules/invoices/rendering";
import { addDays } from "@/modules/invoices/utils";
import { parseLineItemsJson, sumLineItemsAmount } from "@/modules/line-items/line-items";

function getTrimmedField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptional(value: string) {
  return value.length > 0 ? value : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseAmountToCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new InvoicesError("Enter a valid payment amount with up to 2 decimals.");
  }

  return Math.round(Number(value) * 100);
}

function withStatus(path: string, key: "error" | "message", value: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(key, value);
  return `${path}?${searchParams.toString()}`;
}

async function createInvoiceDeliveryEvent(args: {
  workspaceId: string;
  invoiceId: string;
  actionType: "send" | "resend" | "reminder";
  deliveryStatus: "sent" | "failed";
  deliveryMethod: "manual_share" | "external_email" | "platform_email";
  recipientEmail: string | null;
  replyToEmail: string | null;
  note: string | null;
  errorMessage?: string | null;
  providerMessageId?: string | null;
  deliveredByUserId: string;
  createdAt?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("invoice_delivery_events").insert({
    workspace_id: args.workspaceId,
    invoice_id: args.invoiceId,
    action_type: args.actionType,
    delivery_status: args.deliveryStatus,
    delivery_method: args.deliveryMethod,
    recipient_email: args.recipientEmail,
    reply_to_email: args.replyToEmail,
    note: args.note,
    error_message: args.errorMessage ?? null,
    provider_message_id: args.providerMessageId ?? null,
    delivered_by_user_id: args.deliveredByUserId,
    created_at: args.createdAt ?? new Date().toISOString(),
  });

  if (error) {
    throw new InvoicesError("Delivery history could not be recorded.");
  }
}

function validateInvoiceInput(formData: FormData) {
  const invoiceDate = getTrimmedField(formData, "invoiceDate");
  const dueDate = getTrimmedField(formData, "dueDate");
  const notes = getTrimmedField(formData, "notes");
  const lineItemsJson = getTrimmedField(formData, "lineItems");

  if (!invoiceDate) {
    throw new InvoicesError("Choose an invoice date.");
  }

  if (notes.length > 4000) {
    throw new InvoicesError("Notes must stay under 4000 characters.");
  }

  const lineItems = parseLineItemsJson(lineItemsJson);

  if (lineItems.length === 0) {
    throw new InvoicesError("Add at least one invoice item.");
  }

  return {
    invoice_date: invoiceDate,
    due_date: normalizeOptional(dueDate),
    notes: normalizeOptional(notes),
    line_items: lineItems,
    amount_cents: sumLineItemsAmount(lineItems),
  };
}

async function finalizeInvoiceIfNeeded(args: {
  workspaceId: string;
  invoiceId: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("status")
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.invoiceId)
    .maybeSingle();

  if (invoiceError || !invoice) {
    throw new InvoicesError("That invoice is no longer available in this workspace.");
  }

  if (invoice.status === "finalized") {
    return;
  }

  const { data: finalizedInvoice, error: finalizeError } = await supabase.rpc(
    "finalize_invoice",
    {
      p_workspace_id: args.workspaceId,
      p_invoice_id: args.invoiceId,
      p_user_id: args.userId,
    },
  );

  if (
    finalizeError ||
    !Array.isArray(finalizedInvoice) ||
    finalizedInvoice.length === 0 ||
    typeof finalizedInvoice[0]?.invoice_number !== "string"
  ) {
    throw new InvoicesError("We could not prepare that invoice.");
  }
}

export async function createInvoiceDraftForRevenueRecord(args: {
  context: Awaited<ReturnType<typeof requireAuthenticatedAppContext>>;
  workspaceId: string;
  revenueRecordId: string;
  userId: string;
}) {
  const existingInvoice = await getInvoiceByRevenueRecordId(
    args.context,
    args.revenueRecordId,
  );

  if (existingInvoice) {
    const supabase = await createSupabaseServerClient();
    await supabase
      .from("revenue_records")
      .update({
        billing_state: "billed",
        invoice_id: existingInvoice.id,
        updated_by_user_id: args.userId,
      })
      .eq("workspace_id", args.workspaceId)
      .eq("id", args.revenueRecordId);

    return {
      invoiceId: existingInvoice.id,
      created: false,
    };
  }

  await assertUsageAllowed(args.workspaceId, "invoice_created");

  const revenue = await getRevenueSourceForInvoiceDraft(
    args.context,
    args.revenueRecordId,
  );
  const supabase = await createSupabaseServerClient();
  const invoiceDate = revenue.service_date;
  const dueDate = addDays(invoiceDate, 14);
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      workspace_id: args.workspaceId,
      revenue_record_id: revenue.id,
      customer_id: revenue.customer_id,
      group_id: revenue.group_id,
      invoice_date: invoiceDate,
      due_date: dueDate,
      status: "draft",
      amount_cents: revenue.amount_cents,
      currency: revenue.currency,
      notes: revenue.notes,
      line_items: Array.isArray(revenue.line_items) ? revenue.line_items : [],
      created_by_user_id: args.userId,
      updated_by_user_id: args.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new InvoicesError("We could not generate that invoice.");
  }

  const { error: revenueUpdateError } = await supabase
    .from("revenue_records")
    .update({
      billing_state: "billed",
      invoice_id: data.id,
      updated_by_user_id: args.userId,
    })
    .eq("workspace_id", args.workspaceId)
    .eq("id", revenue.id);

  if (revenueUpdateError) {
    throw new InvoicesError("The invoice was created, but billing state could not be updated.");
  }

  await logWorkspaceUsage(args.workspaceId, "invoice_created");

  return {
    invoiceId: data.id,
    created: true,
  };
}

export async function createInvoiceDraftFromRevenueAction(formData: FormData) {
  const revenueRecordId = getTrimmedField(formData, "revenueRecordId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageInvoices(context);
    const result = await createInvoiceDraftForRevenueRecord({
      context,
      workspaceId: context.workspace.id,
      revenueRecordId,
      userId: context.user.id,
    });

    redirect(
      withStatus(
        `/invoices/${result.invoiceId}`,
        "message",
        result.created
          ? "Invoice draft created."
          : "An invoice already exists for this entry.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof InvoicesError
        ? error.message
        : "We could not generate that invoice.";

    redirect(withStatus(`/revenue/${revenueRecordId}`, "error", message));
  }
}

export async function updateInvoiceDraftAction(formData: FormData) {
  const invoiceId = getTrimmedField(formData, "invoiceId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageInvoices(context);
    const existingInvoice = await getInvoiceById(context, invoiceId);

    if (!existingInvoice) {
      throw new InvoicesError("That invoice is no longer available in this workspace.");
    }

    const values = validateInvoiceInput(formData);

    if (values.amount_cents < existingInvoice.invoice.paidAmountCents) {
      throw new InvoicesError("Invoice amount cannot be lower than recorded payments.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("invoices")
      .update({
        ...values,
        updated_by_user_id: context.user.id,
      })
      .eq("id", invoiceId)
      .eq("workspace_id", context.workspace.id)
      .select("id")
      .single();

    if (error || !data) {
      throw new InvoicesError("We could not save that invoice.");
    }

    redirect(withStatus(`/invoices/${invoiceId}`, "message", "Invoice saved."));
  } catch (error) {
    const message =
      error instanceof InvoicesError
        ? error.message
        : "We could not save that invoice.";

    redirect(withStatus(`/invoices/${invoiceId}`, "error", message));
  }
}

export async function finalizeInvoiceAction(formData: FormData) {
  const invoiceId = getTrimmedField(formData, "invoiceId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageInvoices(context);
    const existingInvoice = await getInvoiceById(context, invoiceId);

    if (!existingInvoice) {
      throw new InvoicesError("That invoice is no longer available in this workspace.");
    }

    if (existingInvoice.invoice.status === "finalized") {
      redirect(
        withStatus(
          `/invoices/${invoiceId}`,
          "message",
          "This invoice is already finalized.",
        ),
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: finalizedInvoice, error: finalizeError } = await supabase.rpc(
      "finalize_invoice",
      {
        p_workspace_id: context.workspace.id,
        p_invoice_id: invoiceId,
        p_user_id: context.user.id,
      },
    );

    if (
      finalizeError ||
      !Array.isArray(finalizedInvoice) ||
      finalizedInvoice.length === 0 ||
      typeof finalizedInvoice[0]?.invoice_number !== "string"
    ) {
      throw new InvoicesError("We could not finalize that invoice.");
    }

    redirect(
      withStatus(
        `/invoices/${invoiceId}`,
        "message",
        `Invoice finalized as ${finalizedInvoice[0].invoice_number}.`,
      ),
    );
  } catch (error) {
    const message =
      error instanceof InvoicesError
        ? error.message
        : "We could not finalize that invoice.";

    redirect(withStatus(`/invoices/${invoiceId}`, "error", message));
  }
}

export async function markInvoiceSentAction(formData: FormData) {
  const invoiceId = getTrimmedField(formData, "invoiceId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageInvoices(context);
    const existingInvoice = await getInvoiceById(context, invoiceId);

    if (!existingInvoice) {
      throw new InvoicesError("That invoice is no longer available in this workspace.");
    }

    await finalizeInvoiceIfNeeded({
      workspaceId: context.workspace.id,
      invoiceId,
      userId: context.user.id,
    });

    if (existingInvoice.invoice.deliveryStatus === "sent") {
      redirect(
        withStatus(
          `/invoices/${invoiceId}`,
          "message",
          "This finalized invoice is already marked as sent.",
        ),
      );
    }

    const recipientEmail = getTrimmedField(formData, "recipientEmail");
    const deliveryNote = getTrimmedField(formData, "deliveryNote");

    if (recipientEmail && !isValidEmail(recipientEmail)) {
      throw new InvoicesError("Enter a valid recipient email or leave it blank.");
    }

    if (deliveryNote.length > 4000) {
      throw new InvoicesError("Delivery notes must stay under 4000 characters.");
    }

    const supabase = await createSupabaseServerClient();
    const sentAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("invoices")
      .update({
        delivery_status: "sent",
        sent_at: sentAt,
        delivery_recipient_email: normalizeOptional(recipientEmail),
        delivery_reply_to_email: null,
        delivery_method: "manual_share",
        delivery_note: normalizeOptional(deliveryNote),
        sent_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .eq("id", invoiceId)
      .eq("workspace_id", context.workspace.id)
      .eq("status", "finalized")
      .eq("delivery_status", "not_sent")
      .select("id")
      .single();

    if (error || !data) {
      throw new InvoicesError("We could not mark that invoice as sent.");
    }

    await createInvoiceDeliveryEvent({
      workspaceId: context.workspace.id,
      invoiceId,
      actionType: "send",
      deliveryStatus: "sent",
      deliveryMethod: "manual_share",
      recipientEmail: normalizeOptional(recipientEmail),
      replyToEmail: null,
      note: normalizeOptional(deliveryNote),
      deliveredByUserId: context.user.id,
      createdAt: sentAt,
    });

    redirect(
      withStatus(
        `/invoices/${invoiceId}`,
        "message",
        "Invoice manual delivery recorded as sent.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof InvoicesError
        ? error.message
        : "We could not record that invoice delivery.";

    redirect(withStatus(`/invoices/${invoiceId}`, "error", message));
  }
}

export async function sendInvoicePlatformEmailAction(formData: FormData) {
  const invoiceId = getTrimmedField(formData, "invoiceId");
  const recipientEmail = getTrimmedField(formData, "recipientEmail");
  const actionType = getTrimmedField(formData, "actionType");
  const deliveryNote = getTrimmedField(formData, "deliveryNote");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageInvoices(context);

    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      throw new InvoicesError("Enter a valid recipient email before sending.");
    }

    if (
      actionType !== "send" &&
      actionType !== "resend" &&
      actionType !== "reminder"
    ) {
      throw new InvoicesError("Choose a valid delivery action.");
    }

    if (deliveryNote.length > 4000) {
      throw new InvoicesError("Delivery notes must stay under 4000 characters.");
    }

    const existingInvoice = await getInvoiceById(context, invoiceId);

    if (!existingInvoice) {
      throw new InvoicesError("That invoice is no longer available in this workspace.");
    }

    await finalizeInvoiceIfNeeded({
      workspaceId: context.workspace.id,
      invoiceId,
      userId: context.user.id,
    });

    if (
      actionType === "send" &&
      existingInvoice.invoice.deliveryStatus === "sent"
    ) {
      throw new InvoicesError("This finalized invoice is already marked as sent.");
    }

    if (
      actionType !== "send" &&
      existingInvoice.invoice.deliveryStatus !== "sent"
    ) {
      throw new InvoicesError("Resend and reminder actions are only available after the invoice has been sent.");
    }

    const view = await getInvoicePrintView(context, invoiceId);

    if (!view) {
      throw new InvoicesError("We could not prepare that invoice email.");
    }

    const replyToEmail = context.workspace.replyToEmail?.trim()
      ? context.workspace.replyToEmail
      : null;
    const emailContent = buildInvoiceEmailContent(view, actionType);
    const sentAt = new Date().toISOString();

    try {
      const sendResult = await sendPlatformEmail({
        to: recipientEmail,
        replyToEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      const supabase = await createSupabaseServerClient();
      const updatePayload = {
        delivery_recipient_email: recipientEmail,
        delivery_reply_to_email: replyToEmail,
        delivery_method: "platform_email" as const,
        delivery_note: normalizeOptional(deliveryNote),
        updated_by_user_id: context.user.id,
      };

      if (actionType === "send") {
        const { error } = await supabase
          .from("invoices")
          .update({
            ...updatePayload,
            delivery_status: "sent",
            sent_at: sentAt,
            sent_by_user_id: context.user.id,
          })
          .eq("id", invoiceId)
          .eq("workspace_id", context.workspace.id)
          .eq("status", "finalized")
          .eq("delivery_status", "not_sent");

        if (error) {
          throw new InvoicesError("The email sent, but the invoice delivery state could not be updated.");
        }
      } else {
        const { error } = await supabase
          .from("invoices")
          .update(updatePayload)
          .eq("id", invoiceId)
          .eq("workspace_id", context.workspace.id)
          .eq("status", "finalized")
          .eq("delivery_status", "sent");

        if (error) {
          throw new InvoicesError("The follow-up email sent, but the invoice delivery snapshot could not be refreshed.");
        }
      }

      await createInvoiceDeliveryEvent({
        workspaceId: context.workspace.id,
        invoiceId,
        actionType,
        deliveryStatus: "sent",
        deliveryMethod: "platform_email",
        recipientEmail,
        replyToEmail,
        note: normalizeOptional(deliveryNote),
        providerMessageId: sendResult.providerMessageId,
        deliveredByUserId: context.user.id,
        createdAt: sentAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The platform email send failed.";

      await createInvoiceDeliveryEvent({
        workspaceId: context.workspace.id,
        invoiceId,
        actionType,
        deliveryStatus: "failed",
        deliveryMethod: "platform_email",
        recipientEmail,
        replyToEmail,
        note: normalizeOptional(deliveryNote),
        errorMessage: message,
        deliveredByUserId: context.user.id,
        createdAt: sentAt,
      });

      throw new InvoicesError(message);
    }

    redirect(
      withStatus(
        `/invoices/${invoiceId}`,
        "message",
        actionType === "reminder"
          ? "Invoice reminder sent through the platform email sender."
          : actionType === "resend"
            ? "Invoice resend sent through the platform email sender."
            : "Invoice sent through the platform email sender.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof InvoicesError
        ? error.message
        : "We could not send that invoice email.";

    redirect(withStatus(`/invoices/${invoiceId}`, "error", message));
  }
}

export async function recordInvoicePaymentAction(formData: FormData) {
  const invoiceId = getTrimmedField(formData, "invoiceId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageInvoices(context);
    const existingInvoice = await getInvoiceById(context, invoiceId);

    if (!existingInvoice) {
      throw new InvoicesError("That invoice is no longer available in this workspace.");
    }

    await finalizeInvoiceIfNeeded({
      workspaceId: context.workspace.id,
      invoiceId,
      userId: context.user.id,
    });

    const paidAmount = getTrimmedField(formData, "paidAmount");
    const paymentDate = getTrimmedField(formData, "paymentDate");
    const paymentReference = getTrimmedField(formData, "paymentReference");
    const paymentNote = getTrimmedField(formData, "paymentNote");

    if (paymentNote.length > 4000) {
      throw new InvoicesError("Payment notes must stay under 4000 characters.");
    }

    const paidAmountCents = parseAmountToCents(paidAmount);

    if (paidAmountCents <= 0) {
      throw new InvoicesError("Enter a payment amount greater than zero.");
    }

    if (existingInvoice.invoice.paidAmountCents + paidAmountCents > existingInvoice.invoice.amountCents) {
      throw new InvoicesError(
        "This payment would exceed the invoice total. Record a smaller amount or reconcile a bank transaction instead.",
      );
    }

    if (!paymentDate) {
      throw new InvoicesError("Choose a payment date when recording a payment.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("invoice_payment_events")
      .insert({
        workspace_id: context.workspace.id,
        invoice_id: invoiceId,
        source: "manual",
        status: "active",
        amount_cents: paidAmountCents,
        payment_date: paymentDate,
        reference: normalizeOptional(paymentReference),
        note: normalizeOptional(paymentNote),
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new InvoicesError("We could not save that payment event.");
    }

    await syncInvoicePaymentSummary({
      workspaceId: context.workspace.id,
      invoiceId,
      updatedByUserId: context.user.id,
    });

    redirect(
      withStatus(
        `/invoices/${invoiceId}`,
        "message",
        "Manual payment recorded.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof InvoicesError
        ? error.message
        : "We could not save that payment event.";

    redirect(withStatus(`/invoices/${invoiceId}`, "error", message));
  }
}

export async function deleteInvoiceAction(formData: FormData) {
  const invoiceId = getTrimmedField(formData, "invoiceId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageInvoices(context);
    const existingInvoice = await getInvoiceById(context, invoiceId);

    if (!existingInvoice) {
      throw new InvoicesError("That invoice is no longer available in this workspace.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId)
      .eq("workspace_id", context.workspace.id);

    if (error) {
      throw new InvoicesError("We could not delete that invoice.");
    }

    redirect(withStatus("/invoices", "message", "Invoice deleted."));
  } catch (error) {
    const message =
      error instanceof InvoicesError
        ? error.message
        : "We could not delete that invoice.";

    redirect(withStatus(`/invoices/${invoiceId}`, "error", message));
  }
}
