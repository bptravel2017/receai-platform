import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceCustomerChoices } from "@/modules/customers/customers";
import type { CustomerChoice } from "@/modules/customers/types";
import { getWorkspaceFulfillmentPartyChoices } from "@/modules/fulfillment/fulfillment";
import type {
  FulfillmentPartyChoice,
  FulfillmentPartyType,
} from "@/modules/fulfillment/types";
import { getWorkspaceGroupChoices } from "@/modules/groups/groups";
import { warnDeprecatedGroupNameUsage } from "@/modules/groups/deprecation";
import type { GroupChoice } from "@/modules/groups/types";
import { normalizeStoredLineItems } from "@/modules/line-items/line-items";
import type {
  DaytimeServiceCategory,
  DaytimeSheetRow,
  RevenueBillingState,
  RevenueBelongsTo,
  RevenueEditorData,
  RevenueEntryType,
  RevenueFormValues,
  RevenueRecord,
  RevenueStatus,
} from "@/modules/revenue/types";

type RevenueRow = {
  id: string;
  workspace_id: string;
  customer_id: string;
  group_id: string | null;
  group_name: string | null;
  service_date: string;
  entry_type: RevenueEntryType;
  billing_state: RevenueBillingState;
  invoice_id: string | null;
  fulfillment_party_type: FulfillmentPartyType | null;
  fulfillment_party_id: string | null;
  driver_id: string | null;
  vendor_id: string | null;
  guide_id: string | null;
  status: RevenueStatus;
  amount_cents: number;
  currency: string;
  notes: string | null;
  line_items: unknown;
  created_at: string;
  updated_at: string;
};

export class RevenueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RevenueError";
  }
}

function canManageRevenue(context: AuthenticatedAppContext) {
  return (
    context.workspace.role === "owner" || context.workspace.role === "admin"
  );
}

function buildCustomerMap(customers: CustomerChoice[]) {
  return new Map(customers.map((customer) => [customer.id, customer]));
}

function buildFulfillmentPartyMap(parties: FulfillmentPartyChoice[]) {
  return new Map(parties.map((party) => [party.id, party]));
}

function buildGroupMap(groups: GroupChoice[]) {
  return new Map(groups.map((group) => [group.id, group]));
}

function toRevenueRecord(
  row: RevenueRow,
  customersById: Map<string, CustomerChoice>,
  groupsById: Map<string, GroupChoice>,
  fulfillmentPartiesById: Map<string, FulfillmentPartyChoice>,
): RevenueRecord {
  const customer = customersById.get(row.customer_id);
  const group = row.group_id ? groupsById.get(row.group_id) ?? null : null;
  const fulfillmentParty = row.fulfillment_party_id
    ? fulfillmentPartiesById.get(row.fulfillment_party_id) ?? null
    : null;
  const driver = row.driver_id ? fulfillmentPartiesById.get(row.driver_id) ?? null : null;
  const vendor = row.vendor_id ? fulfillmentPartiesById.get(row.vendor_id) ?? null : null;
  const guide = row.guide_id ? fulfillmentPartiesById.get(row.guide_id) ?? null : null;

  warnDeprecatedGroupNameUsage({
    module: "revenue.toRevenueRecord",
    recordId: row.id,
    groupName: row.group_name,
    groupId: row.group_id,
  });

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    customerId: row.customer_id,
    customerName: customer?.name ?? "Unknown customer",
    customerCompany: customer?.company ?? null,
    groupId: row.group_id,
    groupName: group?.name ?? null,
    serviceDate: row.service_date,
    entryType: row.entry_type,
    billingState: row.billing_state,
    invoiceId: row.invoice_id,
    fulfillmentPartyType: row.fulfillment_party_type,
    fulfillmentPartyId: row.fulfillment_party_id,
    fulfillmentPartyLabel: fulfillmentParty?.displayName ?? null,
    driverId: row.driver_id,
    driverLabel: driver?.displayName ?? null,
    vendorId: row.vendor_id,
    vendorLabel: vendor?.displayName ?? null,
    guideId: row.guide_id,
    guideLabel: guide?.displayName ?? null,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    notes: row.notes,
    lineItems: normalizeStoredLineItems(row.line_items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createDraftDaytimeRow(serviceDate: string): DaytimeSheetRow {
  return {
    id: `daytime-row-${Math.random().toString(36).slice(2, 9)}`,
    serviceDate,
    groupDate: "",
    serviceCategory: "charter",
    itemDescription: "Charter",
    qty: "1",
    unitPrice: "0.00",
  };
}

function normalizeServiceCategory(value: string | null | undefined): DaytimeServiceCategory {
  if (
    value === "charter" ||
    value === "transfer" ||
    value === "ticket" ||
    value === "advance" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

function toDaytimeSheetRows(
  revenue?: RevenueRecord | null,
  serviceDate?: string,
): DaytimeSheetRow[] {
  if (!revenue || revenue.lineItems.length === 0) {
    return [createDraftDaytimeRow(serviceDate ?? "")];
  }

  return revenue.lineItems.map((item, index) => ({
    id: item.id || `daytime-row-${index + 1}`,
    serviceDate: item.serviceDate ?? "",
    groupDate: item.groupDate ?? "",
    serviceCategory: normalizeServiceCategory(item.serviceCategory),
    itemDescription: item.description?.trim() || item.title,
    qty: item.quantity.toString(),
    unitPrice: (item.unitPriceCents / 100).toFixed(2),
  }));
}

export function getRevenueFormDefaults(
  revenue?: RevenueRecord | null,
): RevenueFormValues {
  const belongsTo: RevenueBelongsTo = revenue?.groupId ? "group" : "customer";
  const serviceDate = revenue?.serviceDate ?? "";

  return {
    belongsTo,
    customerId: revenue?.customerId ?? "",
    groupId: revenue?.groupId ?? "",
    serviceDate,
    entryType: revenue?.entryType ?? "daytime",
    billingState:
      revenue?.billingState === "not_needed" ? "not_needed" : revenue?.billingState ?? "unbilled",
    driverId: revenue?.driverId ?? "",
    vendorId: revenue?.vendorId ?? "",
    guideId: revenue?.guideId ?? "",
    status: revenue?.status ?? "draft",
    notes: revenue?.notes ?? "",
    createInvoiceNow: "no",
    lineItems: toDaytimeSheetRows(revenue, serviceDate),
  };
}

export function assertCanManageRevenue(context: AuthenticatedAppContext) {
  if (!canManageRevenue(context)) {
    throw new RevenueError(
      "Only workspace owners and admins can create or edit revenue drafts.",
    );
  }
}

export async function getRevenueEditorData(
  context: AuthenticatedAppContext,
): Promise<RevenueEditorData> {
  const [customers, groups, fulfillmentParties] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
    getWorkspaceFulfillmentPartyChoices(context),
  ]);

  return {
    canManageRevenue: canManageRevenue(context),
    customers,
    groups,
    fulfillmentParties,
  };
}

export async function getRevenueList(context: AuthenticatedAppContext) {
  const supabase = await createSupabaseServerClient();
  const [customers, groups, fulfillmentParties, revenueResponse] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
    getWorkspaceFulfillmentPartyChoices(context),
    supabase
      .from("revenue_records")
      .select(
        "id, workspace_id, customer_id, group_id, group_name, service_date, entry_type, billing_state, invoice_id, fulfillment_party_type, fulfillment_party_id, driver_id, vendor_id, guide_id, status, amount_cents, currency, notes, line_items, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .order("service_date", { ascending: false })
      .order("updated_at", { ascending: false }),
  ]);

  const { data, error } = revenueResponse;

  if (error) {
    throw new RevenueError("We could not load revenue drafts right now.");
  }

  const customersById = buildCustomerMap(customers);
  const groupsById = buildGroupMap(groups);
  const fulfillmentPartiesById = buildFulfillmentPartyMap(fulfillmentParties);

  return {
    canManageRevenue: canManageRevenue(context),
    customers,
    groups,
    fulfillmentParties,
    revenue: ((data ?? []) as RevenueRow[]).map((row) =>
      toRevenueRecord(row, customersById, groupsById, fulfillmentPartiesById),
    ),
  };
}

export async function getRevenueById(
  context: AuthenticatedAppContext,
  revenueId: string,
) {
  const supabase = await createSupabaseServerClient();
  const [customers, groups, fulfillmentParties, revenueResponse] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
    getWorkspaceFulfillmentPartyChoices(context),
    supabase
      .from("revenue_records")
      .select(
        "id, workspace_id, customer_id, group_id, group_name, service_date, entry_type, billing_state, invoice_id, fulfillment_party_type, fulfillment_party_id, driver_id, vendor_id, guide_id, status, amount_cents, currency, notes, line_items, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .eq("id", revenueId)
      .maybeSingle(),
  ]);

  const { data, error } = revenueResponse;

  if (error) {
    throw new RevenueError("We could not load that revenue draft right now.");
  }

  if (!data) {
    return null;
  }

  const customersById = buildCustomerMap(customers);
  const groupsById = buildGroupMap(groups);
  const fulfillmentPartiesById = buildFulfillmentPartyMap(fulfillmentParties);

  return {
    canManageRevenue: canManageRevenue(context),
    customers,
    groups,
    fulfillmentParties,
    revenue: toRevenueRecord(
      data as RevenueRow,
      customersById,
      groupsById,
      fulfillmentPartiesById,
    ),
  };
}
