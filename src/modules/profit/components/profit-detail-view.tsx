import Link from "next/link";

import type { ProfitEntityDetail } from "@/modules/profit/types";

type ProfitDetailViewProps = {
  detail: ProfitEntityDetail;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

export function ProfitDetailView({ detail }: ProfitDetailViewProps) {
  return (
    <section className="grid grid-2 profit-breakdown-grid">
      <article className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">{detail.kind === "customer" ? "Customer" : "Group"}</p>
          <h2 className="section-title">{detail.name}</h2>
          <p className="muted">
            {detail.customerName && detail.kind === "group"
              ? `Customer: ${detail.customerName}`
              : "Detailed revenue and cost view"}
          </p>
        </div>

        <div className="stack customer-meta-list">
          <p className="muted">
            <strong>Revenue:</strong> {formatAmount(detail.summary.totalRevenueCents)}
          </p>
          <p className="muted">
            <strong>Cost:</strong> {formatAmount(detail.summary.totalCostCents)}
          </p>
          <p className="muted">
            <strong>Profit:</strong> {formatAmount(detail.summary.totalProfitCents)}
          </p>
          <p className="muted">
            <strong>Unbilled revenue:</strong>{" "}
            {formatAmount(detail.summary.unbilledRevenueCents)}
          </p>
          <p className="muted">
            <strong>Unpaid cost:</strong> {formatAmount(detail.summary.unpaidCostCents)}
          </p>
        </div>
      </article>

      <article className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Daytime</p>
          <h2 className="section-title">Related entries</h2>
        </div>

        <div className="profit-table-wrap">
          <table className="profit-table">
            <thead>
              <tr>
                <th>Service date</th>
                <th>Entry</th>
                <th>Billing</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {detail.revenue.length > 0 ? (
                detail.revenue.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.serviceDate}</td>
                    <td>
                      <Link href={`/revenue/${entry.id}`}>{entry.label}</Link>
                    </td>
                    <td>{entry.billingState}</td>
                    <td>{formatAmount(entry.amountCents)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No Daytime entries match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Costs</p>
          <h2 className="section-title">Related costs</h2>
        </div>

        <div className="profit-table-wrap">
          <table className="profit-table">
            <thead>
              <tr>
                <th>Cost date</th>
                <th>Cost</th>
                <th>Daytime</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {detail.costs.length > 0 ? (
                detail.costs.map((cost) => (
                  <tr key={cost.id}>
                    <td>{cost.costDate}</td>
                    <td>
                      <Link href={`/costs/${cost.id}`}>{cost.costName}</Link>
                    </td>
                    <td>{cost.revenueLabel || "No linked Daytime"}</td>
                    <td>{cost.paymentStatus}</td>
                    <td>{formatAmount(cost.amountCents)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No costs match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
