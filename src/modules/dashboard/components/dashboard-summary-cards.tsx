import type { DashboardSummary } from "@/modules/dashboard/types";

type DashboardSummaryCardsProps = {
  summary: DashboardSummary;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

export function DashboardSummaryCards({ summary }: DashboardSummaryCardsProps) {
  const cards = [
    {
      label: "Today Revenue",
      value: formatAmount(summary.todayRevenueCents),
      note: `${summary.totalInvoicesThisMonth} invoices created this month`,
      tone: "success",
    },
    {
      label: "Unbilled Revenue",
      value: formatAmount(summary.unbilledRevenueCents),
      note: "Revenue still waiting to be invoiced",
      tone: "warning",
    },
    {
      label: "Unpaid Costs",
      value: formatAmount(summary.unpaidCostsCents),
      note: `${summary.totalPayablesCount} payables still open`,
      tone: "warning",
    },
    {
      label: "This Month Profit",
      value: formatAmount(summary.thisMonthProfitCents),
      note: `${formatAmount(summary.totalPaymentsReceivedThisMonthCents)} payments received this month`,
      tone: "default",
    },
  ];

  return (
    <section className="dashboard-kpi-grid">
      {cards.map((card) => (
        <article
          className={`surface section stack dashboard-summary-card dashboard-summary-card-${card.tone}`}
          key={card.label}
        >
          <div className="stack stack-tight">
            <p className="eyebrow">{card.label}</p>
            <h2 className="dashboard-kpi-value">{card.value}</h2>
          </div>
          <p className="muted dashboard-kpi-note">{card.note}</p>
        </article>
      ))}
    </section>
  );
}
