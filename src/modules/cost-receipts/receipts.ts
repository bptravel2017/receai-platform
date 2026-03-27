import type { AuthenticatedAppContext } from "@/lib/auth/types";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { CostCategoryRecord } from "@/modules/costs/types";
import {
  type CostsEditorData,
  type InvoiceChoice,
  type RevenueChoice,
  CostsError,
  getCostsEditorData,
} from "@/modules/costs/costs";
import type { CustomerChoice } from "@/modules/customers/types";
import type {
  ReceiptIntakeFormValues,
  ReceiptIntakeRecord,
  ReceiptParseStatus,
  ReceiptIntakeStatus,
} from "@/modules/cost-receipts/types";
import { assertPlanAccess } from "@/modules/plans/access";

const RECEIPT_BUCKET = "receipt-intake";

type ReceiptRow = {
  id: string;
  workspace_id: string;
  status: ReceiptIntakeStatus;
  parse_status: ReceiptParseStatus;
  parser_name: string | null;
  parser_version: string | null;
  parse_attempted_at: string | null;
  parsed_at: string | null;
  parse_error: string | null;
  file_path: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  temp_file_reference: string | null;
  candidate_date: string | null;
  candidate_vendor_name: string | null;
  candidate_amount_cents: number | null;
  candidate_description: string | null;
  candidate_note: string | null;
  cost_scope: "company" | "group_linked" | null;
  cost_category_id: string | null;
  customer_id: string | null;
  revenue_record_id: string | null;
  invoice_id: string | null;
  revenue_record_item_id: string | null;
  service_date: string | null;
  group_name: string | null;
  posted_cost_record_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CostReceiptEditorData = CostsEditorData;

export class CostReceiptsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostReceiptsError";
  }
}

function canManageCostReceipts(context: AuthenticatedAppContext) {
  return (
    context.workspace.role === "owner" || context.workspace.role === "admin"
  );
}

function buildCategoryMap(categories: CostCategoryRecord[]) {
  return new Map(categories.map((category) => [category.id, category]));
}

function buildRevenueMap(revenueChoices: RevenueChoice[]) {
  return new Map(revenueChoices.map((revenue) => [revenue.id, revenue]));
}

function buildInvoiceMap(invoiceChoices: InvoiceChoice[]) {
  return new Map(invoiceChoices.map((invoice) => [invoice.id, invoice]));
}

async function getSignedReceiptUrl(path: string | null) {
  if (!path) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

function toReceiptFormValues(
  receipt?: ReceiptIntakeRecord | null,
): ReceiptIntakeFormValues {
  return {
    tempFileReference: receipt?.tempFileReference ?? "",
    candidateDate: receipt?.candidateDate ?? "",
    candidateVendorName: receipt?.candidateVendorName ?? "",
    candidateAmount:
      typeof receipt?.candidateAmountCents === "number"
        ? (receipt.candidateAmountCents / 100).toFixed(2)
        : "",
    candidateDescription: receipt?.candidateDescription ?? "",
    candidateNote: receipt?.candidateNote ?? "",
    reviewStatus:
      receipt?.status && receipt.status !== "posted" ? receipt.status : "uploaded",
    costScope: receipt?.costScope ?? "",
    costCategoryId: receipt?.costCategoryId ?? "",
    customerId: receipt?.customerId ?? "",
    revenueRecordId: receipt?.revenueRecordId ?? "",
    invoiceId: receipt?.invoiceId ?? "",
    revenueRecordItemId: receipt?.revenueRecordItemId ?? "",
    serviceDate: receipt?.serviceDate ?? "",
    groupName: receipt?.groupName ?? "",
  };
}

function toReceiptRecord(args: {
  row: ReceiptRow;
  customersById: Map<string, CustomerChoice>;
  categoriesById: Map<string, CostCategoryRecord>;
  revenueById: Map<string, RevenueChoice>;
  invoicesById: Map<string, InvoiceChoice>;
  costSummariesById: Map<string, string>;
  fileUrl: string | null;
}): ReceiptIntakeRecord {
  const { row, customersById, categoriesById, revenueById, invoicesById, costSummariesById } =
    args;
  const customer = row.customer_id ? customersById.get(row.customer_id) : null;
  const category = row.cost_category_id
    ? categoriesById.get(row.cost_category_id)
    : null;
  const revenue = row.revenue_record_id
    ? revenueById.get(row.revenue_record_id)
    : null;
  const invoice = row.invoice_id ? invoicesById.get(row.invoice_id) : null;
  const revenueItem = revenue?.items.find(
    (item) => item.id === row.revenue_record_item_id,
  );

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    status: row.status,
    parseStatus: row.parse_status,
    parserName: row.parser_name,
    parserVersion: row.parser_version,
    parseAttemptedAt: row.parse_attempted_at,
    parsedAt: row.parsed_at,
    parseError: row.parse_error,
    filePath: row.file_path,
    fileName: row.file_name,
    fileMimeType: row.file_mime_type,
    fileSizeBytes: row.file_size_bytes,
    fileUrl: args.fileUrl,
    tempFileReference: row.temp_file_reference,
    candidateDate: row.candidate_date,
    candidateVendorName: row.candidate_vendor_name,
    candidateAmountCents: row.candidate_amount_cents,
    candidateDescription: row.candidate_description,
    candidateNote: row.candidate_note,
    costScope: row.cost_scope,
    costCategoryId: row.cost_category_id,
    costCategoryName: category?.name ?? null,
    customerId: row.customer_id,
    customerName: customer?.name ?? null,
    revenueRecordId: row.revenue_record_id,
    revenueSummary: revenue?.label ?? null,
    invoiceId: row.invoice_id,
    invoiceSummary: invoice?.label ?? null,
    revenueRecordItemId: row.revenue_record_item_id,
    revenueRecordItemTitle: revenueItem?.title ?? null,
    serviceDate: row.service_date,
    groupName: row.group_name,
    postedCostRecordId: row.posted_cost_record_id,
    postedCostSummary: row.posted_cost_record_id
      ? costSummariesById.get(row.posted_cost_record_id) ?? null
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getPostedCostSummaries(
  workspaceId: string,
  receiptRows: ReceiptRow[],
) {
  const ids = receiptRows
    .map((row) => row.posted_cost_record_id)
    .filter((value): value is string => Boolean(value));

  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cost_records")
    .select("id, vendor_name, cost_date")
    .eq("workspace_id", workspaceId)
    .in("id", ids);

  if (error) {
    throw new CostReceiptsError("We could not load posted cost links right now.");
  }

  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      `${row.vendor_name as string} • ${row.cost_date as string}`,
    ]),
  );
}

export function getReceiptIntakeFormDefaults(receipt?: ReceiptIntakeRecord | null) {
  return toReceiptFormValues(receipt);
}

export function assertCanManageCostReceipts(context: AuthenticatedAppContext) {
  assertPlanAccess(context, "receipt_save");

  if (!canManageCostReceipts(context)) {
    throw new CostsError(
      "Only workspace owners and admins can intake, classify, or post receipts.",
    );
  }
}

export async function getCostReceiptsList(context: AuthenticatedAppContext) {
  const [editorData, supabase] = await Promise.all([
    getCostsEditorData(context),
    createSupabaseServerClient(),
  ]);
  const { data, error } = await supabase
    .from("cost_receipt_intakes")
    .select(
      "id, workspace_id, status, parse_status, parser_name, parser_version, parse_attempted_at, parsed_at, parse_error, file_path, file_name, file_mime_type, file_size_bytes, temp_file_reference, candidate_date, candidate_vendor_name, candidate_amount_cents, candidate_description, candidate_note, cost_scope, cost_category_id, customer_id, revenue_record_id, invoice_id, revenue_record_item_id, service_date, group_name, posted_cost_record_id, created_at, updated_at",
    )
    .eq("workspace_id", context.workspace.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new CostReceiptsError("We could not load receipt intake records right now.");
  }

  const rows = (data ?? []) as ReceiptRow[];
  const costSummariesById = await getPostedCostSummaries(context.workspace.id, rows);
  const customersById = new Map(
    editorData.customers.map((customer) => [customer.id, customer]),
  );
  const categoriesById = buildCategoryMap(editorData.categories);
  const revenueById = buildRevenueMap(editorData.revenueChoices);
  const invoicesById = buildInvoiceMap(editorData.invoiceChoices);
  const fileUrls = await Promise.all(rows.map((row) => getSignedReceiptUrl(row.file_path)));

  return {
    canManageCostReceipts: editorData.canManageCosts,
    editorData,
    receipts: rows.map((row, index) =>
      toReceiptRecord({
        row,
        customersById,
        categoriesById,
        revenueById,
        invoicesById,
        costSummariesById,
        fileUrl: fileUrls[index] ?? null,
      }),
    ),
  };
}

export async function getCostReceiptById(
  context: AuthenticatedAppContext,
  receiptId: string,
) {
  const [editorData, supabase] = await Promise.all([
    getCostsEditorData(context),
    createSupabaseServerClient(),
  ]);
  const { data, error } = await supabase
    .from("cost_receipt_intakes")
    .select(
      "id, workspace_id, status, parse_status, parser_name, parser_version, parse_attempted_at, parsed_at, parse_error, file_path, file_name, file_mime_type, file_size_bytes, temp_file_reference, candidate_date, candidate_vendor_name, candidate_amount_cents, candidate_description, candidate_note, cost_scope, cost_category_id, customer_id, revenue_record_id, invoice_id, revenue_record_item_id, service_date, group_name, posted_cost_record_id, created_at, updated_at",
    )
    .eq("workspace_id", context.workspace.id)
    .eq("id", receiptId)
    .maybeSingle();

  if (error) {
    throw new CostReceiptsError("We could not load that receipt intake record right now.");
  }

  if (!data) {
    return null;
  }

  const row = data as ReceiptRow;
  const costSummariesById = await getPostedCostSummaries(context.workspace.id, [row]);
  const customersById = new Map(
    editorData.customers.map((customer) => [customer.id, customer]),
  );
  const categoriesById = buildCategoryMap(editorData.categories);
  const revenueById = buildRevenueMap(editorData.revenueChoices);
  const invoicesById = buildInvoiceMap(editorData.invoiceChoices);
  const fileUrl = await getSignedReceiptUrl(row.file_path);

  return {
    canManageCostReceipts: editorData.canManageCosts,
    editorData,
    receipt: toReceiptRecord({
      row,
      customersById,
      categoriesById,
      revenueById,
      invoicesById,
      costSummariesById,
      fileUrl,
    }),
  };
}
