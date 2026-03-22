import type {
  Customer,
  CustomerCreateInput,
  GenerateInvoiceInput,
  Invoice,
  InvoiceItem,
  RevenueItem,
  RevenueItemInput,
  RevenueRecord,
  RevenueRecordCreateInput,
  RevenueRecordType,
} from "@/lib/saas-types";
import type { Database, Json } from "@/lib/supabase";
import {
  SupabaseConnectionError,
  assertSupabaseConnection,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { normalizeCurrency, nowIso, roundMoney, toOptionalString } from "@/lib/saas-utils";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type RevenueRecordRow = Database["public"]["Tables"]["revenue_records"]["Row"];
type RevenueRecordInsert = Database["public"]["Tables"]["revenue_records"]["Insert"];
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
type JsonScalar = string | number | boolean | null;
type SupabaseErrorLike = { message: string; code?: string | null; details?: string | null };

export class SaaSValidationError extends Error {
  statusCode = 400;
}

export class SaaSNotFoundError extends Error {
  statusCode = 404;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new SaaSValidationError(`${field} is required.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new SaaSValidationError(`${field} is required.`);
  }

  return trimmed;
}

function requireRevenueType(value: unknown): RevenueRecordType {
  if (value === "daytime" || value === "transfer" || value === "other") {
    return value;
  }

  throw new SaaSValidationError("type must be daytime, transfer, or other.");
}

function normalizeAmount(value: unknown, field: string): number {
  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {
    throw new SaaSValidationError(`${field} must be a valid number.`);
  }

  if (amount < 0) {
    throw new SaaSValidationError(`${field} cannot be negative.`);
  }

  return roundMoney(amount);
}

function normalizeQuantity(value: unknown): number {
  if (value === undefined) {
    return 1;
  }

  const quantity = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new SaaSValidationError("quantity must be greater than zero.");
  }

  return quantity;
}

function normalizeMetadata(
  metadata: RevenueItemInput["metadata"],
): Record<string, JsonScalar> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, value as JsonScalar]),
  );
}

function normalizeItem(input: RevenueItemInput, index: number): RevenueItem {
  const label = requireString(input.label, `items[${index}].label`);
  const quantity = normalizeQuantity(input.quantity);
  const unitAmount =
    input.unitAmount !== undefined
      ? normalizeAmount(input.unitAmount, `items[${index}].unitAmount`)
      : input.amount !== undefined
        ? roundMoney(normalizeAmount(input.amount, `items[${index}].amount`) / quantity)
        : 0;
  const amount =
    input.amount !== undefined
      ? normalizeAmount(input.amount, `items[${index}].amount`)
      : roundMoney(quantity * unitAmount);

  return {
    id: crypto.randomUUID(),
    kind: input.kind ?? "other",
    label,
    quantity,
    unitAmount: roundMoney(unitAmount),
    amount,
    metadata: normalizeMetadata(input.metadata),
  };
}

function calculateTotalAmount(items: RevenueItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
}

function handleSupabaseError(error: SupabaseErrorLike | null): void {
  if (!error) {
    return;
  }

  if (
    error.message.includes("permission denied for schema public") ||
    error.message.includes('permission denied for table "customers"') ||
    error.message.includes('permission denied for relation "customers"')
  ) {
    throw new SupabaseConnectionError(
      "Supabase admin access failed for the public.customers table. Confirm the backend is using SUPABASE_SERVICE_ROLE_KEY instead of an anon key.",
    );
  }

  throw new Error(error.message);
}

function isUniqueRevenueInvoiceConflict(error: SupabaseErrorLike | null): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "23505" &&
    (error.message.includes("revenue_record_id") ||
      error.details?.includes("revenue_record_id") ||
      error.message.includes("invoices_revenue_record_id_key"))
  );
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    companyName: row.company_name,
    billingAddress: row.billing_address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseRevenueItems(value: Json): RevenueItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row = item as Record<string, unknown>;

    return {
      id: String(row.id),
      kind: row.kind as RevenueItem["kind"],
      label: String(row.label),
      quantity: Number(row.quantity),
      unitAmount: Number(row.unitAmount),
      amount: Number(row.amount),
      metadata: (row.metadata as RevenueItem["metadata"]) ?? {},
    };
  });
}

function parseInvoiceItems(value: Json): InvoiceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row = item as Record<string, unknown>;

    return {
      id: String(row.id),
      kind: row.kind as InvoiceItem["kind"],
      label: String(row.label),
      quantity: Number(row.quantity),
      unitAmount: Number(row.unitAmount),
      amount: Number(row.amount),
      metadata: (row.metadata as InvoiceItem["metadata"]) ?? {},
    };
  });
}

function toRevenueRecord(row: RevenueRecordRow): RevenueRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    title: row.title,
    items: parseRevenueItems(row.items),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    notes: row.notes,
    source: row.source,
    invoiceId: row.invoice_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    revenueRecordId: row.revenue_record_id,
    status: row.status,
    currency: row.currency,
    items: parseInvoiceItems(row.items),
    subtotal: Number(row.subtotal),
    totalAmount: Number(row.total_amount),
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function makeInvoiceNumber(revenueRecordId: string): string {
  const year = String(new Date().getUTCFullYear()).slice(-2);
  const suffix = revenueRecordId.replace(/-/g, "").slice(0, 8).toUpperCase();

  return `INV-${year}-${suffix}`;
}

async function requireCustomerExists(customerId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();

  handleSupabaseError(error);

  if (!data) {
    throw new SaaSNotFoundError("Customer not found.");
  }
}

async function syncRevenueRecordInvoiceLink(revenueRecordId: string, invoiceId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const revenueUpdateTable = supabase.from("revenue_records") as unknown as {
    update: (
      values: Database["public"]["Tables"]["revenue_records"]["Update"],
    ) => {
      eq: (column: string, value: string) => Promise<{ error: SupabaseErrorLike | null }>;
    };
  };
  const { error } = await revenueUpdateTable
    .update({
      invoice_id: invoiceId,
    } satisfies Database["public"]["Tables"]["revenue_records"]["Update"])
    .eq("id", revenueRecordId);

  handleSupabaseError(error);
}

export class SaaSRepository {
  async validateConnection(): Promise<void> {
    await assertSupabaseConnection();
  }

  async createCustomer(input: CustomerCreateInput): Promise<Customer> {
    const supabase = getSupabaseAdminClient();
    const customersTable = supabase.from("customers") as unknown as {
      insert: (values: CustomerInsert) => {
        select: (columns: string) => {
          single: () => Promise<{ data: CustomerRow | null; error: { message: string } | null }>;
        };
      };
    };
    const { data, error } = await customersTable
      .insert({
        name: requireString(input.name, "name"),
        email: toOptionalString(input.email),
        phone: toOptionalString(input.phone),
        company_name: toOptionalString(input.companyName),
        billing_address: toOptionalString(input.billingAddress),
        notes: toOptionalString(input.notes),
      } satisfies CustomerInsert)
      .select("*")
      .single();

    handleSupabaseError(error);

    if (!data) {
      throw new Error("Supabase did not return the created customer.");
    }

    return toCustomer(data);
  }

  async listCustomers(): Promise<Customer[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    handleSupabaseError(error);
    return (data ?? []).map(toCustomer);
  }

  async getCustomer(id: string): Promise<Customer> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    handleSupabaseError(error);

    if (!data) {
      throw new SaaSNotFoundError("Customer not found.");
    }

    return toCustomer(data);
  }

  async createRevenueRecord(input: RevenueRecordCreateInput): Promise<RevenueRecord> {
    await requireCustomerExists(input.customerId);

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new SaaSValidationError("items must contain at least one line item.");
    }

    const items = input.items.map((item, index) => normalizeItem(item, index));
    const totalAmount = calculateTotalAmount(items);
    const supabase = getSupabaseAdminClient();
    const revenueTable = supabase.from("revenue_records") as unknown as {
      insert: (values: RevenueRecordInsert) => {
        select: (columns: string) => {
          single: () => Promise<{
            data: RevenueRecordRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data, error } = await revenueTable
      .insert({
        customer_id: input.customerId,
        type: requireRevenueType(input.type),
        title: requireString(input.title, "title"),
        items: items as unknown as Json,
        total_amount: totalAmount,
        currency: normalizeCurrency(input.currency),
        notes: toOptionalString(input.notes),
        source: toOptionalString(input.source),
      } satisfies RevenueRecordInsert)
      .select("*")
      .single();

    handleSupabaseError(error);

    if (!data) {
      throw new Error("Supabase did not return the created revenue record.");
    }

    return toRevenueRecord(data);
  }

  async listRevenueRecords(): Promise<RevenueRecord[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("revenue_records")
      .select("*")
      .order("created_at", { ascending: false });

    handleSupabaseError(error);
    return (data ?? []).map(toRevenueRecord);
  }

  async listRevenueRecordsByCustomer(customerId: string): Promise<RevenueRecord[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("revenue_records")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    handleSupabaseError(error);
    return (data ?? []).map(toRevenueRecord);
  }

  async getRevenueRecord(id: string): Promise<RevenueRecord> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("revenue_records")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    handleSupabaseError(error);

    if (!data) {
      throw new SaaSNotFoundError("Revenue record not found.");
    }

    return toRevenueRecord(data);
  }

  async createInvoiceFromRevenue(input: GenerateInvoiceInput): Promise<Invoice> {
    const supabase = getSupabaseAdminClient();
    const invoiceLookupTable = supabase.from("invoices") as unknown as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{
            data: InvoiceRow | null;
            error: SupabaseErrorLike | null;
          }>;
        };
      };
    };
    const { data: existingInvoice, error: existingInvoiceError } = await invoiceLookupTable
      .select("*")
      .eq("revenue_record_id", input.revenueRecordId)
      .maybeSingle();

    handleSupabaseError(existingInvoiceError);

    if (existingInvoice) {
      await syncRevenueRecordInvoiceLink(input.revenueRecordId, existingInvoice.id);
      return toInvoice(existingInvoice);
    }

    const revenueRecord = await this.getRevenueRecord(input.revenueRecordId);
    const issuedAt = nowIso();
    const invoicesTable = supabase.from("invoices") as unknown as {
      insert: (values: InvoiceInsert) => {
        select: (columns: string) => {
          single: () => Promise<{ data: InvoiceRow | null; error: { message: string } | null }>;
        };
      };
    };
    const { data, error } = await invoicesTable
      .insert({
        invoice_number: makeInvoiceNumber(revenueRecord.id),
        customer_id: revenueRecord.customerId,
        revenue_record_id: revenueRecord.id,
        status: input.status ?? "issued",
        currency: revenueRecord.currency,
        items: revenueRecord.items as unknown as Json,
        subtotal: revenueRecord.totalAmount,
        total_amount: revenueRecord.totalAmount,
        issued_at: issuedAt,
        due_at: input.dueAt ?? null,
      } satisfies InvoiceInsert)
      .select("*")
      .single();

    if (isUniqueRevenueInvoiceConflict(error)) {
      const invoice = await this.getInvoiceByRevenueRecordId(input.revenueRecordId);

      if (invoice) {
        await syncRevenueRecordInvoiceLink(input.revenueRecordId, invoice.id);
        return invoice;
      }
    }

    handleSupabaseError(error);

    if (!data) {
      throw new Error("Supabase did not return the created invoice.");
    }

    await syncRevenueRecordInvoiceLink(revenueRecord.id, data.id);
    return toInvoice(data);
  }

  async listInvoices(): Promise<Invoice[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    handleSupabaseError(error);
    return (data ?? []).map(toInvoice);
  }

  async getInvoice(id: string): Promise<Invoice> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    handleSupabaseError(error);

    if (!data) {
      throw new SaaSNotFoundError("Invoice not found.");
    }

    return toInvoice(data);
  }

  async getInvoiceByRevenueRecordId(revenueRecordId: string): Promise<Invoice | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("revenue_record_id", revenueRecordId)
      .maybeSingle();

    handleSupabaseError(error);
    return data ? toInvoice(data) : null;
  }
}

export const saasRepository = new SaaSRepository();

export function revenueRecordToInvoiceItems(record: RevenueRecord): InvoiceItem[] {
  return record.items.map((item) => ({
    id: item.id,
    kind: item.kind,
    label: item.label,
    quantity: item.quantity,
    unitAmount: item.unitAmount,
    amount: item.amount,
    metadata: { ...item.metadata },
  }));
}
