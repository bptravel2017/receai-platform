export type BankImportRecord = {
  id: string;
  workspaceId: string;
  sourceName: string;
  note: string | null;
  importedTransactionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BankTransactionReconciliationStatus = "unmatched" | "matched";

export type BankTransactionRecord = {
  id: string;
  workspaceId: string;
  importBatchId: string;
  importSourceName: string;
  transactionDate: string;
  amountCents: number;
  currency: string;
  description: string;
  reference: string | null;
  reconciliationStatus: BankTransactionReconciliationStatus;
  linkedInvoiceId: string | null;
  linkedInvoiceNumber: string | null;
  linkedInvoiceCustomerName: string | null;
  linkedInvoicePaymentStatus: "unpaid" | "partial" | "paid" | null;
  paymentEventId: string | null;
  reconciledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BankImportFormValues = {
  sourceName: string;
  note: string;
  transactionsText: string;
};

export type ReconciliationInvoiceChoice = {
  id: string;
  invoiceNumber: string | null;
  customerName: string;
  amountCents: number;
  paidAmountCents: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  invoiceDate: string;
};

export type BankTransactionReconciliationFormValues = {
  invoiceId: string;
};
