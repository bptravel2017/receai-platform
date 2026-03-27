import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { getBankTransactionsList } from "@/modules/bank/bank";
import { BankStatusBanner } from "@/modules/bank/components/bank-status-banner";
import { BankTransactionList } from "@/modules/bank/components/bank-transaction-list";

type BankTransactionsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function BankTransactionsPage({
  searchParams,
}: BankTransactionsPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const data = await getBankTransactionsList(context);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Bank"
      title="Bank transactions"
      description="Imported bank transactions queued for explicit manual reconciliation."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Transaction queue</p>
          <h2 className="section-title">Bank transactions</h2>
          <p className="muted">
            Imported bank rows remain separate from invoices until someone opens a
            transaction and confirms the reconciliation target.
          </p>
        </div>

        <div className="cost-link-row">
          <Link className="link-pill" href="/bank">
            Back to bank
          </Link>
          <Link className="link-pill" href="/bank/imports">
            Import batches
          </Link>
        </div>
      </section>

      <BankStatusBanner status={status} />
      <BankTransactionList transactions={data.transactions} />
    </PageShell>
  );
}
