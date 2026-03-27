import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { CostForm } from "@/modules/costs/components/cost-form";
import { CostStatusBanner } from "@/modules/costs/components/cost-status-banner";
import { getCostsEditorData, getCostFormDefaults } from "@/modules/costs/costs";

type NewCostPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    revenueId?: string;
    customerId?: string;
    groupId?: string;
  }>;
};

export default async function NewCostPage({
  searchParams,
}: NewCostPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const editorData = await getCostsEditorData(context);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Costs"
      title="Create cost"
      description="Add an internal cost linked to Daytime, customer, group, or overhead."
    >
      <section className="surface section stack">
        <div className="cost-link-row">
          <Link className="link-pill" href="/costs">
            Back to costs
          </Link>
          <Link className="link-pill" href="/payables">
            Payables
          </Link>
        </div>
      </section>

      <CostStatusBanner status={status} />
      <CostForm
        mode="create"
        context={context}
        editorData={editorData}
        values={{
          ...getCostFormDefaults(),
          revenueId: params.revenueId ?? "",
          customerId: params.customerId ?? "",
          groupId: params.groupId ?? "",
          costType: params.revenueId
            ? "revenue"
            : params.customerId
              ? "customer"
              : params.groupId
                ? "group"
                : "overhead",
        }}
      />
    </PageShell>
  );
}
