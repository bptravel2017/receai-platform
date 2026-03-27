import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { ProfitDetailView } from "@/modules/profit/components/profit-detail-view";
import {
  getProfitFiltersFromSearchParams,
  getProfitGroupDetail,
} from "@/modules/profit/profit";

type ProfitGroupDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    start?: string;
    end?: string;
    customerId?: string;
    groupId?: string;
    billingState?: string;
    paymentStatus?: string;
    sortBy?: string;
    sortDirection?: string;
  }>;
};

export default async function ProfitGroupDetailPage({
  params,
  searchParams,
}: ProfitGroupDetailPageProps) {
  const [{ id }, context, query] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const filters = getProfitFiltersFromSearchParams(query);
  const detail = await getProfitGroupDetail(context, id, filters);

  if (!detail) {
    notFound();
  }

  return (
    <PageShell
      eyebrow="Profit"
      title={detail.name}
      description="Group profit detail built from Daytime and costs."
    >
      <section className="surface section stack">
        <Link className="link-pill" href="/profit">
          Back to profit
        </Link>
      </section>

      <ProfitDetailView detail={detail} />
    </PageShell>
  );
}
