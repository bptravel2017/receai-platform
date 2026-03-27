import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { BootstrapNotice } from "@/modules/settings/components/bootstrap-notice";

export default async function SettingsPage() {
  const context = await requireAuthenticatedAppContext();
  const hasProfileName = Boolean(context.profile.fullName?.trim());

  return (
    <PageShell
      eyebrow="Settings"
      title="Settings"
      description="Manage the identity details that anchor the authenticated workspace shell."
    >
      <BootstrapNotice
        bootstrap={context.bootstrap}
        hasProfileName={hasProfileName}
      />

      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Overview</p>
          <h2 className="section-title">Profile and workspace setup</h2>
          <p className="muted">
            Keep account identity and workspace metadata clean before billing,
            invoice, and cost flows are implemented.
          </p>
        </div>

        <div className="grid settings-link-grid">
          <Link className="surface settings-link-card" href="/settings/profile">
            <strong>Profile settings</strong>
            <span className="muted">
              Edit your signed-in name. Account email remains read-only in this
              scaffold step.
            </span>
          </Link>

          <Link className="surface settings-link-card" href="/settings/workspace">
            <strong>Workspace settings</strong>
            <span className="muted">
              Edit the workspace name and URL slug from the current
              `workspaces` foundation.
            </span>
          </Link>

          <Link className="surface settings-link-card" href="/settings/members">
            <strong>Workspace members</strong>
            <span className="muted">
              Review current collaborators, roles, and pending invite links.
            </span>
          </Link>

          <Link className="surface settings-link-card" href="/settings/deployment">
            <strong>Deployment readiness</strong>
            <span className="muted">
              Audit production config, launch guardrails, and the manual release
              checklist before rollout.
            </span>
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
