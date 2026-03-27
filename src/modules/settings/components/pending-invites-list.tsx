import { revokeWorkspaceInviteAction } from "@/modules/settings/member-actions";
import type { WorkspaceInviteSummary } from "@/modules/settings/members";
import { RoleBadge } from "@/modules/settings/components/role-badge";

type PendingInvitesListProps = {
  invites: WorkspaceInviteSummary[];
  currentUserRole: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function PendingInvitesList({
  invites,
  currentUserRole,
}: PendingInvitesListProps) {
  const canManage =
    currentUserRole === "owner" || currentUserRole === "admin";
  const pendingInvites = invites.filter((invite) => invite.status === "pending");

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Invites</p>
        <h2 className="section-title">Pending invites</h2>
        <p className="muted">
          Share the invite link manually in this first version. Pending invites expire
          automatically after 14 days.
        </p>
      </div>

      {pendingInvites.length === 0 ? (
        <p className="status status-message">
          No pending invites yet. Invite a collaborator when the workspace is ready.
        </p>
      ) : (
        <div className="stack member-list">
          {pendingInvites.map((invite) => (
            <article className="member-card" key={invite.id}>
              <div className="member-card-header">
                <div className="stack stack-tight">
                  <strong>{invite.invitedEmail}</strong>
                  <span className="muted">
                    Invited by {invite.invitedByLabel} on {formatDate(invite.createdAt)}
                  </span>
                </div>
                <RoleBadge role={invite.role} />
              </div>

              <p className="muted member-meta">
                Expires {formatDate(invite.expiresAt)}
              </p>

              <label className="field">
                <span>Invite link</span>
                <input type="text" value={invite.acceptUrl} readOnly disabled />
              </label>

              {canManage ? (
                <form action={revokeWorkspaceInviteAction}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button className="button-secondary" type="submit">
                    Revoke invite
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
