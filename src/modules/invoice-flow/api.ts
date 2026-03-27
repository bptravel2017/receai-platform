import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertCanManageCustomers,
  CustomersError,
} from "@/modules/customers/customers";
import { warnDeprecatedGroupNameUsage } from "@/modules/groups/deprecation";
import {
  getWorkspaceGroupChoicesForWorkspace,
} from "@/modules/groups/groups";
import {
  assertCanManageInvoices,
  getInvoiceById,
  getInvoiceByRevenueRecordId,
  getInvoicesList,
  getRevenueSourceForInvoiceDraft,
  InvoicesError,
} from "@/modules/invoices/invoices";
import { syncInvoicePaymentSummary } from "@/modules/invoices/payment-events";
import {
  LineItemsError,
  normalizeStoredLineItems,
  parseLineItemsJson,
  sumLineItemsAmount,
} from "@/modules/line-items/line-items";
import {
  assertUsageAllowed,
  logWorkspaceUsage,
  UsageLimitError,
} from "@/modules/billing/usage";
import { FeatureAccessError } from "@/modules/plans/access";
import {
  assertCanManageRevenue,
  RevenueError,
} from "@/modules/revenue/revenue";

type JsonRecord = Record<string, unknown>;

type CustomerInsertRow = {
  id: string;
  workspace_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RevenueInsertRow = {
  id: string;
  workspace_id: string;
  customer_id: string;
  group_id: string | null;
  group_name: string | null;
  service_date: string;
  entry_type: RevenueFlowType;
  billing_state: "not_needed" | "unbilled" | "billed";
  invoice_id: string | null;
  fulfillment_party_type: "driver" | "vendor" | "guide" | "operator" | null;
  fulfillment_party_id: string | null;
  status: "draft" | "open";
  amount_cents: number;
  currency: string;
  notes: string | null;
  line_items: unknown;
  created_at: string;
  updated_at: string;
};

type InvoiceInsertRow = {
  id: string;
  workspace_id: string;
  revenue_record_id: string;
  customer_id: string;
  group_id: string | null;
  group_name: string | null;
  invoice_date: string;
  due_date: string | null;
  status: "draft" | "finalized";
  amount_cents: number;
  currency: string;
  notes: string | null;
  line_items: unknown;
  created_at: string;
  updated_at: string;
};

type PaymentEventInsertRow = {
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
  created_at: string;
  updated_at: string;
};

export type RevenueFlowType = "daytime" | "transfer" | "custom";

export class InvoiceFlowApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "InvoiceFlowApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function assertObject(value: unknown, message: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvoiceFlowApiError(400, "invalid_body", message);
  }

  return value as JsonRecord;
}

function getString(
  record: JsonRecord,
  key: string,
  { required = false }: { required?: boolean } = {},
) {
  const value = record[key];

  if (typeof value !== "string") {
    if (required) {
      throw new InvoiceFlowApiError(
        422,
        "validation_error",
        `${key} must be a non-empty string.`,
      );
    }

    return "";
  }

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      `${key} must be a non-empty string.`,
    );
  }

  return trimmed;
}

function getOptionalString(record: JsonRecord, key: string) {
  const value = getString(record, key);
  return value.length > 0 ? value : null;
}

function getDateString(
  record: JsonRecord,
  key: string,
  { required = false }: { required?: boolean } = {},
) {
  const value = getString(record, key, { required });

  if (!value) {
    return "";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      `${key} must use YYYY-MM-DD format.`,
    );
  }

  return value;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeOptional(value: string | null) {
  return value && value.length > 0 ? value : null;
}

function getBillingStateForType(
  type: RevenueFlowType,
): "not_needed" | "unbilled" | "billed" {
  return type === "daytime" ? "unbilled" : "not_needed";
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseRevenueFlowType(record: JsonRecord): RevenueFlowType {
  const type = getString(record, "type", { required: true });

  if (type !== "daytime" && type !== "transfer" && type !== "custom") {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "type must be one of: daytime, transfer, custom.",
    );
  }

  return type;
}

function parseRevenueStatus(record: JsonRecord) {
  const status = getString(record, "status") || "draft";

  if (status !== "draft" && status !== "open") {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "status must be either draft or open.",
    );
  }

  return status;
}

function parseLineItemsPayload(record: JsonRecord) {
  const value = record.lineItems;

  if (!Array.isArray(value)) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "lineItems must be an array.",
    );
  }

  const normalized = value.map((item, index) => {
    const lineItem = assertObject(item, `lineItems[${index}] must be an object.`);
    const quantity = lineItem.quantity;
    const unitPrice = lineItem.unitPrice;

    return {
      id:
        typeof lineItem.id === "string" && lineItem.id.trim().length > 0
          ? lineItem.id.trim()
          : `line-item-${index + 1}`,
      title: getString(lineItem, "title", { required: true }),
      description: getString(lineItem, "description"),
      quantity:
        typeof quantity === "number" || typeof quantity === "string"
          ? String(quantity)
          : "",
      unitPrice:
        typeof unitPrice === "number" || typeof unitPrice === "string"
          ? String(unitPrice)
          : "",
      serviceDate: getString(lineItem, "serviceDate"),
    };
  });

  try {
    return parseLineItemsJson(JSON.stringify(normalized));
  } catch (error) {
    if (error instanceof LineItemsError) {
      throw new InvoiceFlowApiError(422, "validation_error", error.message);
    }

    throw error;
  }
}

function parseAmountCents(record: JsonRecord) {
  const amountCents = record.amountCents;

  if (typeof amountCents === "number") {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new InvoiceFlowApiError(
        422,
        "validation_error",
        "amountCents must be a positive integer.",
      );
    }

    return amountCents;
  }

  const amount = record.amount;

  if (typeof amount !== "number" && typeof amount !== "string") {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "Provide either amountCents or amount.",
    );
  }

  const amountValue =
    typeof amount === "number" ? amount.toString() : amount.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(amountValue)) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "amount must be a positive number with up to 2 decimals.",
    );
  }

  const cents = Math.round(Number(amountValue) * 100);

  if (cents <= 0) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "amount must be greater than zero.",
    );
  }

  return cents;
}

function mapCustomer(row: CustomerInsertRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRevenue(row: RevenueInsertRow, type: RevenueFlowType) {
  warnDeprecatedGroupNameUsage({
    module: "invoice-flow.mapRevenue",
    recordId: row.id,
    groupName: row.group_name,
    groupId: row.group_id,
  });

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    customerId: row.customer_id,
    groupId: row.group_id,
    groupName: null,
    serviceDate: row.service_date,
    entryType: row.entry_type ?? type,
    billingState: row.billing_state,
    invoiceId: row.invoice_id,
    fulfillmentPartyType: row.fulfillment_party_type,
    fulfillmentPartyId: row.fulfillment_party_id,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    notes: row.notes,
    lineItems: normalizeStoredLineItems(row.line_items),
    type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoiceInsert(row: InvoiceInsertRow) {
  warnDeprecatedGroupNameUsage({
    module: "invoice-flow.mapInvoiceInsert",
    recordId: row.id,
    groupName: row.group_name,
    groupId: row.group_id,
  });

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    revenueRecordId: row.revenue_record_id,
    customerId: row.customer_id,
    groupId: row.group_id,
    groupName: null,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    notes: row.notes,
    lineItems: normalizeStoredLineItems(row.line_items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPaymentEvent(row: PaymentEventInsertRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    invoiceId: row.invoice_id,
    source: row.source,
    status: row.status,
    amountCents: row.amount_cents,
    paymentDate: row.payment_date,
    reference: row.reference,
    note: row.note,
    bankTransactionId: row.bank_transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertWorkspaceCustomer(
  context: AuthenticatedAppContext,
  customerId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("workspace_id", context.workspace.id)
    .eq("id", customerId)
    .maybeSingle();

  if (error || !data) {
    throw new InvoiceFlowApiError(
      404,
      "customer_not_found",
      "Customer was not found in the current workspace.",
    );
  }
}

async function assertWorkspaceGroup(
  context: AuthenticatedAppContext,
  groupId: string,
) {
  const groups = await getWorkspaceGroupChoicesForWorkspace(context.workspace.id);
  const group = groups.find((value) => value.id === groupId) ?? null;

  if (!group) {
    throw new InvoiceFlowApiError(
      404,
      "group_not_found",
      "Group was not found in the current workspace.",
    );
  }

  return group;
}

async function assertWorkspaceBankTransaction(
  context: AuthenticatedAppContext,
  bankTransactionId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_transactions")
    .select("id")
    .eq("workspace_id", context.workspace.id)
    .eq("id", bankTransactionId)
    .maybeSingle();

  if (error || !data) {
    throw new InvoiceFlowApiError(
      404,
      "bank_transaction_not_found",
      "Bank transaction was not found in the current workspace.",
    );
  }
}

export async function createCustomerRecord(
  context: AuthenticatedAppContext,
  payload: unknown,
) {
  assertCanManageCustomers(context);
  await assertUsageAllowed(context.workspace.id, "customer_created");

  const body = assertObject(payload, "Customer payload must be an object.");
  const name = getString(body, "name", { required: true });
  const company = getOptionalString(body, "company");
  const email = getOptionalString(body, "email");
  const phone = getOptionalString(body, "phone");
  const notes = getOptionalString(body, "notes");

  if (name.length < 2) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "name must be at least 2 characters.",
    );
  }

  if (email && !isValidEmail(email)) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "email must be a valid email address.",
    );
  }

  if ((notes ?? "").length > 4000) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "notes must stay under 4000 characters.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      workspace_id: context.workspace.id,
      name,
      company,
      email,
      phone,
      notes,
      created_by_user_id: context.user.id,
      updated_by_user_id: context.user.id,
    })
    .select(
      "id, workspace_id, name, company, email, phone, notes, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new InvoiceFlowApiError(
      500,
      "customer_create_failed",
      "We could not create that customer.",
    );
  }

  await logWorkspaceUsage(context.workspace.id, "customer_created");

  return mapCustomer(data as CustomerInsertRow);
}

export async function createRevenueRecord(
  context: AuthenticatedAppContext,
  payload: unknown,
) {
  assertCanManageRevenue(context);
  await assertUsageAllowed(context.workspace.id, "daytime_created");

  const body = assertObject(payload, "Revenue payload must be an object.");
  if (typeof body.groupName === "string" && body.groupName.trim().length > 0) {
    console.warn(
      "[groups] Deprecated groupName payload received in createRevenueRecord. group_id is required for linkage logic.",
    );
  }

  const type = parseRevenueFlowType(body);
  const customerId = getString(body, "customerId", { required: true });
  const groupId = getOptionalString(body, "groupId");
  const serviceDate = getDateString(body, "serviceDate", { required: true });
  const notes = getOptionalString(body, "notes");
  const status = parseRevenueStatus(body);
  const lineItems = parseLineItemsPayload(body);
  const fulfillmentPartyType = getOptionalString(body, "fulfillmentPartyType");
  const fulfillmentPartyId = getOptionalString(body, "fulfillmentPartyId");

  if ((notes ?? "").length > 4000) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "notes must stay under 4000 characters.",
    );
  }

  await assertWorkspaceCustomer(context, customerId);
  const group = groupId ? await assertWorkspaceGroup(context, groupId) : null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revenue_records")
    .insert({
      workspace_id: context.workspace.id,
      customer_id: customerId,
      group_id: group?.id ?? null,
      service_date: serviceDate,
      entry_type: type,
      billing_state: getBillingStateForType(type),
      fulfillment_party_type: normalizeOptional(fulfillmentPartyType),
      fulfillment_party_id: normalizeOptional(fulfillmentPartyId),
      status,
      amount_cents: sumLineItemsAmount(lineItems),
      currency: "USD",
      notes,
      line_items: lineItems,
      created_by_user_id: context.user.id,
      updated_by_user_id: context.user.id,
    })
    .select(
      "id, workspace_id, customer_id, group_id, group_name, service_date, entry_type, billing_state, invoice_id, fulfillment_party_type, fulfillment_party_id, status, amount_cents, currency, notes, line_items, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new InvoiceFlowApiError(
      500,
      "revenue_create_failed",
      "We could not create that revenue record.",
    );
  }

  await logWorkspaceUsage(context.workspace.id, "daytime_created");

  return mapRevenue(data as RevenueInsertRow, type);
}

export async function createInvoiceFromRevenueRecord(
  context: AuthenticatedAppContext,
  payload: unknown,
) {
  assertCanManageInvoices(context);

  const body = assertObject(payload, "Invoice payload must be an object.");
  if (typeof body.groupName === "string" && body.groupName.trim().length > 0) {
    console.warn(
      "[groups] Deprecated groupName payload received in createInvoiceFromRevenueRecord. group_id is the only supported logical group key.",
    );
  }

  const revenueRecordIdsValue = body.revenueRecordIds;
  let revenueRecordId = getString(body, "revenueRecordId");

  if (Array.isArray(revenueRecordIdsValue)) {
    if (revenueRecordIdsValue.length !== 1) {
      throw new InvoiceFlowApiError(
        422,
        "validation_error",
        "This scaffold supports creating one invoice from one revenue record at a time.",
      );
    }

    const [firstId] = revenueRecordIdsValue;

    if (typeof firstId !== "string" || firstId.trim().length === 0) {
      throw new InvoiceFlowApiError(
        422,
        "validation_error",
        "revenueRecordIds[0] must be a non-empty string.",
      );
    }

    revenueRecordId = firstId.trim();
  }

  if (!revenueRecordId) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "Provide revenueRecordId.",
    );
  }

  const existingInvoice = await getInvoiceByRevenueRecordId(context, revenueRecordId);

  if (existingInvoice) {
    throw new InvoiceFlowApiError(
      409,
      "invoice_exists",
      "An invoice already exists for this revenue record.",
      { invoiceId: existingInvoice.id },
    );
  }

  await assertUsageAllowed(context.workspace.id, "invoice_created");

  const revenue = await getRevenueSourceForInvoiceDraft(context, revenueRecordId);
  const invoiceDate =
    getDateString(body, "invoiceDate") || revenue.service_date;
  const dueDate =
    getDateString(body, "dueDate") || addDays(invoiceDate, 14);
  const notes = getOptionalString(body, "notes") ?? revenue.notes;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      workspace_id: context.workspace.id,
      revenue_record_id: revenue.id,
      customer_id: revenue.customer_id,
      group_id: revenue.group_id,
      invoice_date: invoiceDate,
      due_date: dueDate,
      status: "draft",
      amount_cents: revenue.amount_cents,
      currency: revenue.currency,
      notes,
      line_items: Array.isArray(revenue.line_items) ? revenue.line_items : [],
      created_by_user_id: context.user.id,
      updated_by_user_id: context.user.id,
    })
    .select(
      "id, workspace_id, revenue_record_id, customer_id, group_id, group_name, invoice_date, due_date, status, amount_cents, currency, notes, line_items, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new InvoiceFlowApiError(
      500,
      "invoice_create_failed",
      "We could not create that invoice.",
    );
  }

  await supabase
    .from("revenue_records")
    .update({
      billing_state: "billed",
      invoice_id: (data as InvoiceInsertRow).id,
      updated_by_user_id: context.user.id,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("id", revenue.id);

  const invoiceDetails = await getInvoiceById(context, (data as InvoiceInsertRow).id);
  await logWorkspaceUsage(context.workspace.id, "invoice_created");

  return {
    invoice: invoiceDetails?.invoice ?? mapInvoiceInsert(data as InvoiceInsertRow),
  };
}

export async function createInvoiceFromDaytimeEntries(
  context: AuthenticatedAppContext,
  payload: unknown,
) {
  assertCanManageInvoices(context);
  await assertUsageAllowed(context.workspace.id, "invoice_created");

  const body = assertObject(payload, "Invoice payload must be an object.");
  const entryIdsValue = body.entry_ids;

  if (!Array.isArray(entryIdsValue) || entryIdsValue.length === 0) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "entry_ids must be a non-empty array.",
    );
  }

  const entryIds = entryIdsValue.map((value, index) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new InvoiceFlowApiError(
        422,
        "validation_error",
        `entry_ids[${index}] must be a non-empty string.`,
      );
    }

    return value.trim();
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_invoice_from_daytime_entries", {
    p_workspace_id: context.workspace.id,
    p_entry_ids: entryIds,
  });

  if (error || typeof data !== "string" || data.length === 0) {
    throw new InvoiceFlowApiError(
      422,
      "invoice_create_failed",
      error?.message || "We could not create that invoice from the selected Daytime entries.",
    );
  }

  const invoiceDetails = await getInvoiceById(context, data);
  await logWorkspaceUsage(context.workspace.id, "invoice_created");

  return {
    invoice: invoiceDetails?.invoice,
    invoiceId: data,
  };
}

export async function listWorkspaceInvoices(context: AuthenticatedAppContext) {
  const result = await getInvoicesList(context);

  return {
    invoices: result.invoices,
  };
}

export async function recordInvoicePaymentEvent(
  context: AuthenticatedAppContext,
  payload: unknown,
) {
  assertCanManageInvoices(context);

  const body = assertObject(payload, "Payment payload must be an object.");
  const invoiceId = getString(body, "invoiceId", { required: true });
  const sourceValue = getString(body, "source") || "manual";
  const paymentDate =
    getDateString(body, "paymentDate") || new Date().toISOString().slice(0, 10);
  const reference = getOptionalString(body, "reference");
  const note = getOptionalString(body, "note");
  const bankTransactionId = getOptionalString(body, "bankTransactionId");
  const amountCents = parseAmountCents(body);

  if (sourceValue !== "manual" && sourceValue !== "bank") {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "source must be either manual or bank.",
    );
  }

  const invoiceDetails = await getInvoiceById(context, invoiceId);

  if (!invoiceDetails) {
    throw new InvoiceFlowApiError(
      404,
      "invoice_not_found",
      "Invoice was not found in the current workspace.",
    );
  }

  if (sourceValue === "bank" && !bankTransactionId) {
    throw new InvoiceFlowApiError(
      422,
      "validation_error",
      "bankTransactionId is required when source is bank.",
    );
  }

  if (bankTransactionId) {
    await assertWorkspaceBankTransaction(context, bankTransactionId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoice_payment_events")
    .insert({
      workspace_id: context.workspace.id,
      invoice_id: invoiceId,
      source: sourceValue,
      status: "active",
      amount_cents: amountCents,
      payment_date: paymentDate,
      reference,
      note,
      bank_transaction_id: bankTransactionId,
      created_by_user_id: context.user.id,
      updated_by_user_id: context.user.id,
    })
    .select(
      "id, workspace_id, invoice_id, source, status, amount_cents, payment_date, reference, note, bank_transaction_id, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new InvoiceFlowApiError(
      500,
      "payment_record_failed",
      "We could not record that payment event.",
    );
  }

  await syncInvoicePaymentSummary({
    workspaceId: context.workspace.id,
    invoiceId,
    updatedByUserId: context.user.id,
  });

  const refreshedInvoice = await getInvoiceById(context, invoiceId);

  return {
    paymentEvent: mapPaymentEvent(data as PaymentEventInsertRow),
    invoice: refreshedInvoice?.invoice ?? invoiceDetails.invoice,
  };
}

export function toRouteErrorResponse(error: unknown) {
  if (error instanceof UsageLimitError) {
    return {
      status: error.status,
      code: "usage_limit_reached",
      message: error.message,
      details: {
        eventType: error.eventType,
        limit: error.limit,
        used: error.used,
        remaining: error.remaining,
      },
    };
  }

  if (error instanceof FeatureAccessError) {
    return {
      status: error.status,
      code: "feature_forbidden",
      message: error.message,
      details: {
        feature: error.feature,
        requiredPlan: error.requiredPlan,
        currentPlan: error.currentPlan,
      },
    };
  }

  if (error instanceof InvoiceFlowApiError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (
    error instanceof CustomersError ||
    error instanceof RevenueError ||
    error instanceof InvoicesError
  ) {
    const isPermissionError = error.message.startsWith(
      "Only workspace owners and admins",
    );

    return {
      status: isPermissionError ? 403 : 422,
      code: isPermissionError ? "forbidden" : "validation_error",
      message: error.message,
      details: undefined,
    };
  }

  if (error instanceof Error && error.message === "Request body must be valid JSON.") {
    return {
      status: 400,
      code: "invalid_json",
      message: error.message,
      details: undefined,
    };
  }

  return {
    status: 500,
    code: "internal_error",
    message: "An unexpected error occurred.",
    details: undefined,
  };
}
