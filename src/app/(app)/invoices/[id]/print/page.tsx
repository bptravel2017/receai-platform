import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { InvoicePrintActions } from "@/modules/invoices/components/invoice-print-actions";
import { getInvoicePrintView } from "@/modules/invoices/rendering";
import { canAccessFeature } from "@/modules/plans/access";

type InvoicePrintPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

function formatAmount(amountCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export default async function InvoicePrintPage({
  params,
}: InvoicePrintPageProps) {
  const [{ id }, context] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
  ]);
  const canUseInvoiceFeatures = canAccessFeature(context.workspace.plan, "invoice");

  if (!canUseInvoiceFeatures) {
    return (
      <div className="page stack invoice-render-page">
        <section className="surface page-header print-hide">
          <p className="eyebrow">Invoices</p>
          <h1 className="page-title">Upgrade required</h1>
          <p className="page-subtitle">
            PDF generation and print-ready invoice exports are premium features.
          </p>
        </section>

        <section className="surface section stack print-hide">
          <div className="cost-link-row">
            <Link className="link-pill" href={`/invoices/${id}`}>
              Back to invoice
            </Link>
            <Link className="link-pill" href="/pricing">
              Upgrade plans
            </Link>
            <Link className="link-pill" href="/billing">
              Billing
            </Link>
          </div>
        </section>
      </div>
    );
  }

  let view;

  try {
    view = await getInvoicePrintView(context, id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice export unavailable.";

    return (
      <div className="page stack invoice-render-page">
        <section className="surface page-header print-hide">
          <p className="eyebrow">Invoices</p>
          <h1 className="page-title">Export unavailable</h1>
          <p className="page-subtitle">{message}</p>
        </section>

        <section className="surface section stack print-hide">
          <div className="cost-link-row">
            <Link className="link-pill" href={`/invoices/${id}`}>
              Back to invoice
            </Link>
            <Link className="link-pill" href="/invoices">
              All invoices
            </Link>
          </div>
          <p className="muted">
            Finalize the invoice before using the customer-facing export-ready render.
          </p>
        </section>
      </div>
    );
  }

  if (!view) {
    notFound();
  }

  const { invoice, issuer, customer, subtotalCents, totalCents, totalLineItems } = view;

  return (
    <div className="page stack invoice-render-page">
      <section className="surface page-header print-hide">
        <p className="eyebrow">Invoices</p>
        <h1 className="page-title">Finalized invoice render</h1>
        <p className="page-subtitle">
          Customer-facing print/export view built from finalized invoice data only.
        </p>
      </section>

      <section className="surface section stack print-hide">
        <div className="cost-link-row">
          <Link className="link-pill" href={`/invoices/${invoice.id}`}>
            Back to invoice
          </Link>
          <Link className="link-pill" href="/invoices">
            All invoices
          </Link>
        </div>
        <InvoicePrintActions />
      </section>

      <article className="surface invoice-print-sheet">
        <header className="invoice-print-header">
          <div className="stack stack-tight">
            <p className="eyebrow">Invoice</p>
            <h2 className="invoice-print-title">{issuer.workspaceName}</h2>
            <p className="muted">Workspace ID: {issuer.workspaceSlug}</p>
          </div>

          <div className="invoice-print-chip-group">
            <div className="invoice-print-chip">
              <span className="muted">Invoice number</span>
              <strong>{invoice.invoiceNumber}</strong>
            </div>
            <div className="invoice-print-chip">
              <span className="muted">Invoice date</span>
              <strong>{formatDate(invoice.invoiceDate)}</strong>
            </div>
            <div className="invoice-print-chip">
              <span className="muted">Due date</span>
              <strong>{formatDate(invoice.dueDate)}</strong>
            </div>
          </div>
        </header>

        <section className="invoice-print-addresses">
          <div className="invoice-print-panel">
            <p className="eyebrow">From</p>
            <div className="stack stack-tight">
              <strong>{issuer.workspaceName}</strong>
              <span className="muted">{issuer.workspaceSlug}</span>
            </div>
          </div>

          <div className="invoice-print-panel">
            <p className="eyebrow">Bill to</p>
            <div className="stack stack-tight">
              <strong>{customer.name}</strong>
              {customer.company?.trim() ? <span>{customer.company}</span> : null}
              {customer.email?.trim() ? <span>{customer.email}</span> : null}
              {customer.phone?.trim() ? <span>{customer.phone}</span> : null}
            </div>
          </div>
        </section>

        {invoice.groupName?.trim() ? (
          <section className="invoice-print-panel">
            <p className="eyebrow">Group</p>
            <p className="invoice-print-group-name">{invoice.groupName}</p>
          </section>
        ) : null}

        <section className="invoice-print-panel">
          <div className="stack stack-tight">
            <p className="eyebrow">Line items</p>
            <p className="muted">
              {totalLineItems} finalized item{totalLineItems === 1 ? "" : "s"} captured in
              the invoice snapshot.
            </p>
          </div>

          <div className="invoice-print-line-items">
            {invoice.lineItems.map((item, index) => (
              <article className="invoice-print-line-item" key={item.id}>
                <div className="invoice-print-line-item-head">
                  <div className="stack stack-tight">
                    <strong>
                      {index + 1}. {item.title}
                    </strong>
                    {item.description?.trim() ? (
                      <span className="muted">{item.description}</span>
                    ) : null}
                  </div>
                  <strong>{formatAmount(item.amountCents, invoice.currency)}</strong>
                </div>

                <div className="invoice-print-line-item-meta">
                  <span>Qty {item.quantity}</span>
                  <span>{formatAmount(item.unitPriceCents, invoice.currency)} each</span>
                  <span>Service date: {formatDate(item.serviceDate)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="invoice-print-footer-grid">
          <div className="invoice-print-panel">
            <p className="eyebrow">Notes</p>
            <p className="invoice-print-notes">
              {invoice.notes?.trim() || "No additional notes."}
            </p>
          </div>

          <div className="invoice-print-total-card">
            <div className="invoice-print-total-row">
              <span>Subtotal</span>
              <strong>{formatAmount(subtotalCents, invoice.currency)}</strong>
            </div>
            <div className="invoice-print-total-row invoice-print-total-row-final">
              <span>Total due</span>
              <strong>{formatAmount(totalCents, invoice.currency)}</strong>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
