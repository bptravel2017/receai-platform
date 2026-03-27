import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { getOptionalUser } from "@/lib/auth/session";
import { acceptWorkspaceInviteAction } from "@/modules/settings/member-actions";
import { SettingsStatusBanner } from "@/modules/settings/components/settings-status-banner";
import { RoleBadge } from "@/modules/settings/components/role-badge";
import { getInviteByToken } from "@/modules/settings/members";

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const [{ token }, search, user] = await Promise.all([
    params,
    searchParams,
    getOptionalUser(),
  ]);
  const invite = await getInviteByToken(token);

  if (!invite) {
    notFound();
  }

  const status = search.error
    ? { kind: "error" as const, text: search.error }
    : search.message
      ? { kind: "message" as const, text: search.message }
      : null;
  const nextPath = `/invite/${token}`;
  const isSignedIn = Boolean(user?.email);
  const emailMatches =
    !user?.email ||
    user.email.toLowerCase() === invite.invited_email.toLowerCase();
  const isPending = invite.status === "pending";
  const isExpired = invite.status === "expired";

  return (
    <PageShell
      eyebrow="Invite"
      title={`Join ${invite.workspaceName}`}
      description="Accept a workspace invite to collaborate inside the protected ReceAI shell."
    >
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Workspace access</p>
          <h2 className="section-title">{invite.workspaceName}</h2>
          <p className="muted">
            Workspace slug: <strong>{invite.workspaceSlug}</strong>
          </p>
        </div>

        <div className="invite-meta-row">
          <RoleBadge role={invite.role} />
          <span className="muted">Invited email: {invite.invited_email}</span>
          <span className="muted">Expires {formatDate(invite.expires_at)}</span>
        </div>

        <SettingsStatusBanner status={status} />

        {!isPending ? (
          <p className="status status-message">
            This invite has already been accepted or revoked.
          </p>
        ) : null}

        {isExpired ? (
          <p className="status status-error">
            This invite expired. Ask a workspace admin to send a fresh one.
          </p>
        ) : null}

        {!isSignedIn ? (
          <div className="grid settings-link-grid">
            <Link className="surface settings-link-card" href={`/sign-in?next=${encodeURIComponent(nextPath)}`}>
              <strong>Sign in to accept</strong>
              <span className="muted">
                Use the invited email address to join this workspace.
              </span>
            </Link>
            <Link className="surface settings-link-card" href={`/sign-up?next=${encodeURIComponent(nextPath)}`}>
              <strong>Create account</strong>
              <span className="muted">
                New collaborators can create an account first, then accept the invite.
              </span>
            </Link>
          </div>
        ) : (
          <section className="surface section stack">
            <p className="muted">
              Signed in as <strong>{user?.email}</strong>
            </p>

            {!emailMatches ? (
              <p className="status status-error">
                Sign in with {invite.invited_email} to accept this invite safely.
              </p>
            ) : null}

            {emailMatches && isPending && !isExpired ? (
              <form action={acceptWorkspaceInviteAction}>
                <input type="hidden" name="token" value={token} />
                <button className="button-primary" type="submit">
                  Accept invite
                </button>
              </form>
            ) : null}
          </section>
        )}
      </section>
    </PageShell>
  );
}
