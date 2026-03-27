import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { DashboardFilterForm } from "@/modules/dashboard/components/dashboard-filter-form";
import { DashboardOperationalSections } from "@/modules/dashboard/components/dashboard-operational-sections";
import { DashboardSummaryCards } from "@/modules/dashboard/components/dashboard-summary-cards";
import {
  getDashboardData,
  getDashboardFiltersFromSearchParams,
} from "@/modules/dashboard/dashboard";
import { BootstrapNotice } from "@/modules/settings/components/bootstrap-notice";

type DashboardPageProps = {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const filters = getDashboardFiltersFromSearchParams(params);
  const data = await getDashboardData(context, filters);

  return (
    <PageShell
      eyebrow="Operations"
      title="Daily Control Center"
      description="See what came in, what is still unbilled, what still needs to be paid, and what needs action next."
    >
      <BootstrapNotice
        bootstrap={context.bootstrap}
        hasProfileName={Boolean(context.profile.fullName?.trim())}
      />

      <DashboardFilterForm filters={data.filters} />
      <DashboardSummaryCards summary={data.summary} />
      <DashboardOperationalSections
        quickActions={data.quickActions}
        unbilledEntries={data.unbilledEntries}
        unpaidCosts={data.unpaidCosts}
        billingIssues={data.billingIssues}
        highestProfitCustomers={data.highestProfitCustomers}
        lowestProfitCustomers={data.lowestProfitCustomers}
        highestProfitGroups={data.highestProfitGroups}
        lowestProfitGroups={data.lowestProfitGroups}
        recentInvoices={data.recentInvoices}
        recentPayments={data.recentPayments}
      />
    </PageShell>
  );
}
