export type DashboardDateRange = "today" | "week" | "month" | "custom";

export type DashboardFilters = {
  range: DashboardDateRange;
  startDate: string;
  endDate: string;
};

export type DashboardSummary = {
  todayRevenueCents: number;
  unbilledRevenueCents: number;
  unpaidCostsCents: number;
  thisMonthProfitCents: number;
  totalInvoicesThisMonth: number;
  totalPaymentsReceivedThisMonthCents: number;
  totalPayablesCount: number;
  activeGroupsCount: number;
};

export type DashboardUnbilledEntry = {
  id: string;
  serviceDate: string;
  customerName: string;
  groupName: string | null;
  serviceName: string;
  amountCents: number;
  billingState: "not_needed" | "unbilled" | "billed";
};

export type DashboardUnpaidCost = {
  id: string;
  costDate: string;
  partyName: string;
  costName: string;
  amountCents: number;
  paymentStatus: "unpaid" | "paid";
};

export type DashboardQuickAction = {
  label: string;
  description: string;
  href: string;
  tone?: "primary" | "default";
};

export type DashboardBillingIssue = {
  id: string;
  createdAt: string;
  eventType: string;
  status: string | null;
  detailSummary: string;
};

export type DashboardRecentInvoice = {
  id: string;
  invoiceDate: string;
  invoiceNumber: string;
  customerName: string;
  groupName: string | null;
  amountCents: number;
  status: string;
  paymentStatus: string;
  href: string;
};

export type DashboardRecentPayment = {
  id: string;
  paymentDate: string;
  amountCents: number;
  invoiceNumber: string;
  customerName: string;
  href: string;
};

export type DashboardProfitRank = {
  id: string;
  name: string;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  href: string;
};

export type DashboardData = {
  filters: DashboardFilters;
  summary: DashboardSummary;
  quickActions: DashboardQuickAction[];
  unbilledEntries: DashboardUnbilledEntry[];
  unpaidCosts: DashboardUnpaidCost[];
  billingIssues: DashboardBillingIssue[];
  highestProfitCustomers: DashboardProfitRank[];
  lowestProfitCustomers: DashboardProfitRank[];
  highestProfitGroups: DashboardProfitRank[];
  lowestProfitGroups: DashboardProfitRank[];
  recentInvoices: DashboardRecentInvoice[];
  recentPayments: DashboardRecentPayment[];
};
