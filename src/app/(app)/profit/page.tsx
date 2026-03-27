import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { getWorkspaceCustomerChoices } from "@/modules/customers/customers";
import { getWorkspaceGroupChoices } from "@/modules/groups/groups";
import { ProfitBreakdowns } from "@/modules/profit/components/profit-breakdowns";
import { ProfitFilterForm } from "@/modules/profit/components/profit-filter-form";
import { ProfitStatusBanner } from "@/modules/profit/components/profit-status-banner";
import { ProfitSummaryGrid } from "@/modules/profit/components/profit-summary-grid";
import {
  getProfitFiltersFromSearchParams,
  getProfitReport,
} from "@/modules/profit/profit";

type ProfitPageProps = {
  searchParams: Promise<{
    start?: string;
    end?: string;
    customerId?: string;
    groupId?: string;
    billingState?: string;
    paymentStatus?: string;
    sortBy?: string;
    sortDirection?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function ProfitPage({ searchParams }: ProfitPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const filters = getProfitFiltersFromSearchParams({
    start: params.start,
    end: params.end,
    customerId: params.customerId,
    groupId: params.groupId,
    billingState: params.billingState,
    paymentStatus: params.paymentStatus,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  const [report, customers, groups] = await Promise.all([
    getProfitReport(context, filters),
    getWorkspaceCustomerChoices(context),
    getWorkspaceGroupChoices(context),
  ]);

  return (
    <PageShell
      eyebrow="Profit"
      title="Profit Dashboard"
      description="Workspace-scoped profit reporting built from real revenue, invoices, payments, and formal cost data."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Operational reporting</p>
          <h2 className="section-title">Profit</h2>
          <p className="muted">
            Management profit views built from Daytime revenue and internal costs.
            Customer and group sections stay separate and drill into detail.
          </p>
        </div>

        <div className="cost-link-row">
          <Link className="link-pill" href="/revenue">
            Revenue
          </Link>
          <Link className="link-pill" href="/invoices">
            Invoices
          </Link>
          <Link className="link-pill" href="/costs">
            Costs
          </Link>
        </div>
      </section>

      <ProfitStatusBanner status={status} />
      <ProfitFilterForm filters={filters} customers={customers} groups={groups} />
      <ProfitSummaryGrid report={report} />
      <ProfitBreakdowns report={report} />
    </PageShell>
  );
}
