import { removeWorkspaceMemberAction, updateWorkspaceMemberRoleAction } from "@/modules/settings/member-actions";
import type { WorkspaceMemberSummary } from "@/modules/settings/members";
import { RoleBadge } from "@/modules/settings/components/role-badge";

type WorkspaceMembersListProps = {
  members: WorkspaceMemberSummary[];
  currentUserRole: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function WorkspaceMembersList({
  members,
  currentUserRole,
}: WorkspaceMembersListProps) {
  const isOwner = currentUserRole === "owner";

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Members</p>
        <h2 className="section-title">Current workspace members</h2>
        <p className="muted">
          Roles are taken directly from the current `workspace_memberships`
          foundation.
        </p>
      </div>

      {members.length === 0 ? (
        <p className="status status-message">
          No members are attached to this workspace yet.
        </p>
      ) : (
        <div className="stack member-list">
          {members.map((member) => {
            const canManageMember =
              isOwner && member.role !== "owner" && !member.isCurrentUser;

            return (
              <article className="member-card" key={member.id}>
                <div className="stack stack-tight">
                  <div className="member-card-header">
                    <div className="stack stack-tight">
                      <strong>
                        {member.fullName?.trim() || member.email}
                        {member.isCurrentUser ? " (You)" : ""}
                      </strong>
                      <span className="muted">{member.email}</span>
                    </div>
                    <RoleBadge role={member.role} />
                  </div>

                  <p className="muted member-meta">
                    Joined {formatDate(member.joinedAt)}
                  </p>
                </div>

                {canManageMember ? (
                  <div className="member-actions-grid">
                    <form className="stack form-stack" action={updateWorkspaceMemberRoleAction}>
                      <input type="hidden" name="memberUserId" value={member.userId} />
                      <label className="field">
                        <span>Role</span>
                        <select name="role" defaultValue={member.role}>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <button className="button-secondary" type="submit">
                        Update role
                      </button>
                    </form>

                    <form className="stack form-stack" action={removeWorkspaceMemberAction}>
                      <input type="hidden" name="memberUserId" value={member.userId} />
                      <p className="muted">
                        Remove access if this person should no longer work in the
                        workspace.
                      </p>
                      <button className="button-secondary" type="submit">
                        Remove member
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
