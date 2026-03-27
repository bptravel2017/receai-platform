import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";

export default function RevenueNotFound() {
  return (
    <PageShell
      eyebrow="Revenue"
      title="Revenue draft not found"
      description="The requested revenue record is missing from this workspace or you do not have access to it."
    >
      <section className="surface section stack">
        <p className="muted">
          Return to the revenue list and open a draft that belongs to the current
          workspace.
        </p>
        <div>
          <Link className="link-pill" href="/revenue">
            Back to revenue
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
