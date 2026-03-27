import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { GroupForm } from "@/modules/groups/components/group-form";
import { GroupStatusBanner } from "@/modules/groups/components/group-status-banner";
import {
  getGroupById,
  getGroupFormDefaults,
} from "@/modules/groups/groups";

type GroupDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: GroupDetailPageProps) {
  const [{ id }, context, query] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const result = await getGroupById(context, id);

  if (!result) {
    notFound();
  }

  const { group, customers, canManageGroups } = result;
  const status = query.error
    ? { kind: "error" as const, text: query.error }
    : query.message
      ? { kind: "message" as const, text: query.message }
      : null;

  return (
    <PageShell
      eyebrow="Groups"
      title={group.name}
      description="Group detail and editing view inside the current workspace."
    >
      <section className="grid customer-detail-grid">
        <article className="surface section stack">
          <div className="stack stack-tight">
            <Link className="link-pill" href="/groups">
              Back to groups
            </Link>
            <p className="eyebrow">Summary</p>
            <h2 className="section-title">{group.name}</h2>
            <p className="muted">
              {group.customerName ? `Customer: ${group.customerName}` : "No customer assigned"}
            </p>
          </div>

          <div className="stack customer-meta-list">
            <p className="muted">
              <strong>Status:</strong> {group.status}
            </p>
            <p className="muted">
              <strong>Created:</strong> {formatDate(group.createdAt)}
            </p>
            <p className="muted">
              <strong>Updated:</strong> {formatDate(group.updatedAt)}
            </p>
          </div>

          <div className="surface customer-notes-panel">
            <p className="eyebrow">Internal notes</p>
            <p className="muted">
              {group.notesInternal?.trim() || "No internal notes saved yet."}
            </p>
          </div>

          {!canManageGroups ? (
            <p className="status status-message">
              You can view this group, but only workspace owners and admins can edit it.
            </p>
          ) : null}
        </article>

        <div className="stack">
          <GroupStatusBanner status={status} />
          <GroupForm
            mode="edit"
            context={context}
            customers={customers}
            group={group}
            values={getGroupFormDefaults(group)}
          />
        </div>
      </section>
    </PageShell>
  );
}
