import type { CustomerChoice } from "@/modules/customers/types";
import type {
  FulfillmentPartyChoice,
  FulfillmentPartyType,
} from "@/modules/fulfillment/types";
import type { GroupChoice } from "@/modules/groups/types";
import type { LineItemRecord } from "@/modules/line-items/types";

export type RevenueStatus = "draft" | "open";
export type RevenueEntryType = "daytime" | "transfer" | "custom";
export type RevenueBillingState = "not_needed" | "unbilled" | "billed";
export type RevenueBelongsTo = "customer" | "group";

export type DaytimeServiceCategory =
  | "charter"
  | "transfer"
  | "ticket"
  | "advance"
  | "other";

export type DaytimeSheetRow = {
  id: string;
  serviceDate: string;
  groupDate: string;
  serviceCategory: DaytimeServiceCategory;
  itemDescription: string;
  qty: string;
  unitPrice: string;
};

export type RevenueRecord = {
  id: string;
  workspaceId: string;
  customerId: string;
  customerName: string;
  customerCompany: string | null;
  groupId: string | null;
  groupName: string | null;
  serviceDate: string;
  entryType: RevenueEntryType;
  billingState: RevenueBillingState;
  invoiceId: string | null;
  fulfillmentPartyType: FulfillmentPartyType | null;
  fulfillmentPartyId: string | null;
  fulfillmentPartyLabel: string | null;
  driverId: string | null;
  driverLabel: string | null;
  vendorId: string | null;
  vendorLabel: string | null;
  guideId: string | null;
  guideLabel: string | null;
  status: RevenueStatus;
  amountCents: number;
  currency: string;
  notes: string | null;
  lineItems: LineItemRecord[];
  createdAt: string;
  updatedAt: string;
};

export type RevenueFormValues = {
  belongsTo: RevenueBelongsTo;
  customerId: string;
  groupId: string;
  serviceDate: string;
  entryType: RevenueEntryType;
  billingState: RevenueBillingState;
  driverId: string;
  vendorId: string;
  guideId: string;
  status: RevenueStatus;
  notes: string;
  createInvoiceNow: "yes" | "no";
  lineItems: DaytimeSheetRow[];
};

export type RevenueEditorData = {
  canManageRevenue: boolean;
  customers: CustomerChoice[];
  groups: GroupChoice[];
  fulfillmentParties: FulfillmentPartyChoice[];
};
