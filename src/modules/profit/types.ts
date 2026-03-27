export type ProfitSortBy = "revenue" | "cost" | "profit";
export type ProfitSortDirection = "asc" | "desc";

export type ProfitFilters = {
  startDate: string;
  endDate: string;
  customerId: string;
  groupId: string;
  billingState: "all" | "not_needed" | "unbilled" | "billed";
  paymentStatus: "all" | "unpaid" | "paid";
  sortBy: ProfitSortBy;
  sortDirection: ProfitSortDirection;
};

export type ProfitSummary = {
  totalRevenueCents: number;
  totalCostCents: number;
  totalProfitCents: number;
  unbilledRevenueCents: number;
  unpaidCostCents: number;
  revenueCount: number;
  costCount: number;
  customerCount: number;
  groupCount: number;
};

export type ProfitCustomerBreakdown = {
  customerId: string;
  customerName: string;
  customerCompany: string | null;
  totalRevenueCents: number;
  totalCostCents: number;
  totalProfitCents: number;
  unbilledRevenueCents: number;
  unpaidCostCents: number;
  revenueCount: number;
  costCount: number;
};

export type ProfitGroupBreakdown = {
  groupId: string;
  groupName: string;
  customerId: string | null;
  customerName: string | null;
  totalRevenueCents: number;
  totalCostCents: number;
  totalProfitCents: number;
  unbilledRevenueCents: number;
  unpaidCostCents: number;
  revenueCount: number;
  costCount: number;
};

export type ProfitRevenueDetail = {
  id: string;
  label: string;
  serviceDate: string;
  customerId: string;
  customerName: string;
  groupId: string | null;
  groupName: string | null;
  billingState: "not_needed" | "unbilled" | "billed";
  amountCents: number;
};

export type ProfitCostDetail = {
  id: string;
  costDate: string;
  costName: string;
  customerId: string | null;
  customerName: string | null;
  groupId: string | null;
  groupName: string | null;
  revenueId: string | null;
  revenueLabel: string | null;
  amountCents: number;
  paymentStatus: "unpaid" | "paid";
};

export type ProfitEntityDetail = {
  kind: "customer" | "group";
  id: string;
  name: string;
  customerName: string | null;
  filters: ProfitFilters;
  summary: {
    totalRevenueCents: number;
    totalCostCents: number;
    totalProfitCents: number;
    unbilledRevenueCents: number;
    unpaidCostCents: number;
  };
  revenue: ProfitRevenueDetail[];
  costs: ProfitCostDetail[];
};

export type ProfitReport = {
  filters: ProfitFilters;
  summary: ProfitSummary;
  byCustomer: ProfitCustomerBreakdown[];
  byGroup: ProfitGroupBreakdown[];
};
