import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { UsageLimitNotice } from "@/modules/billing/components/usage-limit-notice";
import { checkUsageLimit } from "@/modules/billing/usage";
import { RevenueList } from "@/modules/revenue/components/revenue-list";
import { RevenueStatusBanner } from "@/modules/revenue/components/revenue-status-banner";
import { getRevenueList } from "@/modules/revenue/revenue";

type RevenuePageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function RevenuePage({
  searchParams,
}: RevenuePageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const [data, usage] = await Promise.all([
    getRevenueList(context),
    checkUsageLimit(context.workspace.id, "daytime_created"),
  ]);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Daytime"
      title="Daytime"
      description="Primary business-entry flow for customer-linked daytime work."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Daytime</p>
          <h2 className="section-title">Capture daytime business entries</h2>
        </div>

        {data.canManageRevenue ? (
          <Link
            className="link-pill"
            href={data.customers.length > 0 ? "/revenue/new" : "/customers/new"}
          >
            {data.customers.length > 0 ? "New Daytime entry" : "Create customer first"}
          </Link>
        ) : null}
      </section>

      <RevenueStatusBanner status={status} />
      {usage.plan === "free" && usage.limit !== null ? (
        <UsageLimitNotice
          used={usage.used}
          limit={usage.limit}
          label="entries this month"
          exceeded={!usage.allowed}
        />
      ) : null}
      <RevenueList
        revenue={data.revenue}
        canManageRevenue={data.canManageRevenue}
        hasCustomers={data.customers.length > 0}
      />
    </PageShell>
  );
}
