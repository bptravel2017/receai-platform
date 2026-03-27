import Link from "next/link";

import type { CostRecord } from "@/modules/costs/types";

type CostListProps = {
  costs: CostRecord[];
  canManageCosts: boolean;
};

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function summarizeLinks(cost: CostRecord) {
  return [
    cost.revenueSummary ? `Daytime: ${cost.revenueSummary}` : null,
    cost.customerName ? `Customer: ${cost.customerName}` : null,
    cost.groupName ? `Group: ${cost.groupName}` : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

export function CostList({ costs, canManageCosts }: CostListProps) {
  if (costs.length === 0) {
    return (
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Costs</p>
          <h2 className="section-title">No costs yet</h2>
          <p className="muted">
            Start with internal operational costs linked to Daytime, customers, groups,
            or overhead.
          </p>
        </div>

        {canManageCosts ? (
          <div className="cost-link-row">
            <Link className="link-pill" href="/costs/new">
              Create cost
            </Link>
            <Link className="link-pill" href="/costs/payables">
              Payables
            </Link>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Costs</p>
        <h2 className="section-title">All costs</h2>
        <p className="muted">Internal costs stay separate from invoices.</p>
      </div>

      <div className="stack customer-list">
        {costs.map((cost) => (
          <Link className="customer-card" href={`/costs/${cost.id}`} key={cost.id}>
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{cost.costName}</strong>
                <span className="muted">{cost.description || "No description"}</span>
              </div>
              <span className="role-badge">{cost.paymentStatus}</span>
            </div>

            <div className="revenue-card-meta">
              <p className="muted">
                <strong>Amount:</strong> {formatAmount(cost.amountCents, cost.currency)}
              </p>
              <p className="muted">
                <strong>Date:</strong> {cost.costDate}
              </p>
              <p className="muted">
                <strong>Type:</strong> {cost.costType}
              </p>
            </div>

            <p className="muted customer-notes-preview">{summarizeLinks(cost)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
