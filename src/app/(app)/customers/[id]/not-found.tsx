import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";

export default function CustomerNotFound() {
  return (
    <PageShell
      eyebrow="Customers"
      title="Customer not found"
      description="The requested customer is missing from this workspace or you do not have access to it."
    >
      <section className="surface section stack">
        <p className="muted">
          Check the customer list and open a record that belongs to the current
          workspace.
        </p>
        <div>
          <Link className="link-pill" href="/customers">
            Back to customers
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
