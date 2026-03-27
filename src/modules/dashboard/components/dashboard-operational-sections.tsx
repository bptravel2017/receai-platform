import Link from "next/link";

import type {
  DashboardBillingIssue,
  DashboardProfitRank,
  DashboardQuickAction,
  DashboardRecentInvoice,
  DashboardRecentPayment,
  DashboardUnbilledEntry,
  DashboardUnpaidCost,
} from "@/modules/dashboard/types";

type DashboardOperationalSectionsProps = {
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

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function renderProfitTable(title: string, entityLabel: string, rows: DashboardProfitRank[]) {
  return (
    <article className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">{entityLabel}</p>
        <h3 className="section-title dashboard-section-heading">{title}</h3>
      </div>

      <div className="profit-table-wrap">
        <table className="profit-table dashboard-compact-table">
          <thead>
            <tr>
              <th>{entityLabel}</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={row.href}>{row.name}</Link>
                  </td>
                  <td>{formatAmount(row.revenueCents)}</td>
                  <td>{formatAmount(row.costCents)}</td>
                  <td>{formatAmount(row.profitCents)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>No profit rows in this window.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function DashboardOperationalSections({
  quickActions,
  unbilledEntries,
  unpaidCosts,
  billingIssues,
  highestProfitCustomers,
  lowestProfitCustomers,
  highestProfitGroups,
  lowestProfitGroups,
  recentInvoices,
  recentPayments,
}: DashboardOperationalSectionsProps) {
  return (
    <div className="stack dashboard-home-sections">
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Quick Actions</p>
          <h2 className="section-title">Move today’s operations forward</h2>
        </div>

        <div className="dashboard-quick-actions-grid">
          {quickActions.map((action) => (
            <Link
              className={`dashboard-action-card dashboard-action-card-${action.tone ?? "default"}`}
              href={action.href}
              key={action.label}
            >
              <strong>{action.label}</strong>
              <span>{action.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="surface section stack dashboard-attention-section">
        <div className="dashboard-section-header">
          <div className="stack stack-tight">
            <p className="eyebrow">Needs Attention</p>
            <h2 className="section-title">What needs action today</h2>
            <p className="muted">
              Unbilled work, unpaid payables, and billing issues that can block cash flow.
            </p>
          </div>
        </div>

        <div className="dashboard-attention-grid">
          <article className="dashboard-attention-card">
            <div className="dashboard-list-header">
              <div>
                <h3>Recent unbilled Daytime entries</h3>
                <p>Completed work still waiting for an invoice.</p>
              </div>
              <Link className="link-pill" href="/revenue">
                Open Daytime
              </Link>
            </div>

            <div className="dashboard-list">
              {unbilledEntries.length > 0 ? (
                unbilledEntries.map((entry) => (
                  <Link className="dashboard-list-row" href={`/revenue/${entry.id}`} key={entry.id}>
                    <div>
                      <strong>{entry.groupName || entry.customerName}</strong>
                      <span>{entry.serviceName}</span>
                    </div>
                    <div className="dashboard-list-meta">
                      <strong>{formatAmount(entry.amountCents)}</strong>
                      <span>{formatShortDate(entry.serviceDate)}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="muted">No unbilled Daytime entries in this window.</p>
              )}
            </div>
          </article>

          <article className="dashboard-attention-card">
            <div className="dashboard-list-header">
              <div>
                <h3>Recent unpaid payables</h3>
                <p>Outstanding costs that still need to be paid.</p>
              </div>
              <Link className="link-pill" href="/payables">
                Open Payables
              </Link>
            </div>

            <div className="dashboard-list">
              {unpaidCosts.length > 0 ? (
                unpaidCosts.map((cost) => (
                  <div className="dashboard-list-row" key={cost.id}>
                    <div>
                      <strong>{cost.partyName}</strong>
                      <span>{cost.costName}</span>
                    </div>
                    <div className="dashboard-list-meta">
                      <strong>{formatAmount(cost.amountCents)}</strong>
                      <span>{formatShortDate(cost.costDate)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">No unpaid payables in this window.</p>
              )}
            </div>
          </article>

          <article className="dashboard-attention-card">
            <div className="dashboard-list-header">
              <div>
                <h3>Billing and payment issues</h3>
                <p>Recent failed or pending subscription and billing events.</p>
              </div>
              <Link className="link-pill" href="/billing">
                Open Billing
              </Link>
            </div>

            <div className="dashboard-list">
              {billingIssues.length > 0 ? (
                billingIssues.map((issue) => (
                  <div className="dashboard-list-row" key={issue.id}>
                    <div>
                      <strong>{issue.eventType.replaceAll("_", " ")}</strong>
                      <span>{issue.detailSummary}</span>
                    </div>
                    <div className="dashboard-list-meta">
                      <strong>{issue.status ?? "needs review"}</strong>
                      <span>{formatTimestamp(issue.createdAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">No failed or pending billing issues right now.</p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Business Overview</p>
          <h2 className="section-title">Profit leaders, draggers, and recent money movement</h2>
        </div>

        <div className="dashboard-overview-grid">
          {renderProfitTable("Top profitable customers", "Customer", highestProfitCustomers)}
          {renderProfitTable("Lowest profit customers", "Customer", lowestProfitCustomers)}
          {renderProfitTable("Top profitable groups", "Group", highestProfitGroups)}
          {renderProfitTable("Lowest profit groups", "Group", lowestProfitGroups)}

          <article className="surface section stack">
            <div className="stack stack-tight">
              <p className="eyebrow">Recent Invoices</p>
              <h3 className="section-title dashboard-section-heading">Latest invoices</h3>
            </div>

            <div className="profit-table-wrap">
              <table className="profit-table dashboard-compact-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer / Group</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length > 0 ? (
                    recentInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <Link href={invoice.href}>{invoice.invoiceNumber}</Link>
                        </td>
                        <td>{invoice.groupName || invoice.customerName}</td>
                        <td>{formatAmount(invoice.amountCents)}</td>
                        <td>
                          {invoice.status} / {invoice.paymentStatus}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No recent invoices in this window.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="surface section stack">
            <div className="stack stack-tight">
              <p className="eyebrow">Recent Payments</p>
              <h3 className="section-title dashboard-section-heading">Latest payments received</h3>
            </div>

            <div className="profit-table-wrap">
              <table className="profit-table dashboard-compact-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length > 0 ? (
                    recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatShortDate(payment.paymentDate)}</td>
                        <td>
                          <Link href={payment.href}>{payment.invoiceNumber}</Link>
                        </td>
                        <td>{payment.customerName}</td>
                        <td>{formatAmount(payment.amountCents)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No recent payments in this window.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
