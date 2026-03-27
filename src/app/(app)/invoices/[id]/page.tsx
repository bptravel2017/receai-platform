import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { InvoiceDeliveryHistory } from "@/modules/invoices/components/invoice-delivery-history";
import { InvoiceForm } from "@/modules/invoices/components/invoice-form";
import { InvoicePaymentHistory } from "@/modules/invoices/components/invoice-payment-history";
import { InvoiceStatusBanner } from "@/modules/invoices/components/invoice-status-banner";
import {
  getInvoiceById,
  getInvoiceDeliveryFormDefaults,
  getInvoiceDeliveryFollowUpFormDefaults,
  getInvoiceFormDefaults,
  getInvoicePaymentFormDefaults,
} from "@/modules/invoices/invoices";

type InvoiceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
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

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: InvoiceDetailPageProps) {
  const [{ id }, context, query] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const result = await getInvoiceById(context, id);

  if (!result) {
    notFound();
  }

  const { invoice, paymentEvents, deliveryEvents } = result;
  const status = query.error
    ? { kind: "error" as const, text: query.error }
    : query.message
      ? { kind: "message" as const, text: query.message }
      : null;
  const createdDraftAction =
    status?.kind === "message" && status.text === "Invoice draft created."
      ? {
          href: "#invoice-next-actions",
          label: "Review next actions",
        }
      : null;

  return (
    <PageShell
      eyebrow="Invoices"
      title={invoice.groupName?.trim() || invoice.customerName}
      description="Manage the invoice in one place."
    >
      <section className="surface section stack">
        <div className="cost-link-row">
          <Link className="link-pill" href="/invoices">
            Back to invoices
          </Link>
          <Link className="link-pill" href={`/customers/${invoice.customerId}`}>
            Customer
          </Link>
        </div>

        <div className="invoice-overview-strip">
          <p className="muted">
            <strong>Date:</strong> {formatDate(invoice.invoiceDate)}
          </p>
          <p className="muted">
            <strong>Due:</strong> {formatDate(invoice.dueDate)}
          </p>
          <p className="muted">
            <strong>Amount:</strong> {formatAmount(invoice.amountCents, invoice.currency)}
          </p>
          <p className="muted">
            <strong>Status:</strong> {invoice.status}
          </p>
        </div>
      </section>

      <InvoiceStatusBanner
        status={status}
        actionHref={createdDraftAction?.href}
        actionLabel={createdDraftAction?.label}
      />
      <InvoiceForm
        context={context}
        invoice={invoice}
        values={getInvoiceFormDefaults(invoice)}
        deliveryValues={getInvoiceDeliveryFormDefaults(invoice)}
        followUpValues={getInvoiceDeliveryFollowUpFormDefaults(invoice)}
        paymentValues={getInvoicePaymentFormDefaults()}
        deliveryEvents={deliveryEvents}
        paymentEvents={paymentEvents}
      />
      <InvoicePaymentHistory events={paymentEvents} currency={invoice.currency} />
      <InvoiceDeliveryHistory events={deliveryEvents} />
    </PageShell>
  );
}
