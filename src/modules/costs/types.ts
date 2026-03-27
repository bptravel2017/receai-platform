import type { CustomerChoice } from "@/modules/customers/types";
import type { FulfillmentPartyChoice } from "@/modules/fulfillment/types";
import type { GroupChoice } from "@/modules/groups/types";

export type CostType = "revenue" | "customer" | "group" | "overhead";
export type CostPaymentStatus = "unpaid" | "paid";
export type CostScope = "company" | "group_linked";

export type CostCategoryRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CostRecord = {
  id: string;
  workspaceId: string;
  costDate: string;
  costType: CostType;
  revenueId: string | null;
  revenueSummary: string | null;
  customerId: string | null;
  customerName: string | null;
  groupId: string | null;
  groupName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  driverId: string | null;
  driverName: string | null;
  guideId: string | null;
  guideName: string | null;
  costName: string;
  description: string | null;
  amountCents: number;
  currency: string;
  paymentStatus: CostPaymentStatus;
  paidAt: string | null;
  notesInternal: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CostFormValues = {
  costDate: string;
  costType: CostType;
  revenueId: string;
  customerId: string;
  groupId: string;
  vendorId: string;
  driverId: string;
  guideId: string;
  costName: string;
  description: string;
  amount: string;
  paymentStatus: CostPaymentStatus;
  notesInternal: string;
};

export type RevenueCostSummary = {
  totalCostCents: number;
  unpaidCostCents: number;
  paidCostCents: number;
  profitCents: number;
};

export type RevenueChoice = {
  id: string;
  customerId: string;
  customerName: string;
  groupId: string | null;
  label: string;
  items: Array<{
    id: string;
    title: string;
    serviceDate: string | null;
  }>;
};

export type InvoiceChoice = {
  id: string;
  label: string;
  customerId: string;
  revenueRecordId: string | null;
};

export type CostsEditorData = {
  canManageCosts: boolean;
  customers: CustomerChoice[];
  categories: CostCategoryRecord[];
  revenueChoices: RevenueChoice[];
  invoiceChoices: InvoiceChoice[];
  groupChoices: GroupChoice[];
  vendorChoices: FulfillmentPartyChoice[];
  driverChoices: FulfillmentPartyChoice[];
  guideChoices: FulfillmentPartyChoice[];
};

export type CostsListFilters = {
  revenueId?: string;
  customerId?: string;
  groupId?: string;
  vendorId?: string;
  driverId?: string;
  guideId?: string;
  paymentStatus?: CostPaymentStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type PayableBucket = {
  bucketType: "vendor" | "driver" | "guide";
  partyId: string;
  partyName: string;
  unpaidTotalCents: number;
  paidTotalCents: number;
  itemCount: number;
  items: CostRecord[];
};

export type PayablesFilters = {
  unpaidOnly?: boolean;
  partyType?: "driver" | "vendor" | "guide";
  dateFrom?: string;
  dateTo?: string;
};
