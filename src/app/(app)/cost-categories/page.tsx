import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { CostCategoriesList } from "@/modules/costs/components/cost-categories-list";
import { CostCategoryCreateForm } from "@/modules/costs/components/cost-category-create-form";
import { CostStatusBanner } from "@/modules/costs/components/cost-status-banner";
import { getCostCategories } from "@/modules/costs/costs";

type CostCategoriesPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function CostCategoriesPage({
  searchParams,
}: CostCategoriesPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const categories = await getCostCategories(context);
  const canManageCosts =
    context.workspace.role === "owner" || context.workspace.role === "admin";
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Costs"
      title="Cost categories"
      description="Editable company cost categories used by formal company-scoped costs."
    >
      <section className="surface section stack">
        <div className="cost-link-row">
          <Link className="link-pill" href="/costs">
            Back to costs
          </Link>
          <Link className="link-pill" href="/costs/receipts">
            Receipt intake
          </Link>
          <Link className="link-pill" href="/costs/new">
            Create cost
          </Link>
        </div>
      </section>

      <CostStatusBanner status={status} />
      <CostCategoryCreateForm disabled={!canManageCosts} />
      <CostCategoriesList
        categories={categories}
        canManageCosts={canManageCosts}
      />
    </PageShell>
  );
}
