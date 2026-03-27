import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { UsageLimitNotice } from "@/modules/billing/components/usage-limit-notice";
import { checkUsageLimit } from "@/modules/billing/usage";
import { GroupList } from "@/modules/groups/components/group-list";
import { GroupStatusBanner } from "@/modules/groups/components/group-status-banner";
import { getGroupsList } from "@/modules/groups/groups";

type GroupsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const [data, usage] = await Promise.all([
    getGroupsList(context),
    checkUsageLimit(context.workspace.id, "group_created"),
  ]);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Groups"
      title="Groups"
      description="Manage real group entities for Daytime, costs, and invoicing."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Groups</p>
          <h2 className="section-title">Billing groups</h2>
          <p className="muted">
            Replace free-text group names with real workspace group records.
          </p>
        </div>

        {data.canManageGroups ? (
          <Link className="link-pill" href="/groups/new">
            Create group
          </Link>
        ) : null}
      </section>

      <GroupStatusBanner status={status} />
      {usage.plan === "free" && usage.limit !== null ? (
        <UsageLimitNotice
          used={usage.used}
          limit={usage.limit}
          label="groups"
          exceeded={!usage.allowed}
        />
      ) : null}
      <GroupList groups={data.groups} canManageGroups={data.canManageGroups} />
    </PageShell>
  );
}
