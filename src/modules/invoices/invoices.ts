import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceCustomerChoices } from "@/modules/customers/customers";
import type { CustomerChoice } from "@/modules/customers/types";
import { warnDeprecatedGroupNameUsage } from "@/modules/groups/deprecation";
import { getWorkspaceGroupChoices } from "@/modules/groups/groups";
import type { GroupChoice } from "@/modules/groups/types";
import { normalizeStoredLineItems } from "@/modules/line-items/line-items";
import { getInvoiceDeliveryEvents } from "@/modules/invoices/delivery-events";
import { getInvoicePaymentEvents } from "@/modules/invoices/payment-events";
import type {
  InvoiceDeliveryEventRecord,
  InvoiceDeliveryFollowUpFormValues,
  InvoiceDeliveryStatus,
  InvoiceDeliveryFormValues,
  InvoiceDeliveryMethod,
  InvoiceFormValues,
  InvoicePaymentFormValues,
  InvoicePaymentEventRecord,
  InvoicePaymentStatus,
  InvoiceRecord,
  InvoiceStatus,
} from "@/modules/invoices/types";

type InvoiceRow = {
  id: string;
  workspace_id: string;
  revenue_record_id: string;
  customer_id: string;
  group_id: string | null;
  group_name: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  delivery_status: InvoiceDeliveryStatus;
  payment_status: InvoicePaymentStatus;
  amount_cents: number;
  paid_amount_cents: number;
  currency: string;
  notes: string | null;
  delivery_recipient_email: string | null;
  delivery_reply_to_email: string | null;
  delivery_method: InvoiceDeliveryMethod | null;
  delivery_note: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  payment_note: string | null;
  line_items: unknown;
  finalized_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type RevenueSourceRow = {
  id: string;
  workspace_id: string;
  customer_id: string;
  group_id: string | null;
  group_name: string | null;
  service_date: string;
  status: "draft" | "open";
  amount_cents: number;
  currency: string;
  notes: string | null;
  line_items: unknown;
};

export class InvoicesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoicesError";
  }
}

function canManageInvoices(context: AuthenticatedAppContext) {
  return (
    context.workspace.role === "owner" || context.workspace.role === "admin"
  );
}

function buildCustomerMap(customers: CustomerChoice[]) {
  return new Map(customers.map((customer) => [customer.id, customer]));
}

function buildGroupMap(groups: GroupChoice[]) {
  return new Map(groups.map((group) => [group.id, group]));
}

function toInvoiceRecord(
  row: InvoiceRow,
  customersById: Map<string, CustomerChoice>,
  groupsById: Map<string, GroupChoice>,
): InvoiceRecord {
  const customer = customersById.get(row.customer_id);
  const group = row.group_id ? groupsById.get(row.group_id) ?? null : null;

  warnDeprecatedGroupNameUsage({
    module: "invoices.toInvoiceRecord",
    recordId: row.id,
    groupName: row.group_name,
    groupId: row.group_id,
  });

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    revenueRecordId: row.revenue_record_id,
    customerId: row.customer_id,
    customerName: customer?.name ?? "Unknown customer",
    customerCompany: customer?.company ?? null,
    customerEmail: customer?.email ?? null,
    groupId: row.group_id,
    groupName: group?.name ?? null,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    status: row.status,
    deliveryStatus: row.delivery_status,
    paymentStatus: row.payment_status,
    amountCents: row.amount_cents,
    paidAmountCents: row.paid_amount_cents,
    currency: row.currency,
    notes: row.notes,
    deliveryRecipientEmail: row.delivery_recipient_email,
    deliveryReplyToEmail: row.delivery_reply_to_email,
    deliveryMethod: row.delivery_method,
    deliveryNote: row.delivery_note,
    paymentDate: row.payment_date,
    paymentReference: row.payment_reference,
    paymentNote: row.payment_note,
    lineItems: normalizeStoredLineItems(row.line_items),
    finalizedAt: row.finalized_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getInvoiceFormDefaults(
  invoice?: InvoiceRecord | null,
): InvoiceFormValues {
  return {
    invoiceDate: invoice?.invoiceDate ?? "",
    dueDate: invoice?.dueDate ?? "",
    notes: invoice?.notes ?? "",
  };
}

export function getInvoicePaymentFormDefaults(): InvoicePaymentFormValues {
  return {
    paidAmount: "",
    paymentDate: "",
    paymentReference: "",
    paymentNote: "",
  };
}

export function getInvoiceDeliveryFormDefaults(
  invoice?: InvoiceRecord | null,
): InvoiceDeliveryFormValues {
  return {
    recipientEmail:
      invoice?.deliveryRecipientEmail ?? invoice?.customerEmail ?? "",
    deliveryNote: invoice?.deliveryNote ?? "",
  };
}

export function getInvoiceDeliveryFollowUpFormDefaults(
  invoice?: InvoiceRecord | null,
): InvoiceDeliveryFollowUpFormValues {
  return {
    recipientEmail:
      invoice?.deliveryRecipientEmail ?? invoice?.customerEmail ?? "",
    actionType: "resend",
    deliveryNote: invoice?.deliveryNote ?? "",
  };
}

export function assertCanManageInvoices(context: AuthenticatedAppContext) {
  if (!canManageInvoices(context)) {
    throw new InvoicesError(
      "Only workspace owners and admins can manage invoice drafts and finalization.",
    );
  }
}

export async function getInvoicesList(context: AuthenticatedAppContext) {
  const supabase = await createSupabaseServerClient();
  const [customers, groups, invoicesResponse] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
    supabase
      .from("invoices")
      .select(
        "id, workspace_id, revenue_record_id, customer_id, group_id, group_name, invoice_number, invoice_date, due_date, status, delivery_status, payment_status, amount_cents, paid_amount_cents, currency, notes, delivery_recipient_email, delivery_reply_to_email, delivery_method, delivery_note, payment_date, payment_reference, payment_note, line_items, finalized_at, sent_at, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .order("invoice_date", { ascending: false })
      .order("updated_at", { ascending: false }),
  ]);

  const { data, error } = invoicesResponse;

  if (error) {
    throw new InvoicesError("We could not load invoices right now.");
  }

  const customersById = buildCustomerMap(customers);
  const groupsById = buildGroupMap(groups);

  return {
    canManageInvoices: canManageInvoices(context),
    invoices: ((data ?? []) as InvoiceRow[]).map((row) =>
      toInvoiceRecord(row, customersById, groupsById),
    ),
  };
}

export async function getInvoiceById(
  context: AuthenticatedAppContext,
  invoiceId: string,
): Promise<{
  canManageInvoices: boolean;
  invoice: InvoiceRecord;
  paymentEvents: InvoicePaymentEventRecord[];
  deliveryEvents: InvoiceDeliveryEventRecord[];
} | null> {
  const supabase = await createSupabaseServerClient();
  const [customers, groups, invoiceResponse, paymentEvents, deliveryEvents] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
    supabase
      .from("invoices")
      .select(
        "id, workspace_id, revenue_record_id, customer_id, group_id, group_name, invoice_number, invoice_date, due_date, status, delivery_status, payment_status, amount_cents, paid_amount_cents, currency, notes, delivery_recipient_email, delivery_reply_to_email, delivery_method, delivery_note, payment_date, payment_reference, payment_note, line_items, finalized_at, sent_at, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .eq("id", invoiceId)
      .maybeSingle(),
    getInvoicePaymentEvents(context.workspace.id, invoiceId),
    getInvoiceDeliveryEvents(context.workspace.id, invoiceId),
  ]);

  const { data, error } = invoiceResponse;

  if (error) {
    throw new InvoicesError("We could not load that invoice right now.");
  }

  if (!data) {
    return null;
  }

  const customersById = buildCustomerMap(customers);
  const groupsById = buildGroupMap(groups);

  return {
    canManageInvoices: canManageInvoices(context),
    invoice: toInvoiceRecord(data as InvoiceRow, customersById, groupsById),
    paymentEvents,
    deliveryEvents,
  };
}

export async function getInvoiceByRevenueRecordId(
  context: AuthenticatedAppContext,
  revenueRecordId: string,
) {
  const supabase = await createSupabaseServerClient();
  const [customers, groups, invoiceResponse] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
    supabase
      .from("invoices")
      .select(
        "id, workspace_id, revenue_record_id, customer_id, group_id, group_name, invoice_number, invoice_date, due_date, status, delivery_status, payment_status, amount_cents, paid_amount_cents, currency, notes, delivery_recipient_email, delivery_reply_to_email, delivery_method, delivery_note, payment_date, payment_reference, payment_note, line_items, finalized_at, sent_at, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .eq("revenue_record_id", revenueRecordId)
      .maybeSingle(),
  ]);

  const { data, error } = invoiceResponse;

  if (error) {
    throw new InvoicesError("We could not load the linked invoice right now.");
  }

  if (!data) {
    return null;
  }

  const customersById = buildCustomerMap(customers);
  const groupsById = buildGroupMap(groups);

  return toInvoiceRecord(data as InvoiceRow, customersById, groupsById);
}

export async function getRevenueSourceForInvoiceDraft(
  context: AuthenticatedAppContext,
  revenueRecordId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revenue_records")
    .select(
      "id, workspace_id, customer_id, group_id, group_name, service_date, status, amount_cents, currency, notes, line_items",
    )
    .eq("workspace_id", context.workspace.id)
    .eq("id", revenueRecordId)
    .maybeSingle();

  if (error) {
    throw new InvoicesError("We could not load that revenue record right now.");
  }

  if (!data) {
    throw new InvoicesError("Choose a revenue record from this workspace.");
  }

  return data as RevenueSourceRow;
}
