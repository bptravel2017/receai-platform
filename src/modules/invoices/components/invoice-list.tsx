import Link from "next/link";

import type { InvoiceRecord } from "@/modules/invoices/types";

type InvoiceListProps = {
  invoices: InvoiceRecord[];
  canManageInvoices: boolean;
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

export function InvoiceList({
  invoices,
  canManageInvoices,
}: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Invoices</p>
          <h2 className="section-title">No invoices yet</h2>
        </div>

        {canManageInvoices ? (
          <div>
            <Link className="link-pill" href="/revenue/new">
              Create Invoice
            </Link>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Invoices</p>
        <h2 className="section-title">Invoices</h2>
      </div>

      <div className="stack invoice-list-grid">
        {invoices.map((invoice) => (
          <Link className="customer-card invoice-list-row" href={`/invoices/${invoice.id}`} key={invoice.id}>
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{invoice.customerName}</strong>
                <span className="muted">{invoice.groupName?.trim() || "Invoice"}</span>
              </div>
              <span className="role-badge">{invoice.status}</span>
            </div>

            <div className="invoice-list-meta">
              <p className="muted">
                <strong>Customer</strong>
                <br />
                {invoice.customerName}
              </p>
              <p className="muted">
                <strong>Amount</strong>
                <br />
                {formatAmount(invoice.amountCents, invoice.currency)}
              </p>
              <p className="muted">
                <strong>Date</strong>
                <br />
                {formatDate(invoice.invoiceDate)}
              </p>
              <p className="muted">
                <strong>Status</strong>
                <br />
                {invoice.status}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
