import type { CostScope } from "@/modules/costs/types";

export type ReceiptIntakeStatus =
  | "uploaded"
  | "parsed"
  | "classified"
  | "posted"
  | "failed";

export type ReceiptParseStatus = "not_started" | "parsed" | "failed";

export type ReceiptIntakeRecord = {
  id: string;
  workspaceId: string;
  status: ReceiptIntakeStatus;
  parseStatus: ReceiptParseStatus;
  parserName: string | null;
  parserVersion: string | null;
  parseAttemptedAt: string | null;
  parsedAt: string | null;
  parseError: string | null;
  filePath: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  fileUrl: string | null;
  tempFileReference: string | null;
  candidateDate: string | null;
  candidateVendorName: string | null;
  candidateAmountCents: number | null;
  candidateDescription: string | null;
  candidateNote: string | null;
  costScope: CostScope | null;
  costCategoryId: string | null;
  costCategoryName: string | null;
  customerId: string | null;
  customerName: string | null;
  revenueRecordId: string | null;
  revenueSummary: string | null;
  invoiceId: string | null;
  invoiceSummary: string | null;
  revenueRecordItemId: string | null;
  revenueRecordItemTitle: string | null;
  serviceDate: string | null;
  groupName: string | null;
  postedCostRecordId: string | null;
  postedCostSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptIntakeFormValues = {
  tempFileReference: string;
  candidateDate: string;
  candidateVendorName: string;
  candidateAmount: string;
  candidateDescription: string;
  candidateNote: string;
  reviewStatus: ReceiptIntakeStatus;
  costScope: "" | CostScope;
  costCategoryId: string;
  customerId: string;
  revenueRecordId: string;
  invoiceId: string;
  revenueRecordItemId: string;
  serviceDate: string;
  groupName: string;
};
