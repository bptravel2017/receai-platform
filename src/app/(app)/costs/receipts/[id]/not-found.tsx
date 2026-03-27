import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";

export default function CostReceiptNotFound() {
  return (
    <PageShell
      eyebrow="Costs"
      title="Receipt not found"
      description="The requested receipt intake record is missing from this workspace or you do not have access to it."
    >
      <section className="surface section stack">
        <p className="muted">
          Return to receipt intake and open a record that belongs to the current
          workspace.
        </p>
        <Link className="link-pill" href="/costs/receipts">
          Back to receipts
        </Link>
      </section>
    </PageShell>
  );
}
