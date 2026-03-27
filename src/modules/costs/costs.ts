import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceCustomerChoices } from "@/modules/customers/customers";
import { getWorkspaceFulfillmentPartyChoices } from "@/modules/fulfillment/fulfillment";
import { warnDeprecatedGroupNameUsage } from "@/modules/groups/deprecation";
import {
  getWorkspaceGroupChoices,
  getWorkspaceGroupChoicesForWorkspace,
} from "@/modules/groups/groups";
import { normalizeStoredLineItems } from "@/modules/line-items/line-items";
import type { CustomerChoice } from "@/modules/customers/types";
import type { FulfillmentPartyChoice } from "@/modules/fulfillment/types";
import type {
  CostCategoryRecord,
  CostFormValues,
  CostPaymentStatus,
  CostRecord,
  CostsEditorData,
  CostsListFilters,
  InvoiceChoice,
  PayablesFilters,
  PayableBucket,
  RevenueChoice,
  RevenueCostSummary,
} from "@/modules/costs/types";
import type { GroupChoice } from "@/modules/groups/types";
import { assertPlanAccess } from "@/modules/plans/access";

export type {
  CostsEditorData,
  InvoiceChoice,
  RevenueChoice,
} from "@/modules/costs/types";

type CostRow = {
  id: string;
  workspace_id: string;
  cost_date: string;
  cost_type: CostRecord["costType"];
  revenue_id: string | null;
  customer_id: string | null;
  group_id: string | null;
  vendor_id: string | null;
  driver_id: string | null;
  guide_id: string | null;
  cost_name: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  payment_status: CostPaymentStatus;
  paid_at: string | null;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
};

type RevenueRow = {
  id: string;
  customer_id: string;
  group_id: string | null;
  group_name: string | null;
  service_date: string;
  line_items?: unknown;
};

type InvoiceRow = {
  id: string;
  customer_id: string;
  revenue_record_id: string | null;
  group_id: string | null;
  group_name: string | null;
  invoice_date: string;
};

export class CostsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostsError";
  }
}

function canManageCosts(context: AuthenticatedAppContext) {
  return context.workspace.role === "owner" || context.workspace.role === "admin";
}

function buildCustomerMap(customers: CustomerChoice[]) {
  return new Map(customers.map((customer) => [customer.id, customer]));
}

function buildFulfillmentMap(parties: FulfillmentPartyChoice[]) {
  return new Map(parties.map((party) => [party.id, party]));
}

function buildGroupMap(groups: GroupChoice[]) {
  return new Map(groups.map((group) => [group.id, group]));
}

function formatRevenueLabel(
  row: RevenueRow,
  customersById: Map<string, CustomerChoice>,
  groupsById: Map<string, GroupChoice>,
) {
  warnDeprecatedGroupNameUsage({
    module: "costs.formatRevenueLabel",
    recordId: row.id,
    groupName: row.group_name,
    groupId: row.group_id,
  });

  const groupName = row.group_id ? groupsById.get(row.group_id)?.name ?? null : null;

  return `${customersById.get(row.customer_id)?.name ?? "Unknown customer"} • ${
    groupName ?? "No group"
  } • ${row.service_date}`;
}

function toCostRecord(
  row: CostRow,
  customersById: Map<string, CustomerChoice>,
  groupsById: Map<string, GroupChoice>,
  revenueChoicesById: Map<string, RevenueChoice>,
  partiesById: Map<string, FulfillmentPartyChoice>,
): CostRecord {
  const group = row.group_id ? groupsById.get(row.group_id) ?? null : null;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    costDate: row.cost_date,
    costType: row.cost_type,
    revenueId: row.revenue_id,
    revenueSummary: row.revenue_id ? revenueChoicesById.get(row.revenue_id)?.label ?? null : null,
    customerId: row.customer_id,
    customerName: row.customer_id ? customersById.get(row.customer_id)?.name ?? null : null,
    groupId: row.group_id,
    groupName: group?.name ?? null,
    vendorId: row.vendor_id,
    vendorName: row.vendor_id ? partiesById.get(row.vendor_id)?.displayName ?? null : null,
    driverId: row.driver_id,
    driverName: row.driver_id ? partiesById.get(row.driver_id)?.displayName ?? null : null,
    guideId: row.guide_id,
    guideName: row.guide_id ? partiesById.get(row.guide_id)?.displayName ?? null : null,
    costName: row.cost_name,
    description: row.description,
    amountCents: row.amount_cents,
    currency: row.currency,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    notesInternal: row.notes_internal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getCostFormDefaults(cost?: CostRecord | null): CostFormValues {
  return {
    costDate: cost?.costDate ?? "",
    costType: cost?.costType ?? "overhead",
    revenueId: cost?.revenueId ?? "",
    customerId: cost?.customerId ?? "",
    groupId: cost?.groupId ?? "",
    vendorId: cost?.vendorId ?? "",
    driverId: cost?.driverId ?? "",
    guideId: cost?.guideId ?? "",
    costName: cost?.costName ?? "",
    description: cost?.description ?? "",
    amount: cost ? (cost.amountCents / 100).toFixed(2) : "",
    paymentStatus: cost?.paymentStatus ?? "unpaid",
    notesInternal: cost?.notesInternal ?? "",
  };
}

export function assertCanManageCosts(context: AuthenticatedAppContext) {
  assertPlanAccess(context, "cost");

  if (!canManageCosts(context)) {
    throw new CostsError("Only workspace owners and admins can create or edit costs.");
  }
}

async function getRevenueChoices(
  workspaceId: string,
  customersById: Map<string, CustomerChoice>,
  groupsById: Map<string, GroupChoice>,
): Promise<RevenueChoice[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revenue_records")
    .select("id, customer_id, group_id, group_name, service_date, line_items")
    .eq("workspace_id", workspaceId)
    .order("service_date", { ascending: false });

  if (error) {
    throw new CostsError("We could not load Daytime choices right now.");
  }

  return ((data ?? []) as RevenueRow[]).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: customersById.get(row.customer_id)?.name ?? "Unknown customer",
    groupId: row.group_id,
    label: formatRevenueLabel(row, customersById, groupsById),
    items: normalizeStoredLineItems(row.line_items).map((item) => ({
      id: item.id,
      title: item.title,
      serviceDate: item.serviceDate,
    })),
  }));
}

async function getInvoiceChoices(
  workspaceId: string,
  customersById: Map<string, CustomerChoice>,
  groupsById: Map<string, GroupChoice>,
): Promise<InvoiceChoice[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, customer_id, revenue_record_id, group_id, group_name, invoice_date")
    .eq("workspace_id", workspaceId)
    .order("invoice_date", { ascending: false });

  if (error) {
    throw new CostsError("We could not load invoice choices right now.");
  }

  return ((data ?? []) as InvoiceRow[]).map((row) => {
    warnDeprecatedGroupNameUsage({
      module: "costs.getInvoiceChoices",
      recordId: row.id,
      groupName: row.group_name,
      groupId: row.group_id,
    });

    const groupName = row.group_id ? groupsById.get(row.group_id)?.name ?? null : null;

    return {
      id: row.id,
      label: `${customersById.get(row.customer_id)?.name ?? "Unknown customer"} • ${
        groupName ?? "No group"
      } • ${row.invoice_date}`,
      customerId: row.customer_id,
      revenueRecordId: row.revenue_record_id,
    };
  });
}

export async function getCostsEditorData(
  context: AuthenticatedAppContext,
): Promise<CostsEditorData> {
  const customers = await getWorkspaceCustomerChoices(context);
  const customersById = buildCustomerMap(customers);
  const groupChoices = await getWorkspaceGroupChoices(context);
  const groupsById = buildGroupMap(groupChoices);
  const [revenueChoices, invoiceChoices, fulfillmentParties] = await Promise.all([
    getRevenueChoices(context.workspace.id, customersById, groupsById),
    getInvoiceChoices(context.workspace.id, customersById, groupsById),
    getWorkspaceFulfillmentPartyChoices(context),
  ]);

  return {
    canManageCosts: canManageCosts(context),
    customers,
    categories: [],
    revenueChoices,
    invoiceChoices,
    groupChoices,
    vendorChoices: fulfillmentParties.filter((party) => party.partyType === "vendor"),
    driverChoices: fulfillmentParties.filter((party) => party.partyType === "driver"),
    guideChoices: fulfillmentParties.filter((party) => party.partyType === "guide"),
  };
}

export async function getCostsEditorDataForWorkspace(args: {
  workspaceId: string;
  canManageCosts: boolean;
  customers: CustomerChoice[];
}): Promise<CostsEditorData> {
  const customersById = buildCustomerMap(args.customers);
  const groupChoices = await getWorkspaceGroupChoicesForWorkspace(args.workspaceId);
  const groupsById = buildGroupMap(groupChoices);
  const [revenueChoices, invoiceChoices, fulfillmentParties] = await Promise.all([
    getRevenueChoices(args.workspaceId, customersById, groupsById),
    getInvoiceChoices(args.workspaceId, customersById, groupsById),
    getWorkspaceFulfillmentPartyChoices({
      workspace: { id: args.workspaceId },
    } as AuthenticatedAppContext),
  ]);

  return {
    canManageCosts: args.canManageCosts,
    customers: args.customers,
    categories: [],
    revenueChoices,
    invoiceChoices,
    groupChoices,
    vendorChoices: fulfillmentParties.filter((party) => party.partyType === "vendor"),
    driverChoices: fulfillmentParties.filter((party) => party.partyType === "driver"),
    guideChoices: fulfillmentParties.filter((party) => party.partyType === "guide"),
  };
}

async function getCostsBaseData(context: AuthenticatedAppContext) {
  const [customers, groups, revenueChoices, fulfillmentParties] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
    getCostsEditorData(context).then((data) => data.revenueChoices),
    getWorkspaceFulfillmentPartyChoices(context),
  ]);

  return {
    customersById: buildCustomerMap(customers),
    groupsById: buildGroupMap(groups),
    revenueChoicesById: new Map(revenueChoices.map((item) => [item.id, item])),
    partiesById: buildFulfillmentMap(fulfillmentParties),
  };
}

export async function getCostsList(
  context: AuthenticatedAppContext,
  filters: CostsListFilters = {},
) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("costs")
    .select(
      "id, workspace_id, cost_date, cost_type, revenue_id, customer_id, group_id, vendor_id, driver_id, guide_id, cost_name, description, amount_cents, currency, payment_status, paid_at, notes_internal, created_at, updated_at",
    )
    .eq("workspace_id", context.workspace.id)
    .order("cost_date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (filters.revenueId) query = query.eq("revenue_id", filters.revenueId);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.groupId) query = query.eq("group_id", filters.groupId);
  if (filters.vendorId) query = query.eq("vendor_id", filters.vendorId);
  if (filters.driverId) query = query.eq("driver_id", filters.driverId);
  if (filters.guideId) query = query.eq("guide_id", filters.guideId);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.dateFrom) query = query.gte("cost_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("cost_date", filters.dateTo);

  const { data, error } = await query;

  if (error) {
    throw new CostsError("We could not load costs right now.");
  }

  const baseData = await getCostsBaseData(context);

  return {
    canManageCosts: canManageCosts(context),
    costs: ((data ?? []) as CostRow[]).map((row) =>
      toCostRecord(
        row,
        baseData.customersById,
        baseData.groupsById,
        baseData.revenueChoicesById,
        baseData.partiesById,
      ),
    ),
  };
}

export async function getCostsByRevenueId(
  context: AuthenticatedAppContext,
  revenueId: string,
) {
  return getCostsList(context, { revenueId });
}

export async function getRevenueCostSummary(
  context: AuthenticatedAppContext,
  revenueId: string,
  revenueAmountCents: number,
): Promise<RevenueCostSummary> {
  const costs = await getCostsByRevenueId(context, revenueId);
  const totalCostCents = costs.costs.reduce((sum, cost) => sum + cost.amountCents, 0);
  const unpaidCostCents = costs.costs
    .filter((cost) => cost.paymentStatus === "unpaid")
    .reduce((sum, cost) => sum + cost.amountCents, 0);
  const paidCostCents = costs.costs
    .filter((cost) => cost.paymentStatus === "paid")
    .reduce((sum, cost) => sum + cost.amountCents, 0);

  return {
    totalCostCents,
    unpaidCostCents,
    paidCostCents,
    profitCents: revenueAmountCents - totalCostCents,
  };
}

export async function getCostById(
  context: AuthenticatedAppContext,
  costId: string,
) {
  const [editorData, baseData] = await Promise.all([
    getCostsEditorData(context),
    getCostsBaseData(context),
  ]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("costs")
    .select(
      "id, workspace_id, cost_date, cost_type, revenue_id, customer_id, group_id, vendor_id, driver_id, guide_id, cost_name, description, amount_cents, currency, payment_status, paid_at, notes_internal, created_at, updated_at",
    )
    .eq("workspace_id", context.workspace.id)
    .eq("id", costId)
    .maybeSingle();

  if (error) {
    throw new CostsError("We could not load that cost right now.");
  }

  if (!data) {
    return null;
  }

  return {
    canManageCosts: editorData.canManageCosts,
    editorData,
    cost: toCostRecord(
      data as CostRow,
      baseData.customersById,
      baseData.groupsById,
      baseData.revenueChoicesById,
      baseData.partiesById,
    ),
  };
}

export async function getPayablesOverview(
  context: AuthenticatedAppContext,
  filters: PayablesFilters = {},
): Promise<PayableBucket[]> {
  const { costs } = await getCostsList(context, {
    paymentStatus: filters.unpaidOnly ? "unpaid" : undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  const buckets = new Map<string, PayableBucket>();

  const addToBucket = (
    bucketType: PayableBucket["bucketType"],
    partyId: string | null,
    partyName: string | null,
    cost: CostRecord,
  ) => {
    if (!partyId || !partyName) {
      return;
    }

    const key = `${bucketType}:${partyId}`;
    const existing =
      buckets.get(key) ??
      {
        bucketType,
        partyId,
        partyName,
        unpaidTotalCents: 0,
        paidTotalCents: 0,
        itemCount: 0,
        items: [],
      };

    existing.items.push(cost);
    existing.itemCount += 1;

    if (cost.paymentStatus === "paid") {
      existing.paidTotalCents += cost.amountCents;
    } else {
      existing.unpaidTotalCents += cost.amountCents;
    }

    buckets.set(key, existing);
  };

  for (const cost of costs) {
    if (!filters.partyType || filters.partyType === "vendor") {
      addToBucket("vendor", cost.vendorId, cost.vendorName, cost);
    }

    if (!filters.partyType || filters.partyType === "driver") {
      addToBucket("driver", cost.driverId, cost.driverName, cost);
    }

    if (!filters.partyType || filters.partyType === "guide") {
      addToBucket("guide", cost.guideId, cost.guideName, cost);
    }
  }

  return [...buckets.values()].sort((left, right) => {
    if (right.unpaidTotalCents !== left.unpaidTotalCents) {
      return right.unpaidTotalCents - left.unpaidTotalCents;
    }

    return left.partyName.localeCompare(right.partyName);
  });
}

export async function getCostCategories(
  contextOrWorkspaceId: AuthenticatedAppContext | string,
): Promise<CostCategoryRecord[]> {
  void contextOrWorkspaceId;
  return [];
}

export function mapCostCategoryRow(row: {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}): CostCategoryRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
