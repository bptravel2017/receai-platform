import type { ProfitReport } from "@/modules/profit/types";

type ProfitSummaryGridProps = {
  report: ProfitReport;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

export function ProfitSummaryGrid({ report }: ProfitSummaryGridProps) {
  const { summary } = report;

  return (
    <section className="grid grid-2 profit-summary-grid">
      <article className="surface section stack profit-summary-card">
        <p className="eyebrow">Revenue</p>
        <h2 className="section-title">{formatAmount(summary.totalRevenueCents)}</h2>
        <p className="muted">{summary.revenueCount} Daytime entries</p>
      </article>

      <article className="surface section stack profit-summary-card">
        <p className="eyebrow">Cost</p>
        <h2 className="section-title">{formatAmount(summary.totalCostCents)}</h2>
        <p className="muted">{summary.costCount} cost records</p>
      </article>

      <article className="surface section stack profit-summary-card">
        <p className="eyebrow">Profit</p>
        <h2 className="section-title">{formatAmount(summary.totalProfitCents)}</h2>
        <p className="muted">Revenue minus cost</p>
      </article>

      <article className="surface section stack profit-summary-card">
        <p className="eyebrow">Unbilled Revenue</p>
        <h2 className="section-title">{formatAmount(summary.unbilledRevenueCents)}</h2>
        <p className="muted">Open billing still not invoiced</p>
      </article>

      <article className="surface section stack profit-summary-card">
        <p className="eyebrow">Unpaid Cost</p>
        <h2 className="section-title">{formatAmount(summary.unpaidCostCents)}</h2>
        <p className="muted">Operational payouts still unpaid</p>
      </article>

      <article className="surface section stack profit-summary-card">
        <p className="eyebrow">Coverage</p>
        <h2 className="section-title">
          {summary.customerCount} customers • {summary.groupCount} groups
        </h2>
        <p className="muted">Rows with revenue or cost activity in the current filter</p>
      </article>
    </section>
  );
}
