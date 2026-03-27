import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import {
  getBankTransactionById,
  getBankTransactionReconciliationFormDefaults,
} from "@/modules/bank/bank";
import { BankStatusBanner } from "@/modules/bank/components/bank-status-banner";
import { BankTransactionReconciliationForm } from "@/modules/bank/components/bank-transaction-reconciliation-form";

type BankTransactionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
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

export default async function BankTransactionDetailPage({
  params,
  searchParams,
}: BankTransactionDetailPageProps) {
  const [{ id }, context, query] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const result = await getBankTransactionById(context, id);

  if (!result) {
    notFound();
  }

  const { transaction, invoiceChoices, canManageBank } = result;
  const status = query.error
    ? { kind: "error" as const, text: query.error }
    : query.message
      ? { kind: "message" as const, text: query.message }
      : null;

  return (
    <PageShell
      eyebrow="Bank"
      title={transaction.description}
      description="Manual bank-to-invoice reconciliation detail inside the current workspace."
    >
      <section className="grid customer-detail-grid">
        <article className="surface section stack">
          <div className="stack stack-tight">
            <div className="cost-link-row">
              <Link className="link-pill" href="/bank/transactions">
                Back to transactions
              </Link>
              <Link className="link-pill" href="/bank/imports">
                Import batches
              </Link>
            </div>
            <p className="eyebrow">Transaction summary</p>
            <h2 className="section-title">{transaction.description}</h2>
            <p className="muted">Imported from {transaction.importSourceName}</p>
          </div>

          <div className="stack customer-meta-list">
            <p className="muted">
              <strong>Transaction date:</strong> {formatDate(transaction.transactionDate)}
            </p>
            <p className="muted">
              <strong>Amount:</strong>{" "}
              {formatAmount(transaction.amountCents, transaction.currency)}
            </p>
            <p className="muted">
              <strong>Reference:</strong>{" "}
              {transaction.reference?.trim() || "No reference"}
            </p>
            <p className="muted">
              <strong>Reconciliation:</strong> {transaction.reconciliationStatus}
            </p>
            <p className="muted">
              <strong>Linked invoice:</strong>{" "}
              {transaction.linkedInvoiceNumber || "No invoice matched"}
            </p>
            <p className="muted">
              <strong>Invoice payment state:</strong>{" "}
              {transaction.linkedInvoicePaymentStatus || "No linked invoice"}
            </p>
            <p className="muted">
              <strong>Payment event link:</strong>{" "}
              {transaction.paymentEventId ? "Active bank payment event" : "No payment event"}
            </p>
            <p className="muted">
              <strong>Reconciled at:</strong> {formatDate(transaction.reconciledAt)}
            </p>
          </div>

          <div className="surface revenue-line-items-note">
            <p className="eyebrow">First-stage reconciliation</p>
            <p className="muted">
              Bank transactions remain their own records. Matching creates or refreshes a
              bank-sourced payment event on the invoice, and unreconcile reverses that
              event before the invoice snapshot is recalculated.
            </p>
          </div>

          {!canManageBank ? (
            <p className="status status-message">
              You can view this bank transaction, but only workspace owners and admins
              can reconcile it.
            </p>
          ) : null}
        </article>

        <div className="stack">
          <BankStatusBanner status={status} />
          <BankTransactionReconciliationForm
            canManageBank={canManageBank}
            transaction={transaction}
            invoiceChoices={invoiceChoices}
            values={getBankTransactionReconciliationFormDefaults(transaction)}
          />
        </div>
      </section>
    </PageShell>
  );
}
