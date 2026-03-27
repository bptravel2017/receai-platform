import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  InvoicePaymentEventRecord,
  InvoicePaymentStatus,
} from "@/modules/invoices/types";
import { InvoicesError } from "@/modules/invoices/invoices";

type InvoicePaymentEventRow = {
  id: string;
  workspace_id: string;
  invoice_id: string;
  source: "manual" | "bank";
  status: "active" | "reversed";
  amount_cents: number;
  payment_date: string;
  reference: string | null;
  note: string | null;
  bank_transaction_id: string | null;
  reversed_at: string | null;
  created_at: string;
};

function toInvoicePaymentEventRecord(
  row: InvoicePaymentEventRow,
): InvoicePaymentEventRecord {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    source: row.source,
    status: row.status,
    amountCents: row.amount_cents,
    paymentDate: row.payment_date,
    reference: row.reference,
    note: row.note,
    bankTransactionId: row.bank_transaction_id,
    reversedAt: row.reversed_at,
    createdAt: row.created_at,
  };
}

export function deriveInvoicePaymentStatus(
  paidAmountCents: number,
  invoiceAmountCents: number,
): InvoicePaymentStatus {
  if (paidAmountCents <= 0) {
    return "unpaid";
  }

  if (paidAmountCents < invoiceAmountCents) {
    return "partial";
  }

  return "paid";
}

export async function getInvoicePaymentEvents(
  workspaceId: string,
  invoiceId: string,
): Promise<InvoicePaymentEventRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoice_payment_events")
    .select(
      "id, workspace_id, invoice_id, source, status, amount_cents, payment_date, reference, note, bank_transaction_id, reversed_at, created_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new InvoicesError("We could not load payment history for that invoice.");
  }

  return ((data ?? []) as InvoicePaymentEventRow[]).map(toInvoicePaymentEventRecord);
}

export async function syncInvoicePaymentSummary(args: {
  workspaceId: string;
  invoiceId: string;
  updatedByUserId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const [invoiceResponse, eventResponse] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, amount_cents")
      .eq("workspace_id", args.workspaceId)
      .eq("id", args.invoiceId)
      .maybeSingle(),
    supabase
      .from("invoice_payment_events")
      .select(
        "amount_cents, payment_date, reference, note, created_at, status",
      )
      .eq("workspace_id", args.workspaceId)
      .eq("invoice_id", args.invoiceId)
      .eq("status", "active"),
  ]);

  if (invoiceResponse.error || !invoiceResponse.data) {
    throw new InvoicesError("We could not refresh invoice payment summary.");
  }

  if (eventResponse.error) {
    throw new InvoicesError("We could not refresh invoice payment summary.");
  }

  const events = (eventResponse.data ?? []) as Array<{
    amount_cents: number;
    payment_date: string;
    reference: string | null;
    note: string | null;
    created_at: string;
    status: "active";
  }>;

  const paidAmountCents = events.reduce((total, event) => total + event.amount_cents, 0);
  const latestEvent = [...events].sort((left, right) => {
    const dateCompare = right.payment_date.localeCompare(left.payment_date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.created_at.localeCompare(left.created_at);
  })[0] ?? null;
  const paymentStatus = deriveInvoicePaymentStatus(
    paidAmountCents,
    invoiceResponse.data.amount_cents as number,
  );
  const summaryNote =
    events.length === 0
      ? null
      : events.length === 1
        ? latestEvent?.note ?? null
        : `Derived from ${events.length} active payment events.`;

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      payment_status: paymentStatus,
      paid_amount_cents: paidAmountCents,
      payment_date: latestEvent?.payment_date ?? null,
      payment_reference: latestEvent?.reference ?? null,
      payment_note: summaryNote,
      updated_by_user_id: args.updatedByUserId,
    })
    .eq("id", args.invoiceId)
    .eq("workspace_id", args.workspaceId);

  if (updateError) {
    throw new InvoicesError("We could not refresh invoice payment summary.");
  }
}
