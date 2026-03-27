import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceCustomerChoices } from "@/modules/customers/customers";
import type { CustomerChoice } from "@/modules/customers/types";
import { getWorkspaceGroupChoices } from "@/modules/groups/groups";
import type { GroupChoice } from "@/modules/groups/types";
import { normalizeStoredLineItems } from "@/modules/line-items/line-items";
import type {
  ProfitCostDetail,
  ProfitCustomerBreakdown,
  ProfitEntityDetail,
  ProfitFilters,
  ProfitGroupBreakdown,
  ProfitReport,
  ProfitSortBy,
  ProfitSortDirection,
  ProfitSummary,
  ProfitRevenueDetail,
} from "@/modules/profit/types";

type RevenueRow = {
  id: string;
  customer_id: string;
  group_id: string | null;
  service_date: string;
  entry_type: "daytime" | "transfer" | "custom";
  billing_state: "not_needed" | "unbilled" | "billed";
  amount_cents: number;
  line_items: unknown;
};

type CostRow = {
  id: string;
  cost_date: string;
  cost_name: string;
  revenue_id: string | null;
  customer_id: string | null;
  group_id: string | null;
  amount_cents: number;
  payment_status: "unpaid" | "paid";
};

type ProfitDataSet = {
  customers: CustomerChoice[];
  groups: GroupChoice[];
  revenue: RevenueRow[];
  costs: CostRow[];
};

export class ProfitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfitError";
  }
}

function normalizeDateFilter(value: string | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function normalizeIdFilter(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeBillingState(value: string | undefined): ProfitFilters["billingState"] {
  return value === "not_needed" || value === "unbilled" || value === "billed"
    ? value
    : "all";
}

function normalizePaymentStatus(value: string | undefined): ProfitFilters["paymentStatus"] {
  return value === "unpaid" || value === "paid" ? value : "all";
}

function normalizeSortBy(value: string | undefined): ProfitSortBy {
  return value === "revenue" || value === "cost" || value === "profit"
    ? value
    : "profit";
}

function normalizeSortDirection(value: string | undefined): ProfitSortDirection {
  return value === "asc" || value === "desc" ? value : "desc";
}

function buildCustomerMap(customers: CustomerChoice[]) {
  return new Map(customers.map((customer) => [customer.id, customer]));
}

function buildGroupMap(groups: GroupChoice[]) {
  return new Map(groups.map((group) => [group.id, group]));
}

function getRevenueLabel(row: RevenueRow) {
  const lineItem = normalizeStoredLineItems(row.line_items)[0];
  return lineItem?.title?.trim() || row.entry_type;
}

function sortRows<T extends { totalRevenueCents: number; totalCostCents: number; totalProfitCents: number }>(
  rows: T[],
  filters: ProfitFilters,
) {
  const multiplier = filters.sortDirection === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue =
      filters.sortBy === "revenue"
        ? left.totalRevenueCents
        : filters.sortBy === "cost"
          ? left.totalCostCents
          : left.totalProfitCents;
    const rightValue =
      filters.sortBy === "revenue"
        ? right.totalRevenueCents
        : filters.sortBy === "cost"
          ? right.totalCostCents
          : right.totalProfitCents;

    if (leftValue !== rightValue) {
      return (leftValue - rightValue) * multiplier;
    }

    return (left.totalProfitCents - right.totalProfitCents) * multiplier;
  });
}

function matchesRevenueFilters(
  row: RevenueRow,
  filters: ProfitFilters,
) {
  return filters.billingState === "all" || row.billing_state === filters.billingState;
}

function matchesCostFilters(
  row: CostRow,
  filters: ProfitFilters,
) {
  return filters.paymentStatus === "all" || row.payment_status === filters.paymentStatus;
}

function getCustomerOwnedGroupIds(groups: GroupChoice[], customerId: string) {
  return new Set(
    groups
      .filter((group) => group.customerId === customerId)
      .map((group) => group.id),
  );
}

function revenueBelongsToCustomer(row: RevenueRow, customerId: string, groupIds: Set<string>) {
  return row.customer_id === customerId || (row.group_id ? groupIds.has(row.group_id) : false);
}

function costBelongsToCustomer(row: CostRow, customerId: string, groupIds: Set<string>) {
  return row.customer_id === customerId || (row.group_id ? groupIds.has(row.group_id) : false);
}

async function getProfitData(
  context: AuthenticatedAppContext,
  filters: ProfitFilters,
): Promise<ProfitDataSet> {
  const supabase = await createSupabaseServerClient();
  const workspaceId = context.workspace.id;
  const [customers, groups, revenueResponse, costResponse] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
    (async () => {
      let query = supabase
        .from("revenue_records")
        .select(
          "id, customer_id, group_id, service_date, entry_type, billing_state, amount_cents, line_items",
        )
        .eq("workspace_id", workspaceId)
        .order("service_date", { ascending: false });

      if (filters.startDate) {
        query = query.gte("service_date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("service_date", filters.endDate);
      }

      return query;
    })(),
    (async () => {
      let query = supabase
        .from("costs")
        .select(
          "id, cost_date, cost_name, revenue_id, customer_id, group_id, amount_cents, payment_status",
        )
        .eq("workspace_id", workspaceId)
        .order("cost_date", { ascending: false });

      if (filters.startDate) {
        query = query.gte("cost_date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("cost_date", filters.endDate);
      }

      return query;
    })(),
  ]);

  if (revenueResponse.error) {
    throw new ProfitError("We could not load Daytime records for profit reporting.");
  }

  if (costResponse.error) {
    throw new ProfitError("We could not load costs for profit reporting.");
  }

  return {
    customers,
    groups,
    revenue: ((revenueResponse.data ?? []) as RevenueRow[]).filter((row) =>
      matchesRevenueFilters(row, filters),
    ),
    costs: ((costResponse.data ?? []) as CostRow[]).filter((row) =>
      matchesCostFilters(row, filters),
    ),
  };
}

export function getProfitFiltersFromSearchParams(params: {
  start?: string;
  end?: string;
  customerId?: string;
  groupId?: string;
  billingState?: string;
  paymentStatus?: string;
  sortBy?: string;
  sortDirection?: string;
}): ProfitFilters {
  const startDate = normalizeDateFilter(params.start);
  const endDate = normalizeDateFilter(params.end);

  return {
    startDate: startDate && endDate && startDate > endDate ? endDate : startDate,
    endDate: startDate && endDate && startDate > endDate ? startDate : endDate,
    customerId: normalizeIdFilter(params.customerId),
    groupId: normalizeIdFilter(params.groupId),
    billingState: normalizeBillingState(params.billingState),
    paymentStatus: normalizePaymentStatus(params.paymentStatus),
    sortBy: normalizeSortBy(params.sortBy),
    sortDirection: normalizeSortDirection(params.sortDirection),
  };
}

export async function getProfitReport(
  context: AuthenticatedAppContext,
  filters: ProfitFilters,
): Promise<ProfitReport> {
  const data = await getProfitData(context, filters);

  const filteredRevenue = data.revenue.filter((row) => {
    if (filters.groupId && row.group_id !== filters.groupId) {
      return false;
    }

    if (filters.customerId) {
      const groupIds = getCustomerOwnedGroupIds(data.groups, filters.customerId);
      return revenueBelongsToCustomer(row, filters.customerId, groupIds);
    }

    return true;
  });

  const filteredCosts = data.costs.filter((row) => {
    if (filters.groupId && row.group_id !== filters.groupId) {
      return false;
    }

    if (filters.customerId) {
      const groupIds = getCustomerOwnedGroupIds(data.groups, filters.customerId);
      return costBelongsToCustomer(row, filters.customerId, groupIds);
    }

    return true;
  });

  const customerBuckets = new Map<string, ProfitCustomerBreakdown>();

  for (const customer of data.customers) {
    if (filters.customerId && customer.id !== filters.customerId) {
      continue;
    }

    customerBuckets.set(customer.id, {
      customerId: customer.id,
      customerName: customer.name,
      customerCompany: customer.company,
      totalRevenueCents: 0,
      totalCostCents: 0,
      totalProfitCents: 0,
      unbilledRevenueCents: 0,
      unpaidCostCents: 0,
      revenueCount: 0,
      costCount: 0,
    });
  }

  for (const [customerId, bucket] of customerBuckets) {
    const ownedGroupIds = getCustomerOwnedGroupIds(data.groups, customerId);

    for (const revenue of filteredRevenue) {
      if (!revenueBelongsToCustomer(revenue, customerId, ownedGroupIds)) {
        continue;
      }

      bucket.totalRevenueCents += revenue.amount_cents;
      bucket.revenueCount += 1;

      if (revenue.billing_state === "unbilled") {
        bucket.unbilledRevenueCents += revenue.amount_cents;
      }
    }

    for (const cost of filteredCosts) {
      if (!costBelongsToCustomer(cost, customerId, ownedGroupIds)) {
        continue;
      }

      bucket.totalCostCents += cost.amount_cents;
      bucket.costCount += 1;

      if (cost.payment_status === "unpaid") {
        bucket.unpaidCostCents += cost.amount_cents;
      }
    }

    bucket.totalProfitCents = bucket.totalRevenueCents - bucket.totalCostCents;
  }

  const groupBuckets = new Map<string, ProfitGroupBreakdown>();

  for (const group of data.groups) {
    if (filters.groupId && group.id !== filters.groupId) {
      continue;
    }

    if (filters.customerId && group.customerId !== filters.customerId) {
      continue;
    }

    groupBuckets.set(group.id, {
      groupId: group.id,
      groupName: group.name,
      customerId: group.customerId,
      customerName: group.customerName,
      totalRevenueCents: 0,
      totalCostCents: 0,
      totalProfitCents: 0,
      unbilledRevenueCents: 0,
      unpaidCostCents: 0,
      revenueCount: 0,
      costCount: 0,
    });
  }

  for (const revenue of filteredRevenue) {
    if (!revenue.group_id) {
      continue;
    }

    const bucket = groupBuckets.get(revenue.group_id);

    if (!bucket) {
      continue;
    }

    bucket.totalRevenueCents += revenue.amount_cents;
    bucket.revenueCount += 1;

    if (revenue.billing_state === "unbilled") {
      bucket.unbilledRevenueCents += revenue.amount_cents;
    }
  }

  for (const cost of filteredCosts) {
    if (!cost.group_id) {
      continue;
    }

    const bucket = groupBuckets.get(cost.group_id);

    if (!bucket) {
      continue;
    }

    bucket.totalCostCents += cost.amount_cents;
    bucket.costCount += 1;

    if (cost.payment_status === "unpaid") {
      bucket.unpaidCostCents += cost.amount_cents;
    }
  }

  for (const bucket of customerBuckets.values()) {
    bucket.totalProfitCents = bucket.totalRevenueCents - bucket.totalCostCents;
  }

  for (const bucket of groupBuckets.values()) {
    bucket.totalProfitCents = bucket.totalRevenueCents - bucket.totalCostCents;
  }

  const summary: ProfitSummary = {
    totalRevenueCents: filteredRevenue.reduce((sum, row) => sum + row.amount_cents, 0),
    totalCostCents: filteredCosts.reduce((sum, row) => sum + row.amount_cents, 0),
    totalProfitCents: 0,
    unbilledRevenueCents: filteredRevenue
      .filter((row) => row.billing_state === "unbilled")
      .reduce((sum, row) => sum + row.amount_cents, 0),
    unpaidCostCents: filteredCosts
      .filter((row) => row.payment_status === "unpaid")
      .reduce((sum, row) => sum + row.amount_cents, 0),
    revenueCount: filteredRevenue.length,
    costCount: filteredCosts.length,
    customerCount: Array.from(customerBuckets.values()).filter(
      (row) => row.revenueCount > 0 || row.costCount > 0,
    ).length,
    groupCount: Array.from(groupBuckets.values()).filter(
      (row) => row.revenueCount > 0 || row.costCount > 0,
    ).length,
  };
  summary.totalProfitCents = summary.totalRevenueCents - summary.totalCostCents;

  return {
    filters,
    summary,
    byCustomer: sortRows(
      Array.from(customerBuckets.values()).filter(
        (row) => row.revenueCount > 0 || row.costCount > 0,
      ),
      filters,
    ),
    byGroup: sortRows(
      Array.from(groupBuckets.values()).filter(
        (row) => row.revenueCount > 0 || row.costCount > 0,
      ),
      filters,
    ),
  };
}

function mapRevenueDetail(
  row: RevenueRow,
  customersById: Map<string, CustomerChoice>,
  groupsById: Map<string, GroupChoice>,
): ProfitRevenueDetail {
  return {
    id: row.id,
    label: getRevenueLabel(row),
    serviceDate: row.service_date,
    customerId: row.customer_id,
    customerName: customersById.get(row.customer_id)?.name ?? "Unknown customer",
    groupId: row.group_id,
    groupName: row.group_id ? groupsById.get(row.group_id)?.name ?? null : null,
    billingState: row.billing_state,
    amountCents: row.amount_cents,
  };
}

function mapCostDetail(
  row: CostRow,
  customersById: Map<string, CustomerChoice>,
  groupsById: Map<string, GroupChoice>,
  revenueById: Map<string, RevenueRow>,
): ProfitCostDetail {
  const linkedRevenue = row.revenue_id ? revenueById.get(row.revenue_id) ?? null : null;

  return {
    id: row.id,
    costDate: row.cost_date,
    costName: row.cost_name,
    customerId: row.customer_id,
    customerName: row.customer_id ? customersById.get(row.customer_id)?.name ?? null : null,
    groupId: row.group_id,
    groupName: row.group_id ? groupsById.get(row.group_id)?.name ?? null : null,
    revenueId: row.revenue_id,
    revenueLabel: linkedRevenue ? getRevenueLabel(linkedRevenue) : null,
    amountCents: row.amount_cents,
    paymentStatus: row.payment_status,
  };
}

export async function getProfitCustomerDetail(
  context: AuthenticatedAppContext,
  customerId: string,
  filters: ProfitFilters,
): Promise<ProfitEntityDetail | null> {
  const data = await getProfitData(context, filters);
  const customer = data.customers.find((row) => row.id === customerId) ?? null;

  if (!customer) {
    return null;
  }

  const customersById = buildCustomerMap(data.customers);
  const groupsById = buildGroupMap(data.groups);
  const ownedGroupIds = getCustomerOwnedGroupIds(data.groups, customerId);
  const revenue = data.revenue
    .filter((row) => revenueBelongsToCustomer(row, customerId, ownedGroupIds))
    .filter((row) => (filters.groupId ? row.group_id === filters.groupId : true));
  const costs = data.costs
    .filter((row) => costBelongsToCustomer(row, customerId, ownedGroupIds))
    .filter((row) => (filters.groupId ? row.group_id === filters.groupId : true));
  const revenueById = new Map(revenue.map((row) => [row.id, row]));

  const totalRevenueCents = revenue.reduce((sum, row) => sum + row.amount_cents, 0);
  const totalCostCents = costs.reduce((sum, row) => sum + row.amount_cents, 0);

  return {
    kind: "customer",
    id: customer.id,
    name: customer.name,
    customerName: customer.name,
    filters,
    summary: {
      totalRevenueCents,
      totalCostCents,
      totalProfitCents: totalRevenueCents - totalCostCents,
      unbilledRevenueCents: revenue
        .filter((row) => row.billing_state === "unbilled")
        .reduce((sum, row) => sum + row.amount_cents, 0),
      unpaidCostCents: costs
        .filter((row) => row.payment_status === "unpaid")
        .reduce((sum, row) => sum + row.amount_cents, 0),
    },
    revenue: revenue.map((row) => mapRevenueDetail(row, customersById, groupsById)),
    costs: costs.map((row) => mapCostDetail(row, customersById, groupsById, revenueById)),
  };
}

export async function getProfitGroupDetail(
  context: AuthenticatedAppContext,
  groupId: string,
  filters: ProfitFilters,
): Promise<ProfitEntityDetail | null> {
  const data = await getProfitData(context, filters);
  const group = data.groups.find((row) => row.id === groupId) ?? null;

  if (!group) {
    return null;
  }

  const customersById = buildCustomerMap(data.customers);
  const groupsById = buildGroupMap(data.groups);
  const revenue = data.revenue.filter((row) => row.group_id === groupId);
  const costs = data.costs.filter((row) => row.group_id === groupId);
  const revenueById = new Map(revenue.map((row) => [row.id, row]));
  const totalRevenueCents = revenue.reduce((sum, row) => sum + row.amount_cents, 0);
  const totalCostCents = costs.reduce((sum, row) => sum + row.amount_cents, 0);

  return {
    kind: "group",
    id: group.id,
    name: group.name,
    customerName: group.customerName,
    filters,
    summary: {
      totalRevenueCents,
      totalCostCents,
      totalProfitCents: totalRevenueCents - totalCostCents,
      unbilledRevenueCents: revenue
        .filter((row) => row.billing_state === "unbilled")
        .reduce((sum, row) => sum + row.amount_cents, 0),
      unpaidCostCents: costs
        .filter((row) => row.payment_status === "unpaid")
        .reduce((sum, row) => sum + row.amount_cents, 0),
    },
    revenue: revenue.map((row) => mapRevenueDetail(row, customersById, groupsById)),
    costs: costs.map((row) => mapCostDetail(row, customersById, groupsById, revenueById)),
  };
}
