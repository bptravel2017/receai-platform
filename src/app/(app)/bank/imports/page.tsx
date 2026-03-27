import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { getBankImportFormDefaults, getBankImportsList } from "@/modules/bank/bank";
import { BankImportForm } from "@/modules/bank/components/bank-import-form";
import { BankImportList } from "@/modules/bank/components/bank-import-list";
import { BankStatusBanner } from "@/modules/bank/components/bank-status-banner";

type BankImportsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function BankImportsPage({
  searchParams,
}: BankImportsPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const data = await getBankImportsList(context);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Bank"
      title="Bank imports"
      description="CSV and manual import batches for bank transactions, kept separate from invoice records."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Import batches</p>
          <h2 className="section-title">Bank statement imports</h2>
          <p className="muted">
            Import CSV rows into bank transactions first, then review and reconcile them
            separately in the transaction queue.
          </p>
        </div>

        <div className="cost-link-row">
          <Link className="link-pill" href="/bank">
            Back to bank
          </Link>
          <Link className="link-pill" href="/bank/transactions">
            Transactions
          </Link>
        </div>
      </section>

      <BankStatusBanner status={status} />

      <section className="grid members-layout-grid">
        <BankImportList imports={data.imports} />
        <BankImportForm
          canManageBank={data.canManageBank}
          values={getBankImportFormDefaults()}
        />
      </section>
    </PageShell>
  );
}
