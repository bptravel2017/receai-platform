import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";

export default function CostNotFound() {
  return (
    <PageShell
      eyebrow="Costs"
      title="Cost not found"
      description="The requested cost is missing from this workspace or you do not have access to it."
    >
      <section className="surface section stack">
        <p className="muted">
          Return to the costs list and open a record that belongs to the current
          workspace.
        </p>
        <div>
          <Link className="link-pill" href="/costs">
            Back to costs
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
