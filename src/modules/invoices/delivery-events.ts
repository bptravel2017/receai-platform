import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { InvoiceDeliveryEventRecord } from "@/modules/invoices/types";
import { InvoicesError } from "@/modules/invoices/invoices";

type InvoiceDeliveryEventRow = {
  id: string;
  invoice_id: string;
  action_type: "send" | "resend" | "reminder";
  delivery_status: "sent" | "failed";
  delivery_method: "manual_share" | "external_email" | "platform_email";
  recipient_email: string | null;
  reply_to_email: string | null;
  note: string | null;
  error_message: string | null;
  provider_message_id: string | null;
  created_at: string;
};

function toInvoiceDeliveryEventRecord(
  row: InvoiceDeliveryEventRow,
): InvoiceDeliveryEventRecord {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    actionType: row.action_type,
    deliveryStatus: row.delivery_status,
    deliveryMethod: row.delivery_method,
    recipientEmail: row.recipient_email,
    replyToEmail: row.reply_to_email,
    note: row.note,
    errorMessage: row.error_message,
    providerMessageId: row.provider_message_id,
    createdAt: row.created_at,
  };
}

export async function getInvoiceDeliveryEvents(
  workspaceId: string,
  invoiceId: string,
): Promise<InvoiceDeliveryEventRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoice_delivery_events")
    .select(
      "id, invoice_id, action_type, delivery_status, delivery_method, recipient_email, reply_to_email, note, error_message, provider_message_id, created_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new InvoicesError("We could not load invoice delivery history right now.");
  }

  return ((data ?? []) as InvoiceDeliveryEventRow[]).map(
    toInvoiceDeliveryEventRecord,
  );
}
