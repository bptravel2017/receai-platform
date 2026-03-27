import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { PayablesList } from "@/modules/costs/components/payables-list";
import { getPayablesOverview } from "@/modules/costs/costs";
import { canAccessFeature } from "@/modules/plans/access";

type PayablesPageProps = {
  searchParams: Promise<{
    view?: string;
    partyType?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function PayablesPage({ searchParams }: PayablesPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const unpaidOnly = params.view !== "all";
  const partyType =
    params.partyType === "driver" ||
    params.partyType === "vendor" ||
    params.partyType === "guide"
      ? params.partyType
      : undefined;
  const dateFrom = params.dateFrom?.trim() || undefined;
  const dateTo = params.dateTo?.trim() || undefined;
  const buckets = await getPayablesOverview(context, {
    unpaidOnly,
    partyType,
    dateFrom,
    dateTo,
  });
  const canBulkPay = canAccessFeature(context.workspace.plan, "payables_bulk");

  return (
    <PageShell
      eyebrow="Payables"
      title="Payables"
      description="See who to pay, how much is still unpaid, and mark payout costs done."
    >
      <section className="surface section stack">
        <div className="cost-link-row">
          <Link className="link-pill" href="/costs">
            All Costs
          </Link>
          <Link className="link-pill" href="/costs/new">
            Create cost
          </Link>
        </div>

        <form className="stack form-stack" method="get">
          <div className="grid grid-2">
            <label className="field">
              <span>View</span>
              <select name="view" defaultValue={unpaidOnly ? "unpaid" : "all"}>
                <option value="unpaid">Unpaid only</option>
                <option value="all">All costs</option>
              </select>
            </label>

            <label className="field">
              <span>Party type</span>
              <select name="partyType" defaultValue={partyType ?? ""}>
                <option value="">All</option>
                <option value="driver">Driver</option>
                <option value="vendor">Vendor</option>
                <option value="guide">Guide</option>
              </select>
            </label>
          </div>

          <div className="grid grid-2">
            <label className="field">
              <span>Date from</span>
              <input name="dateFrom" type="date" defaultValue={dateFrom} />
            </label>

            <label className="field">
              <span>Date to</span>
              <input name="dateTo" type="date" defaultValue={dateTo} />
            </label>
          </div>

          <div className="cost-link-row">
            <button className="button-secondary" type="submit">
              Apply filters
            </button>
            <Link className="link-pill" href="/payables">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <PayablesList buckets={buckets} canBulkPay={canBulkPay} />
    </PageShell>
  );
}
