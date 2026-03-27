import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { BootstrapNotice } from "@/modules/settings/components/bootstrap-notice";
import { ProfileSettingsForm } from "@/modules/settings/components/profile-settings-form";

type ProfileSettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ProfileSettingsPage({
  searchParams,
}: ProfileSettingsPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);

  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Settings"
      title="Profile settings"
      description="Review and edit the signed-in identity attached to this workspace."
    >
      <BootstrapNotice
        bootstrap={context.bootstrap}
        hasProfileName={Boolean(context.profile.fullName?.trim())}
      />
      <ProfileSettingsForm context={context} status={status} />
    </PageShell>
  );
}
