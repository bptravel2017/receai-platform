"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCanManageBank, BankError, getBankTransactionById } from "@/modules/bank/bank";
import {
  parseCsvImportFile,
  parseManualImportLines,
} from "@/modules/bank/import-parser";
import { syncInvoicePaymentSummary } from "@/modules/invoices/payment-events";

function getTrimmedField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptional(value: string) {
  return value.length > 0 ? value : null;
}

function withStatus(path: string, key: "error" | "message", value: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(key, value);
  return `${path}?${searchParams.toString()}`;
}

export async function createBankImportAction(formData: FormData) {
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageBank(context);
    const sourceName = getTrimmedField(formData, "sourceName");
    const note = getTrimmedField(formData, "note");
    const transactionsText = getTrimmedField(formData, "transactionsText");
    const fileValue = formData.get("statementFile");
    const statementFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (sourceName.length < 2) {
      throw new BankError("Import source name must be at least 2 characters.");
    }

    if (note.length > 4000) {
      throw new BankError("Import notes must stay under 4000 characters.");
    }

    if (!statementFile && !transactionsText) {
      throw new BankError("Upload a CSV file or paste manual transaction rows.");
    }

    if (statementFile && transactionsText) {
      throw new BankError("Use either CSV upload or manual pasted rows for one import batch.");
    }

    const transactionRows = statementFile
      ? parseCsvImportFile({
          fileName: statementFile.name,
          fileText: await statementFile.text(),
        })
      : parseManualImportLines(transactionsText);
    const supabase = await createSupabaseServerClient();
    const { data: importBatch, error: importError } = await supabase
      .from("bank_statement_imports")
      .insert({
        workspace_id: context.workspace.id,
        source_name: sourceName,
        note: normalizeOptional(note),
        imported_transaction_count: transactionRows.length,
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id")
      .single();

    if (importError || !importBatch) {
      throw new BankError("We could not create that bank import batch.");
    }

    const { error: transactionError } = await supabase
      .from("bank_transactions")
      .insert(
        transactionRows.map((row) => ({
          workspace_id: context.workspace.id,
          import_batch_id: importBatch.id,
          ...row,
        })),
      );

    if (transactionError) {
      throw new BankError("We could not save the imported bank transactions.");
    }

    redirect(
      withStatus(
        "/bank/imports",
        "message",
        `Imported ${transactionRows.length} bank transaction${transactionRows.length === 1 ? "" : "s"} from ${statementFile ? statementFile.name : "manual rows"}.`,
      ),
    );
  } catch (error) {
    const message =
      error instanceof BankError
        ? error.message
        : "We could not create that bank import batch.";

    redirect(withStatus("/bank/imports", "error", message));
  }
}

export async function reconcileBankTransactionAction(formData: FormData) {
  const transactionId = getTrimmedField(formData, "transactionId");
  const invoiceId = getTrimmedField(formData, "invoiceId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageBank(context);

    if (!invoiceId) {
      throw new BankError("Choose a finalized invoice to reconcile against.");
    }

    const transactionResult = await getBankTransactionById(context, transactionId);

    if (!transactionResult) {
      throw new BankError("That bank transaction is no longer available.");
    }

    if (transactionResult.transaction.amountCents <= 0) {
      throw new BankError(
        "Only positive bank transactions can be reconciled against invoices in this step.",
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, amount_cents, status")
      .eq("workspace_id", context.workspace.id)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      throw new BankError("Choose a finalized invoice from this workspace.");
    }

    if (invoice.status !== "finalized") {
      throw new BankError("Only finalized invoices can be reconciled.");
    }

    const { data: matchedTransactions, error: matchedError } = await supabase
      .from("invoice_payment_events")
      .select("id, amount_cents")
      .eq("workspace_id", context.workspace.id)
      .eq("invoice_id", invoiceId)
      .eq("source", "bank")
      .eq("status", "active");

    if (matchedError) {
      throw new BankError("We could not load existing reconciled bank transactions.");
    }

    const alreadyMatchedToSameInvoice = transactionResult.transaction.linkedInvoiceId === invoiceId;
    const previousInvoiceId =
      transactionResult.transaction.reconciliationStatus === "matched"
        ? transactionResult.transaction.linkedInvoiceId
        : null;
    const existingMatchedTotal = ((matchedTransactions ?? []) as Array<{
      id: string;
      amount_cents: number;
    }>).reduce((total, item) => {
      if (transactionResult.transaction.paymentEventId && item.id === transactionResult.transaction.paymentEventId) {
        return total;
      }

      return total + item.amount_cents;
    }, 0);
    const nextPaidTotal = existingMatchedTotal + transactionResult.transaction.amountCents;

    if (nextPaidTotal > invoice.amount_cents) {
      throw new BankError(
        "This reconciliation would exceed the invoice total. Adjust the invoice payment manually or choose another transaction.",
      );
    }

    const { error: transactionUpdateError } = await supabase
      .from("bank_transactions")
      .update({
        reconciliation_status: "matched",
        linked_invoice_id: invoiceId,
        reconciled_at: new Date().toISOString(),
        reconciled_by_user_id: context.user.id,
      })
      .eq("id", transactionId)
      .eq("workspace_id", context.workspace.id);

    if (transactionUpdateError) {
      throw new BankError("We could not reconcile that bank transaction.");
    }

    if (transactionResult.transaction.paymentEventId) {
      const { error: reverseError } = await supabase
        .from("invoice_payment_events")
        .update({
          status: "reversed",
          reversed_at: new Date().toISOString(),
          reversed_by_user_id: context.user.id,
          updated_by_user_id: context.user.id,
        })
        .eq("id", transactionResult.transaction.paymentEventId)
        .eq("workspace_id", context.workspace.id);

      if (reverseError) {
        throw new BankError("The bank transaction was updated, but the prior payment event could not be reversed.");
      }
    }

    const { error: paymentEventError } = await supabase
      .from("invoice_payment_events")
      .insert({
        workspace_id: context.workspace.id,
        invoice_id: invoiceId,
        source: "bank",
        status: "active",
        amount_cents: transactionResult.transaction.amountCents,
        payment_date: transactionResult.transaction.transactionDate,
        reference:
          normalizeOptional(transactionResult.transaction.reference ?? "") ??
          transactionResult.transaction.description,
        note: `Matched from bank import ${transactionResult.transaction.importSourceName}.`,
        bank_transaction_id: transactionId,
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id")
      .single();

    if (paymentEventError) {
      throw new BankError("The bank transaction was matched, but the payment event could not be saved.");
    }

    await syncInvoicePaymentSummary({
      workspaceId: context.workspace.id,
      invoiceId,
      updatedByUserId: context.user.id,
    });

    if (previousInvoiceId && previousInvoiceId !== invoiceId) {
      await syncInvoicePaymentSummary({
        workspaceId: context.workspace.id,
        invoiceId: previousInvoiceId,
        updatedByUserId: context.user.id,
      });
    }

    redirect(
      withStatus(
        `/bank/transactions/${transactionId}`,
        "message",
        alreadyMatchedToSameInvoice
          ? "Bank transaction reconciliation refreshed."
          : "Bank transaction matched to invoice and payment tracking updated.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof BankError
        ? error.message
        : "We could not reconcile that bank transaction.";

    redirect(withStatus(`/bank/transactions/${transactionId}`, "error", message));
  }
}

export async function unreconcileBankTransactionAction(formData: FormData) {
  const transactionId = getTrimmedField(formData, "transactionId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageBank(context);

    const transactionResult = await getBankTransactionById(context, transactionId);

    if (!transactionResult) {
      throw new BankError("That bank transaction is no longer available.");
    }

    if (transactionResult.transaction.reconciliationStatus !== "matched") {
      throw new BankError("Only matched bank transactions can be unreconciled.");
    }

    if (!transactionResult.transaction.linkedInvoiceId) {
      throw new BankError("This bank transaction does not have a linked invoice to remove.");
    }

    const linkedInvoiceId = transactionResult.transaction.linkedInvoiceId;
    const supabase = await createSupabaseServerClient();
    const timestamp = new Date().toISOString();
    const { error: transactionUpdateError } = await supabase
      .from("bank_transactions")
      .update({
        reconciliation_status: "unmatched",
        linked_invoice_id: null,
        reconciled_at: null,
        reconciled_by_user_id: null,
      })
      .eq("id", transactionId)
      .eq("workspace_id", context.workspace.id)
      .eq("reconciliation_status", "matched");

    if (transactionUpdateError) {
      throw new BankError("We could not remove that bank match.");
    }

    if (transactionResult.transaction.paymentEventId) {
      const { error: reverseError } = await supabase
        .from("invoice_payment_events")
        .update({
          status: "reversed",
          reversed_at: timestamp,
          reversed_by_user_id: context.user.id,
          updated_by_user_id: context.user.id,
        })
        .eq("id", transactionResult.transaction.paymentEventId)
        .eq("workspace_id", context.workspace.id)
        .eq("status", "active");

      if (reverseError) {
        throw new BankError("The bank match was removed, but the payment event could not be reversed.");
      }
    }

    await syncInvoicePaymentSummary({
      workspaceId: context.workspace.id,
      invoiceId: linkedInvoiceId,
      updatedByUserId: context.user.id,
    });

    redirect(
      withStatus(
        `/bank/transactions/${transactionId}`,
        "message",
        "Bank transaction unreconciled and invoice payment summary refreshed.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof BankError
        ? error.message
        : "We could not remove that bank match.";

    redirect(withStatus(`/bank/transactions/${transactionId}`, "error", message));
  }
}
