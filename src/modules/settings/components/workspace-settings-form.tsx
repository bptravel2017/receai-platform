import { SubmitButton } from "@/components/auth/submit-button";
import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { updateWorkspaceSettingsAction } from "@/modules/settings/actions";
import { SettingsStatusBanner } from "@/modules/settings/components/settings-status-banner";

type WorkspaceSettingsFormProps = {
  context: AuthenticatedAppContext;
  status?: {
    kind: "error" | "message";
    text: string;
  } | null;
};

export function WorkspaceSettingsForm({
  context,
  status,
}: WorkspaceSettingsFormProps) {
  const canEditWorkspace =
    context.workspace.role === "owner" || context.workspace.role === "admin";

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Workspace</p>
        <h2 className="section-title">Workspace identity</h2>
        <p className="muted">
          Update the workspace label, URL slug, and reply-to email used for platform
          invoice sending.
        </p>
      </div>

      <SettingsStatusBanner status={status} />

      {!canEditWorkspace ? (
        <p className="status status-error">
          Your current membership role is read-only for workspace settings.
        </p>
      ) : null}

      <form className="stack form-stack" action={updateWorkspaceSettingsAction}>
        <label className="field">
          <span>Workspace name</span>
          <input
            name="name"
            type="text"
            autoComplete="organization"
            defaultValue={context.workspace.name}
            placeholder="Alex Studio"
            disabled={!canEditWorkspace}
            required
          />
        </label>

        <label className="field">
          <span>Workspace URL slug</span>
          <input
            name="slug"
            type="text"
            defaultValue={context.workspace.slug}
            placeholder="alex-studio"
            disabled={!canEditWorkspace}
            required
          />
        </label>

        <label className="field">
          <span>Reply-to email</span>
          <input
            name="replyToEmail"
            type="email"
            autoComplete="email"
            defaultValue={context.workspace.replyToEmail ?? ""}
            placeholder="billing@yourstudio.com"
            disabled={!canEditWorkspace}
          />
        </label>

        <label className="field">
          <span>Membership role</span>
          <input type="text" value={context.workspace.role} disabled readOnly />
        </label>

        {canEditWorkspace ? (
          <SubmitButton
            idleLabel="Save workspace"
            pendingLabel="Saving workspace..."
          />
        ) : null}
      </form>
    </section>
  );
}
