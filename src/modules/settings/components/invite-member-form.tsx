import { SubmitButton } from "@/components/auth/submit-button";
import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { inviteWorkspaceMemberAction } from "@/modules/settings/member-actions";

type InviteMemberFormProps = {
  context: AuthenticatedAppContext;
};

export function InviteMemberForm({ context }: InviteMemberFormProps) {
  const canManage =
    context.workspace.role === "owner" || context.workspace.role === "admin";

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Invite</p>
        <h2 className="section-title">Invite a collaborator</h2>
        <p className="muted">
          Create a shareable invite link for a teammate. Email delivery is not
          automated in this scaffold step.
        </p>
      </div>

      {!canManage ? (
        <p className="status status-error">
          Only workspace owners and admins can send invites.
        </p>
      ) : null}

      <form className="stack form-stack" action={inviteWorkspaceMemberAction}>
        <label className="field">
          <span>Collaborator email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="teammate@company.com"
            required
            disabled={!canManage}
          />
        </label>

        <label className="field">
          <span>Invite role</span>
          <select name="role" defaultValue="member" disabled={!canManage}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        {canManage ? (
          <SubmitButton
            idleLabel="Create invite"
            pendingLabel="Creating invite..."
          />
        ) : null}
      </form>
    </section>
  );
}
