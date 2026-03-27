import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";

export default function InvoiceNotFound() {
  return (
    <PageShell
      eyebrow="Invoices"
      title="Invoice not found"
      description="The requested invoice is missing from this workspace or you do not have access to it."
    >
      <section className="surface section stack">
        <p className="muted">
          Return to the invoice list and open a record that belongs to the current
          workspace.
        </p>
        <div>
          <Link className="link-pill" href="/invoices">
            Back to invoices
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
