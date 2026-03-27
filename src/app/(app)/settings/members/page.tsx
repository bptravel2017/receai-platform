import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { BootstrapNotice } from "@/modules/settings/components/bootstrap-notice";
import { InviteMemberForm } from "@/modules/settings/components/invite-member-form";
import { PendingInvitesList } from "@/modules/settings/components/pending-invites-list";
import { SettingsStatusBanner } from "@/modules/settings/components/settings-status-banner";
import { WorkspaceMembersList } from "@/modules/settings/components/workspace-members-list";
import { getWorkspaceMembersData } from "@/modules/settings/members";

type MembersSettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function MembersSettingsPage({
  searchParams,
}: MembersSettingsPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);

  const data = await getWorkspaceMembersData(context);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Settings"
      title="Workspace members"
      description="Manage who can access this workspace before business modules arrive."
    >
      <BootstrapNotice
        bootstrap={context.bootstrap}
        hasProfileName={Boolean(context.profile.fullName?.trim())}
      />

      <SettingsStatusBanner status={status} />

      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Access</p>
          <h2 className="section-title">Roles and invitations</h2>
          <p className="muted">
            Owners can manage roles and removals. Owners and admins can create and
            revoke invites.
          </p>
        </div>
      </section>

      <div className="grid members-layout-grid">
        <WorkspaceMembersList
          members={data.members}
          currentUserRole={context.workspace.role}
        />
        <InviteMemberForm context={context} />
      </div>

      <PendingInvitesList
        invites={data.invites}
        currentUserRole={context.workspace.role}
      />
    </PageShell>
  );
}
