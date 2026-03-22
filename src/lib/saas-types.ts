export type RevenueRecordType = "daytime" | "transfer" | "other";

export type RevenueItemKind =
  | "vehicle"
  | "guide"
  | "package"
  | "overtime"
  | "transfer"
  | "ticket"
  | "expense"
  | "other";

export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  billingAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreateInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
}

export interface RevenueItemInput {
  kind?: RevenueItemKind;
  label: string;
  quantity?: number;
  unitAmount?: number;
  amount?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RevenueItem {
  id: string;
  kind: RevenueItemKind;
  label: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  metadata: Record<string, string | number | boolean | null>;
}

export interface RevenueRecord {
  id: string;
  customerId: string;
  type: RevenueRecordType;
  title: string;
  items: RevenueItem[];
  totalAmount: number;
  currency: string;
  notes: string | null;
  source: string | null;
  invoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueRecordCreateInput {
  customerId: string;
  type: RevenueRecordType;
  title: string;
  items: RevenueItemInput[];
  currency?: string;
  notes?: string | null;
  source?: string | null;
}

export interface InvoiceItem {
  id: string;
  kind: RevenueItemKind;
  label: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  metadata: Record<string, string | number | boolean | null>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  revenueRecordId: string;
  status: InvoiceStatus;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  totalAmount: number;
  issuedAt: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateInvoiceInput {
  revenueRecordId: string;
  dueAt?: string | null;
  status?: InvoiceStatus;
}
