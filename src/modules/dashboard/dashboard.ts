import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceCustomerChoices } from "@/modules/customers/customers";
import { getWorkspaceFulfillmentPartyChoices } from "@/modules/fulfillment/fulfillment";
import { getWorkspaceGroupChoices } from "@/modules/groups/groups";
import { normalizeStoredLineItems } from "@/modules/line-items/line-items";
import { getProfitFiltersFromSearchParams, getProfitReport } from "@/modules/profit/profit";
import type {
  DashboardBillingIssue,
  DashboardData,
  DashboardFilters,
  DashboardProfitRank,
  DashboardQuickAction,
  DashboardRecentInvoice,
  DashboardRecentPayment,
  DashboardSummary,
  DashboardUnbilledEntry,
  DashboardUnpaidCost,
} from "@/modules/dashboard/types";

type RevenueRow = {
  id: string;
  customer_id: string;
  group_id: string | null;
  service_date: string;
  billing_state: "not_needed" | "unbilled" | "billed";
  amount_cents: number;
  line_items: unknown;
};

type CostRow = {
  id: string;
  cost_date: string;
  cost_name: string;
  amount_cents: number;
  payment_status: "unpaid" | "paid";
  vendor_id: string | null;
  driver_id: string | null;
  guide_id: string | null;
};

type PaymentEventRow = {
  id: string;
  invoice_id: string | null;
  amount_cents: number;
  payment_date: string;
};

type InvoiceRow = {
  id: string;
  customer_id: string;
  group_id: string | null;
  invoice_number: string;
  invoice_date: string;
  status: string;
  payment_status: string;
  amount_cents: number;
};

type BillingEventRow = {
  id: string;
  created_at: string;
  event_type: string;
  status: string | null;
  detail: Record<string, unknown> | null;
};

export class DashboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardError";
  }
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function getWeekStartIso() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const mondayOffset = utcDay === 0 ? -6 : 1 - utcDay;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() + mondayOffset);
  return start.toISOString().slice(0, 10);
}

function normalizeDate(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

export function getDashboardFiltersFromSearchParams(params: {
  range?: string;
  start?: string;
  end?: string;
}): DashboardFilters {
  const range = params.range === "today" || params.range === "week" || params.range === "custom"
    ? params.range
    : "month";
  const today = getTodayIso();

  if (range === "today") {
    return {
      range,
      startDate: today,
      endDate: today,
    };
  }

  if (range === "week") {
    return {
      range,
      startDate: getWeekStartIso(),
      endDate: today,
    };
  }

  if (range === "custom") {
    const startDate = normalizeDate(params.start);
    const endDate = normalizeDate(params.end);

    if (startDate && endDate && startDate > endDate) {
      return {
        range,
        startDate: endDate,
        endDate: startDate,
      };
    }

    return {
      range,
      startDate,
      endDate,
    };
  }

  return {
    range: "month",
    startDate: getMonthStartIso(),
    endDate: today,
  };
}

function getServiceName(lineItems: unknown) {
  return normalizeStoredLineItems(lineItems)[0]?.title?.trim() || "Daytime entry";
}

function summarizeBillingDetail(detail: Record<string, unknown> | null) {
  if (!detail) {
    return "Review billing status.";
  }

  const detailMessageKeys = ["message", "reason", "summary", "note"] as const;

  for (const key of detailMessageKeys) {
    const value = detail[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "Review billing status.";
}

function buildSummary(args: {
  todayRevenueRows: RevenueRow[];
  unbilledRevenueRows: RevenueRow[];
  thisMonthRevenueRows: RevenueRow[];
  unpaidCostRows: CostRow[];
  thisMonthCostRows: CostRow[];
  invoicesThisMonthCount: number;
  paymentsThisMonth: PaymentEventRow[];
  activeGroupsCount: number;
}): DashboardSummary {
  const todayRevenueCents = args.todayRevenueRows.reduce(
    (sum, row) => sum + row.amount_cents,
    0,
  );
  const unbilledRevenueCents = args.unbilledRevenueRows.reduce(
    (sum, row) => sum + row.amount_cents,
    0,
  );
  const unpaidCostsCents = args.unpaidCostRows.reduce((sum, row) => sum + row.amount_cents, 0);
  const thisMonthRevenueCents = args.thisMonthRevenueRows.reduce(
    (sum, row) => sum + row.amount_cents,
    0,
  );
  const thisMonthCostsCents = args.thisMonthCostRows.reduce(
    (sum, row) => sum + row.amount_cents,
    0,
  );
  const totalPaymentsReceivedThisMonthCents = args.paymentsThisMonth.reduce(
    (sum, row) => sum + row.amount_cents,
    0,
  );

  return {
    todayRevenueCents,
    unbilledRevenueCents,
    unpaidCostsCents,
    thisMonthProfitCents: thisMonthRevenueCents - thisMonthCostsCents,
    totalInvoicesThisMonth: args.invoicesThisMonthCount,
    totalPaymentsReceivedThisMonthCents,
    totalPayablesCount: args.unpaidCostRows.length,
    activeGroupsCount: args.activeGroupsCount,
  };
}

function sortProfitRanks(rows: DashboardProfitRank[], direction: "asc" | "desc") {
  return [...rows].sort((left, right) =>
    direction === "desc"
      ? right.profitCents - left.profitCents
      : left.profitCents - right.profitCents,
  );
}

export async function getDashboardData(
  context: AuthenticatedAppContext,
  filters: DashboardFilters,
): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const workspaceId = context.workspace.id;
  const today = getTodayIso();
  const monthStart = getMonthStartIso();

  const quickActions: DashboardQuickAction[] = [
    {
      label: "New Daytime",
      description: "Log today’s operating revenue.",
      href: "/revenue/new",
      tone: "primary",
    },
    {
      label: "Create Invoice",
      description: "Move unbilled work toward cash collected.",
      href: "/invoices",
    },
    {
      label: "Add Cost",
      description: "Capture a driver, guide, or vendor cost.",
      href: "/costs/new",
    },
    {
      label: "Open Payables",
      description: "Work through unpaid costs and payouts.",
      href: "/payables",
    },
    {
      label: "View Profit",
      description: "Check margin by customer and group.",
      href: "/profit",
    },
    {
      label: "Add Customer / Group",
      description: "Keep operations tied to real accounts.",
      href: "/customers/new",
    },
  ];

  const [customers, groups, fulfillmentParties, todayRevenueResponse, unbilledRevenueResponse, thisMonthRevenueResponse, recentUnbilledResponse, unpaidCostsResponse, recentUnpaidCostsResponse, thisMonthCostsResponse, invoicesThisMonthResponse, paymentsThisMonthResponse, recentInvoicesResponse, recentPaymentEventsResponse, billingIssuesResponse] =
    await Promise.all([
      getWorkspaceCustomerChoices(context),
      getWorkspaceGroupChoices(context),
      getWorkspaceFulfillmentPartyChoices(context),
      supabase
        .from("revenue_records")
        .select("id, customer_id, group_id, service_date, billing_state, amount_cents, line_items")
        .eq("workspace_id", workspaceId)
        .eq("service_date", today),
      supabase
        .from("revenue_records")
        .select("id, customer_id, group_id, service_date, billing_state, amount_cents, line_items")
        .eq("workspace_id", workspaceId)
        .eq("billing_state", "unbilled"),
      supabase
        .from("revenue_records")
        .select("id, customer_id, group_id, service_date, billing_state, amount_cents, line_items")
        .eq("workspace_id", workspaceId)
        .gte("service_date", monthStart)
        .lte("service_date", today),
      (() => {
        let query = supabase
          .from("revenue_records")
          .select("id, customer_id, group_id, service_date, billing_state, amount_cents, line_items")
          .eq("workspace_id", workspaceId)
          .eq("billing_state", "unbilled")
          .order("service_date", { ascending: false })
          .limit(8);

        if (filters.startDate) query = query.gte("service_date", filters.startDate);
        if (filters.endDate) query = query.lte("service_date", filters.endDate);
        return query;
      })(),
      supabase
        .from("costs")
        .select("id, cost_date, cost_name, amount_cents, payment_status, vendor_id, driver_id, guide_id")
        .eq("workspace_id", workspaceId)
        .eq("payment_status", "unpaid"),
      (() => {
        let query = supabase
          .from("costs")
          .select("id, cost_date, cost_name, amount_cents, payment_status, vendor_id, driver_id, guide_id")
          .eq("workspace_id", workspaceId)
          .eq("payment_status", "unpaid")
          .order("cost_date", { ascending: false })
          .limit(8);

        if (filters.startDate) query = query.gte("cost_date", filters.startDate);
        if (filters.endDate) query = query.lte("cost_date", filters.endDate);
        return query;
      })(),
      supabase
        .from("costs")
        .select("id, cost_date, cost_name, amount_cents, payment_status, vendor_id, driver_id, guide_id")
        .eq("workspace_id", workspaceId)
        .gte("cost_date", monthStart)
        .lte("cost_date", today),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("invoice_date", monthStart)
        .lte("invoice_date", today),
      supabase
        .from("invoice_payment_events")
        .select("id, invoice_id, amount_cents, payment_date")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .gte("payment_date", monthStart)
        .lte("payment_date", today),
      (() => {
        let query = supabase
          .from("invoices")
          .select("id, customer_id, group_id, invoice_number, invoice_date, status, payment_status, amount_cents")
          .eq("workspace_id", workspaceId)
          .order("invoice_date", { ascending: false })
          .limit(6);

        if (filters.startDate) query = query.gte("invoice_date", filters.startDate);
        if (filters.endDate) query = query.lte("invoice_date", filters.endDate);
        return query;
      })(),
      (() => {
        let query = supabase
          .from("invoice_payment_events")
          .select("id, invoice_id, amount_cents, payment_date")
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .order("payment_date", { ascending: false })
          .limit(6);

        if (filters.startDate) query = query.gte("payment_date", filters.startDate);
        if (filters.endDate) query = query.lte("payment_date", filters.endDate);
        return query;
      })(),
      supabase
        .from("billing_events")
        .select("id, created_at, event_type, status, detail")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  if (
    todayRevenueResponse.error ||
    unbilledRevenueResponse.error ||
    thisMonthRevenueResponse.error ||
    recentUnbilledResponse.error ||
    unpaidCostsResponse.error ||
    recentUnpaidCostsResponse.error ||
    thisMonthCostsResponse.error ||
    invoicesThisMonthResponse.error ||
    paymentsThisMonthResponse.error ||
    recentInvoicesResponse.error ||
    recentPaymentEventsResponse.error ||
    billingIssuesResponse.error
  ) {
    throw new DashboardError("We could not load dashboard data right now.");
  }

  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const partiesById = new Map(fulfillmentParties.map((party) => [party.id, party]));
  const recentInvoicesRows = (recentInvoicesResponse.data ?? []) as InvoiceRow[];
  const invoicesById = new Map(recentInvoicesRows.map((invoice) => [invoice.id, invoice]));

  const summary = buildSummary({
    todayRevenueRows: (todayRevenueResponse.data ?? []) as RevenueRow[],
    unbilledRevenueRows: (unbilledRevenueResponse.data ?? []) as RevenueRow[],
    thisMonthRevenueRows: (thisMonthRevenueResponse.data ?? []) as RevenueRow[],
    unpaidCostRows: (unpaidCostsResponse.data ?? []) as CostRow[],
    thisMonthCostRows: (thisMonthCostsResponse.data ?? []) as CostRow[],
    invoicesThisMonthCount: invoicesThisMonthResponse.count ?? 0,
    paymentsThisMonth: (paymentsThisMonthResponse.data ?? []) as PaymentEventRow[],
    activeGroupsCount: groups.filter((group) => group.status === "active").length,
  });

  const unbilledEntries: DashboardUnbilledEntry[] = ((recentUnbilledResponse.data ?? []) as RevenueRow[]).map(
    (row) => ({
      id: row.id,
      serviceDate: row.service_date,
      customerName: customersById.get(row.customer_id)?.name ?? "Unknown customer",
      groupName: row.group_id ? groupsById.get(row.group_id)?.name ?? null : null,
      serviceName: getServiceName(row.line_items),
      amountCents: row.amount_cents,
      billingState: row.billing_state,
    }),
  );

  const unpaidCosts: DashboardUnpaidCost[] = ((recentUnpaidCostsResponse.data ?? []) as CostRow[]).map(
    (row) => ({
      id: row.id,
      costDate: row.cost_date,
      partyName:
        (row.driver_id ? partiesById.get(row.driver_id)?.displayName : null) ||
        (row.vendor_id ? partiesById.get(row.vendor_id)?.displayName : null) ||
        (row.guide_id ? partiesById.get(row.guide_id)?.displayName : null) ||
        "Unassigned",
      costName: row.cost_name,
      amountCents: row.amount_cents,
      paymentStatus: row.payment_status,
    }),
  );

  const billingIssues: DashboardBillingIssue[] = ((billingIssuesResponse.data ?? []) as BillingEventRow[])
    .filter((row) => row.event_type === "payment_failed" || row.status === "pending")
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      eventType: row.event_type,
      status: row.status,
      detailSummary: summarizeBillingDetail(row.detail),
    }));

  const recentInvoices: DashboardRecentInvoice[] = recentInvoicesRows.map((row) => ({
    id: row.id,
    invoiceDate: row.invoice_date,
    invoiceNumber: row.invoice_number,
    customerName: customersById.get(row.customer_id)?.name ?? "Unknown customer",
    groupName: row.group_id ? groupsById.get(row.group_id)?.name ?? null : null,
    amountCents: row.amount_cents,
    status: row.status,
    paymentStatus: row.payment_status,
    href: `/invoices/${row.id}`,
  }));

  const recentPayments: DashboardRecentPayment[] = (
    (recentPaymentEventsResponse.data ?? []) as PaymentEventRow[]
  ).map((row) => {
    const invoice = row.invoice_id ? invoicesById.get(row.invoice_id) ?? null : null;

    return {
      id: row.id,
      paymentDate: row.payment_date,
      amountCents: row.amount_cents,
      invoiceNumber: invoice?.invoice_number ?? "Payment recorded",
      customerName: invoice
        ? customersById.get(invoice.customer_id)?.name ?? "Unknown customer"
        : "Unlinked invoice",
      href: invoice ? `/invoices/${invoice.id}` : "/invoices",
    };
  });

  const profitReport = await getProfitReport(
    context,
    getProfitFiltersFromSearchParams({
      start: filters.startDate,
      end: filters.endDate,
      sortBy: "profit",
      sortDirection: "desc",
    }),
  );

  const customerRanks: DashboardProfitRank[] = profitReport.byCustomer.map((row) => ({
    id: row.customerId,
    name: row.customerName,
    revenueCents: row.totalRevenueCents,
    costCents: row.totalCostCents,
    profitCents: row.totalProfitCents,
    href: `/profit/customers/${row.customerId}`,
  }));

  const groupRanks: DashboardProfitRank[] = profitReport.byGroup.map((row) => ({
    id: row.groupId,
    name: row.groupName,
    revenueCents: row.totalRevenueCents,
    costCents: row.totalCostCents,
    profitCents: row.totalProfitCents,
    href: `/profit/groups/${row.groupId}`,
  }));

  return {
    filters,
    summary,
    quickActions,
    unbilledEntries,
    unpaidCosts,
    billingIssues,
    highestProfitCustomers: sortProfitRanks(customerRanks, "desc").slice(0, 5),
    lowestProfitCustomers: sortProfitRanks(customerRanks, "asc").slice(0, 5),
    highestProfitGroups: sortProfitRanks(groupRanks, "desc").slice(0, 5),
    lowestProfitGroups: sortProfitRanks(groupRanks, "asc").slice(0, 5),
    recentInvoices,
    recentPayments,
  };
}
