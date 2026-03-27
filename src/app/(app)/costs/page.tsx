import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { CostList } from "@/modules/costs/components/cost-list";
import { CostStatusBanner } from "@/modules/costs/components/cost-status-banner";
import { getCostsList } from "@/modules/costs/costs";

type CostsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function CostsPage({ searchParams }: CostsPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const data = await getCostsList(context);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Costs"
      title="Costs"
      description="Internal cost tracking for Daytime, customer, group, and overhead."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Internal costs</p>
          <h2 className="section-title">Costs</h2>
          <p className="muted">
            Costs stay separate from invoices while supporting Daytime linkage,
            customer/group allocations, and overhead.
          </p>
        </div>

        {data.canManageCosts ? (
          <div className="cost-link-row">
            <Link className="link-pill" href="/costs/new">
              Create cost
            </Link>
            <Link className="link-pill" href="/payables">
              Payables
            </Link>
          </div>
        ) : null}
      </section>

      <CostStatusBanner status={status} />
      <CostList costs={data.costs} canManageCosts={data.canManageCosts} />
    </PageShell>
  );
}
