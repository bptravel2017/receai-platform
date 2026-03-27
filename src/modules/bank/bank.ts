import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BankImportFormValues,
  BankImportRecord,
  BankTransactionRecord,
  BankTransactionReconciliationFormValues,
  ReconciliationInvoiceChoice,
} from "@/modules/bank/types";

type BankImportRow = {
  id: string;
  workspace_id: string;
  source_name: string;
  note: string | null;
  imported_transaction_count: number;
  created_at: string;
  updated_at: string;
};

type BankTransactionRow = {
  id: string;
  workspace_id: string;
  import_batch_id: string;
  transaction_date: string;
  amount_cents: number;
  currency: string;
  description: string;
  reference: string | null;
  reconciliation_status: "unmatched" | "matched";
  linked_invoice_id: string | null;
  payment_event_id: string | null;
  reconciled_at: string | null;
  created_at: string;
  updated_at: string;
};

type InvoiceChoiceRow = {
  id: string;
  invoice_number: string | null;
  customer_id: string;
  amount_cents: number;
  paid_amount_cents: number;
  payment_status: "unpaid" | "partial" | "paid";
  invoice_date: string;
};

type CustomerChoiceRow = {
  id: string;
  name: string;
};

export class BankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankError";
  }
}

function canManageBank(context: AuthenticatedAppContext) {
  return context.workspace.role === "owner" || context.workspace.role === "admin";
}

function toImportRecord(row: BankImportRow): BankImportRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceName: row.source_name,
    note: row.note,
    importedTransactionCount: row.imported_transaction_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function assertCanManageBank(context: AuthenticatedAppContext) {
  if (!canManageBank(context)) {
    throw new BankError(
      "Only workspace owners and admins can import statements or reconcile transactions.",
    );
  }
}

export function getBankImportFormDefaults(): BankImportFormValues {
  return {
    sourceName: "",
    note: "",
    transactionsText: "",
  };
}

export function getBankTransactionReconciliationFormDefaults(
  transaction?: BankTransactionRecord | null,
): BankTransactionReconciliationFormValues {
  return {
    invoiceId: transaction?.linkedInvoiceId ?? "",
  };
}

async function getImportMap(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_statement_imports")
    .select("id, workspace_id, source_name, note, imported_transaction_count, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new BankError("We could not load bank import batches right now.");
  }

  const imports = ((data ?? []) as BankImportRow[]).map(toImportRecord);
  return new Map(imports.map((item) => [item.id, item]));
}

async function getInvoiceChoiceData(context: AuthenticatedAppContext) {
  const supabase = await createSupabaseServerClient();
  const [invoiceResponse, customerResponse] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, customer_id, amount_cents, paid_amount_cents, payment_status, invoice_date",
      )
      .eq("workspace_id", context.workspace.id)
      .eq("status", "finalized")
      .order("invoice_date", { ascending: false }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("workspace_id", context.workspace.id)
      .order("name", { ascending: true }),
  ]);

  if (invoiceResponse.error) {
    throw new BankError("We could not load finalized invoices for reconciliation.");
  }

  if (customerResponse.error) {
    throw new BankError("We could not load customer names for reconciliation.");
  }

  const customersById = new Map(
    ((customerResponse.data ?? []) as CustomerChoiceRow[]).map((customer) => [
      customer.id,
      customer.name,
    ]),
  );

  return ((invoiceResponse.data ?? []) as InvoiceChoiceRow[]).map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    customerName: customersById.get(invoice.customer_id) ?? "Unknown customer",
    amountCents: invoice.amount_cents,
    paidAmountCents: invoice.paid_amount_cents,
    paymentStatus: invoice.payment_status,
    invoiceDate: invoice.invoice_date,
  })) satisfies ReconciliationInvoiceChoice[];
}

async function getBankPaymentEventMap(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoice_payment_events")
    .select("id, bank_transaction_id")
    .eq("workspace_id", workspaceId)
    .eq("source", "bank")
    .eq("status", "active");

  if (error) {
    throw new BankError("We could not load bank payment event links right now.");
  }

  return new Map(
    ((data ?? []) as Array<{ id: string; bank_transaction_id: string | null }>)
      .filter((row) => typeof row.bank_transaction_id === "string")
      .map((row) => [row.bank_transaction_id as string, row.id]),
  );
}

export async function getBankImportsList(context: AuthenticatedAppContext) {
  const importsMap = await getImportMap(context.workspace.id);

  return {
    canManageBank: canManageBank(context),
    imports: Array.from(importsMap.values()),
  };
}

function toTransactionRecord(args: {
  row: BankTransactionRow;
  importsById: Map<string, BankImportRecord>;
  invoicesById: Map<string, ReconciliationInvoiceChoice>;
}): BankTransactionRecord {
  const row = args.row;
  const invoice = row.linked_invoice_id
    ? args.invoicesById.get(row.linked_invoice_id) ?? null
    : null;
  const importBatch = args.importsById.get(row.import_batch_id);

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    importBatchId: row.import_batch_id,
    importSourceName: importBatch?.sourceName ?? "Unknown import",
    transactionDate: row.transaction_date,
    amountCents: row.amount_cents,
    currency: row.currency,
    description: row.description,
    reference: row.reference,
    reconciliationStatus: row.reconciliation_status,
    linkedInvoiceId: row.linked_invoice_id,
    linkedInvoiceNumber: invoice?.invoiceNumber ?? null,
    linkedInvoiceCustomerName: invoice?.customerName ?? null,
    linkedInvoicePaymentStatus: invoice?.paymentStatus ?? null,
    paymentEventId: row.payment_event_id,
    reconciledAt: row.reconciled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getBankTransactionsList(context: AuthenticatedAppContext) {
  const supabase = await createSupabaseServerClient();
  const [importsById, invoiceChoices, paymentEventsByTransactionId, transactionResponse] = await Promise.all([
    getImportMap(context.workspace.id),
    getInvoiceChoiceData(context),
    getBankPaymentEventMap(context.workspace.id),
    supabase
      .from("bank_transactions")
      .select(
        "id, workspace_id, import_batch_id, transaction_date, amount_cents, currency, description, reference, reconciliation_status, linked_invoice_id, reconciled_at, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (transactionResponse.error) {
    throw new BankError("We could not load bank transactions right now.");
  }

  const invoicesById = new Map(invoiceChoices.map((invoice) => [invoice.id, invoice]));

  return {
    canManageBank: canManageBank(context),
    transactions: ((transactionResponse.data ?? []) as Omit<BankTransactionRow, "payment_event_id">[]).map((row) =>
      toTransactionRecord({
        row: {
          ...row,
          payment_event_id: paymentEventsByTransactionId.get(row.id) ?? null,
        },
        importsById,
        invoicesById,
      }),
    ),
  };
}

export async function getBankOverview(context: AuthenticatedAppContext) {
  const [imports, transactions] = await Promise.all([
    getBankImportsList(context),
    getBankTransactionsList(context),
  ]);

  const matchedCount = transactions.transactions.filter(
    (transaction) => transaction.reconciliationStatus === "matched",
  ).length;

  return {
    canManageBank: canManageBank(context),
    importCount: imports.imports.length,
    transactionCount: transactions.transactions.length,
    matchedCount,
    unmatchedCount: transactions.transactions.length - matchedCount,
    latestImports: imports.imports.slice(0, 5),
    latestTransactions: transactions.transactions.slice(0, 8),
  };
}

export async function getBankTransactionById(
  context: AuthenticatedAppContext,
  transactionId: string,
) {
  const supabase = await createSupabaseServerClient();
  const [importsById, invoiceChoices, paymentEventsByTransactionId, transactionResponse] = await Promise.all([
    getImportMap(context.workspace.id),
    getInvoiceChoiceData(context),
    getBankPaymentEventMap(context.workspace.id),
    supabase
      .from("bank_transactions")
      .select(
        "id, workspace_id, import_batch_id, transaction_date, amount_cents, currency, description, reference, reconciliation_status, linked_invoice_id, reconciled_at, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .eq("id", transactionId)
      .maybeSingle(),
  ]);

  if (transactionResponse.error) {
    throw new BankError("We could not load that bank transaction right now.");
  }

  if (!transactionResponse.data) {
    return null;
  }

  const transaction = toTransactionRecord({
    row: {
      ...(transactionResponse.data as Omit<BankTransactionRow, "payment_event_id">),
      payment_event_id: paymentEventsByTransactionId.get(transactionId) ?? null,
    },
    importsById,
    invoicesById: new Map(invoiceChoices.map((invoice) => [invoice.id, invoice])),
  });

  return {
    canManageBank: canManageBank(context),
    transaction,
    invoiceChoices,
  };
}
