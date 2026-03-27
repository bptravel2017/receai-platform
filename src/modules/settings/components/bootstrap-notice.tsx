import Link from "next/link";

import type { BootstrapSummary } from "@/lib/auth/types";

type BootstrapNoticeProps = {
  bootstrap: BootstrapSummary;
  hasProfileName: boolean;
};

export function BootstrapNotice({
  bootstrap,
  hasProfileName,
}: BootstrapNoticeProps) {
  const needsAttention =
    bootstrap.isFirstLogin ||
    bootstrap.createdWorkspace ||
    bootstrap.createdProfile ||
    bootstrap.recoveredProfile ||
    bootstrap.recoveredDefaultWorkspace ||
    !hasProfileName;

  if (!needsAttention) {
    return null;
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Onboarding</p>
        <h2 className="section-title">Review your identity and workspace details</h2>
        <p className="muted">
          {bootstrap.isFirstLogin
            ? "Your first workspace was provisioned automatically. Confirm the name and URL before inviting anyone else."
            : "Your protected shell is ready. Review the recovered profile and workspace details before you move on."}
        </p>
      </div>

      <div className="grid settings-link-grid">
        <Link className="surface settings-link-card" href="/settings/profile">
          <strong>Profile settings</strong>
          <span className="muted">
            {hasProfileName
              ? "Confirm your signed-in identity details."
              : "Add your name so the workspace owner identity is clear."}
          </span>
        </Link>

        <Link className="surface settings-link-card" href="/settings/workspace">
          <strong>Workspace settings</strong>
          <span className="muted">
            Review the workspace name and URL slug created during bootstrap.
          </span>
        </Link>
      </div>
    </section>
  );
}
