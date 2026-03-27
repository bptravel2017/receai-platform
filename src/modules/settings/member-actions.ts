"use server";

import { redirect } from "next/navigation";

import { getOptionalUser, requireAuthenticatedAppContext } from "@/lib/auth/session";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createWorkspaceInvite,
  getInviteByToken,
  removeWorkspaceMember,
  revokeWorkspaceInvite,
  updateWorkspaceMemberRole,
  WorkspaceMembersError,
} from "@/modules/settings/members";

function getTrimmedField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function withStatus(path: string, key: "error" | "message", value: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(key, value);
  return `${path}?${searchParams.toString()}`;
}

export async function inviteWorkspaceMemberAction(formData: FormData) {
  const email = getTrimmedField(formData, "email");
  const role = getTrimmedField(formData, "role");
  const context = await requireAuthenticatedAppContext();

  try {
    await createWorkspaceInvite(
      context,
      email,
      role === "admin" ? "admin" : "member",
    );
  } catch (error) {
    const message =
      error instanceof WorkspaceMembersError
        ? error.message
        : "We could not create that invite.";

    redirect(withStatus("/settings/members", "error", message));
  }

  redirect(withStatus("/settings/members", "message", "Invite created."));
}

export async function revokeWorkspaceInviteAction(formData: FormData) {
  const inviteId = getTrimmedField(formData, "inviteId");
  const context = await requireAuthenticatedAppContext();

  try {
    await revokeWorkspaceInvite(context, inviteId);
  } catch (error) {
    const message =
      error instanceof WorkspaceMembersError
        ? error.message
        : "We could not revoke that invite.";

    redirect(withStatus("/settings/members", "error", message));
  }

  redirect(withStatus("/settings/members", "message", "Invite revoked."));
}

export async function updateWorkspaceMemberRoleAction(formData: FormData) {
  const memberUserId = getTrimmedField(formData, "memberUserId");
  const role = getTrimmedField(formData, "role");
  const context = await requireAuthenticatedAppContext();

  try {
    await updateWorkspaceMemberRole(
      context,
      memberUserId,
      role === "admin" ? "admin" : "member",
    );
  } catch (error) {
    const message =
      error instanceof WorkspaceMembersError
        ? error.message
        : "We could not update that member role.";

    redirect(withStatus("/settings/members", "error", message));
  }

  redirect(withStatus("/settings/members", "message", "Member role updated."));
}

export async function removeWorkspaceMemberAction(formData: FormData) {
  const memberUserId = getTrimmedField(formData, "memberUserId");
  const context = await requireAuthenticatedAppContext();

  try {
    await removeWorkspaceMember(context, memberUserId);
  } catch (error) {
    const message =
      error instanceof WorkspaceMembersError
        ? error.message
        : "We could not remove that member.";

    redirect(withStatus("/settings/members", "error", message));
  }

  redirect(withStatus("/settings/members", "message", "Member removed."));
}

export async function acceptWorkspaceInviteAction(formData: FormData) {
  const token = getTrimmedField(formData, "token");
  const user = await getOptionalUser();

  if (!user?.email) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const invite = await getInviteByToken(token);

  if (!invite) {
    redirect(withStatus(`/invite/${token}`, "error", "That invite no longer exists."));
  }

  if (invite.status !== "pending") {
    redirect(
      withStatus(`/invite/${token}`, "message", "That invite has already been handled."),
    );
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    redirect(withStatus(`/invite/${token}`, "error", "That invite has expired."));
  }

  if (invite.invited_email.toLowerCase() !== user.email.toLowerCase()) {
    redirect(
      withStatus(
        `/invite/${token}`,
        "error",
        "Sign in with the invited email address to accept this invite.",
      ),
    );
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  const { data: existingMembership, error: membershipLookupError } = await admin
    .from("workspace_memberships")
    .select("id")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipLookupError) {
    redirect(
      withStatus(`/invite/${token}`, "error", "We could not verify workspace access."),
    );
  }

  if (!existingMembership) {
    const { error: membershipInsertError } = await admin
      .from("workspace_memberships")
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
      });

    if (membershipInsertError) {
      redirect(
        withStatus(`/invite/${token}`, "error", "We could not add you to the workspace."),
      );
    }
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      default_workspace_id: invite.workspace_id,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    redirect(
      withStatus(`/invite/${token}`, "error", "We could not prepare your profile."),
    );
  }

  const { error: inviteUpdateError } = await admin
    .from("workspace_invites")
    .update({
      status: "accepted",
      accepted_by_user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  if (inviteUpdateError) {
    redirect(
      withStatus(`/invite/${token}`, "error", "We could not finalize that invite."),
    );
  }

  const { error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    redirect(
      withStatus("/settings/members", "message", "Joined workspace. Refresh if it is not visible yet."),
    );
  }

  redirect(
    withStatus("/settings/members", "message", "Invite accepted. You now have workspace access."),
  );
}
