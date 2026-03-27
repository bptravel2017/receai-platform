import Link from "next/link";

import type { GroupRecord } from "@/modules/groups/types";

type GroupListProps = {
  groups: GroupRecord[];
  canManageGroups: boolean;
};

export function GroupList({ groups, canManageGroups }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Groups</p>
          <h2 className="section-title">No groups yet</h2>
          <p className="muted">
            Create real groups so Daytime, costs, and invoice validation stop relying
            on free-text names.
          </p>
        </div>

        {canManageGroups ? (
          <div>
            <Link className="link-pill" href="/groups/new">
              Create group
            </Link>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Groups</p>
        <h2 className="section-title">Workspace groups</h2>
        <p className="muted">
          Groups are first-class billing entities with stable IDs.
        </p>
      </div>

      <div className="stack customer-list">
        {groups.map((group) => (
          <Link className="customer-card" href={`/groups/${group.id}`} key={group.id}>
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{group.name}</strong>
                <span className="muted">
                  {group.customerName ? `Customer: ${group.customerName}` : "No customer assigned"}
                </span>
              </div>
              <span className="role-badge">{group.status}</span>
            </div>

            {group.notesInternal?.trim() ? (
              <p className="muted customer-notes-preview">{group.notesInternal}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
