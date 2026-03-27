import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";

export default function BankTransactionNotFound() {
  return (
    <PageShell
      eyebrow="Bank"
      title="Bank transaction not found"
      description="The requested bank transaction is missing from this workspace or you do not have access to it."
    >
      <section className="surface section stack">
        <p className="muted">
          Return to the bank transaction queue and open a record that belongs to the
          current workspace.
        </p>
        <Link className="link-pill" href="/bank/transactions">
          Back to transactions
        </Link>
      </section>
    </PageShell>
  );
}
