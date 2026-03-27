import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { canAccessFeature } from "@/modules/plans/access";
import { FeatureGateNotice } from "@/modules/plans/components/feature-gate-notice";
import { BootstrapNotice } from "@/modules/settings/components/bootstrap-notice";
import { WorkspaceSettingsForm } from "@/modules/settings/components/workspace-settings-form";

type WorkspaceSettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function WorkspaceSettingsPage({
  searchParams,
}: WorkspaceSettingsPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);

  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  if (!canAccessFeature(context.workspace.plan, "company_settings")) {
    return (
      <FeatureGateNotice
        eyebrow="Settings"
        title="Workspace settings"
        description="Review the current workspace identity and reply-to email used by platform invoice delivery."
        requiredPlan="pro"
      />
    );
  }

  return (
    <PageShell
      eyebrow="Settings"
      title="Workspace settings"
      description="Review the current workspace identity and reply-to email used by platform invoice delivery."
    >
      <BootstrapNotice
        bootstrap={context.bootstrap}
        hasProfileName={Boolean(context.profile.fullName?.trim())}
      />
      <WorkspaceSettingsForm context={context} status={status} />
    </PageShell>
  );
}
