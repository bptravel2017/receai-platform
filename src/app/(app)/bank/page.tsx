import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { getBankOverview } from "@/modules/bank/bank";
import { BankOverviewCards } from "@/modules/bank/components/bank-overview-cards";

export default async function BankPage() {
  const context = await requireAuthenticatedAppContext();
  const data = await getBankOverview(context);

  return (
    <PageShell
      eyebrow="Bank"
      title="Bank reconciliation"
      description="First-stage bank import and manual reconciliation, kept separate from invoice records."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Bank workflow</p>
          <h2 className="section-title">Imports and reconciliation</h2>
          <p className="muted">
            Keep imported bank data separate from invoices, then manually confirm matches
            before invoice payment tracking is updated.
          </p>
        </div>

        <div className="cost-link-row">
          <Link className="link-pill" href="/bank/imports">
            Import batches
          </Link>
          <Link className="link-pill" href="/bank/transactions">
            Transactions
          </Link>
        </div>
      </section>

      <BankOverviewCards {...data} />
    </PageShell>
  );
}
