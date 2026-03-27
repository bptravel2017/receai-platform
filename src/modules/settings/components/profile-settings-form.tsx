import { SubmitButton } from "@/components/auth/submit-button";
import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { updateProfileSettingsAction } from "@/modules/settings/actions";
import { SettingsStatusBanner } from "@/modules/settings/components/settings-status-banner";

type ProfileSettingsFormProps = {
  context: AuthenticatedAppContext;
  status?: {
    kind: "error" | "message";
    text: string;
  } | null;
};

export function ProfileSettingsForm({
  context,
  status,
}: ProfileSettingsFormProps) {
  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Profile</p>
        <h2 className="section-title">Signed-in identity</h2>
        <p className="muted">
          Keep the owner name current so workspace setup and future audit trails stay
          understandable.
        </p>
      </div>

      <SettingsStatusBanner status={status} />

      <form className="stack form-stack" action={updateProfileSettingsAction}>
        <label className="field">
          <span>Full name</span>
          <input
            name="fullName"
            type="text"
            autoComplete="name"
            defaultValue={context.profile.fullName ?? ""}
            placeholder="Alex Morgan"
          />
        </label>

        <label className="field">
          <span>Account email</span>
          <input type="email" value={context.user.email} disabled readOnly />
        </label>

        <label className="field">
          <span>Default workspace</span>
          <input type="text" value={context.workspace.name} disabled readOnly />
        </label>

        <SubmitButton
          idleLabel="Save profile"
          pendingLabel="Saving profile..."
        />
      </form>
    </section>
  );
}
