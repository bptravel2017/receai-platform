import Link from "next/link";

import type { InvoicePaymentEventRecord } from "@/modules/invoices/types";

type InvoicePaymentHistoryProps = {
  events: InvoicePaymentEventRecord[];
  currency: string;
};

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function InvoicePaymentHistory({
  events,
  currency,
}: InvoicePaymentHistoryProps) {
  if (events.length === 0) {
    return (
      <div className="surface revenue-line-items-note">
        <p className="eyebrow">Payment history</p>
        <p className="muted">No payments recorded yet</p>
      </div>
    );
  }

  return (
    <div className="surface revenue-line-items-note stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Payment history</p>
        <p className="muted">
          Payment events stay separate from the invoice snapshot. Manual and bank-derived
          entries remain distinguishable, and reversed entries stay visible for audit.
        </p>
      </div>

      <div className="stack customer-list">
        {events.map((event) => (
          <article className="customer-card" key={event.id}>
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{formatAmount(event.amountCents, currency)}</strong>
                <span className="muted">
                  {event.source === "bank" ? "Bank reconciliation" : "Manual payment"}
                </span>
              </div>
              <div className="cost-link-row">
                <span className="role-badge">{event.source}</span>
                <span className="role-badge">{event.status}</span>
              </div>
            </div>

            <div className="revenue-card-meta">
              <p className="muted">
                <strong>Payment date:</strong> {formatDate(event.paymentDate)}
              </p>
              <p className="muted">
                <strong>Reference:</strong> {event.reference?.trim() || "No reference"}
              </p>
              <p className="muted">
                <strong>Recorded:</strong> {formatDate(event.createdAt)}
              </p>
              {event.status === "reversed" ? (
                <p className="muted">
                  <strong>Reversed:</strong> {formatDate(event.reversedAt)}
                </p>
              ) : null}
            </div>

            {event.note?.trim() ? (
              <p className="muted customer-notes-preview">{event.note}</p>
            ) : null}

            {event.bankTransactionId ? (
              <div>
                <Link className="link-pill" href={`/bank/transactions/${event.bankTransactionId}`}>
                  View bank transaction
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
