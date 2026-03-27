import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { UsageLimitNotice } from "@/modules/billing/components/usage-limit-notice";
import { checkUsageLimit } from "@/modules/billing/usage";
import { GroupForm } from "@/modules/groups/components/group-form";
import { GroupStatusBanner } from "@/modules/groups/components/group-status-banner";
import {
  getGroupFormDefaults,
  getGroupsEditorData,
} from "@/modules/groups/groups";

type NewGroupPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function NewGroupPage({ searchParams }: NewGroupPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const [editorData, usage] = await Promise.all([
    getGroupsEditorData(context),
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
      title="Create group"
      description="Add a real group record with an optional customer assignment."
    >
      <section className="surface section stack">
        <Link className="link-pill" href="/groups">
          Back to groups
        </Link>
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
      <GroupForm
        mode="create"
        context={context}
        customers={editorData.customers}
        values={getGroupFormDefaults()}
      />
    </PageShell>
  );
}
