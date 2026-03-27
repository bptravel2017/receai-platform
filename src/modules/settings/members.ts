import { requirePublicAppUrl } from "@/lib/env";
import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type MembershipRow = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
};

type InviteRow = {
  id: string;
  workspace_id: string;
  invited_email: string;
  role: "admin" | "member";
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

export type WorkspaceMemberSummary = {
  id: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  email: string;
  fullName: string | null;
  isCurrentUser: boolean;
};

export type WorkspaceInviteSummary = {
  id: string;
  invitedEmail: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedByLabel: string;
  expiresAt: string;
  createdAt: string;
  acceptUrl: string;
};

export type WorkspaceMembersData = {
  members: WorkspaceMemberSummary[];
  invites: WorkspaceInviteSummary[];
};

export class WorkspaceMembersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceMembersError";
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function resolveInviteStatus(invite: InviteRow) {
  if (
    invite.status === "pending" &&
    new Date(invite.expires_at).getTime() <= Date.now()
  ) {
    return "expired" as const;
  }

  return invite.status;
}

function assertCanManageInvites(context: AuthenticatedAppContext) {
  if (
    context.workspace.role !== "owner" &&
    context.workspace.role !== "admin"
  ) {
    throw new WorkspaceMembersError(
      "You do not have permission to manage workspace collaborators.",
    );
  }
}

function assertOwner(context: AuthenticatedAppContext) {
  if (context.workspace.role !== "owner") {
    throw new WorkspaceMembersError(
      "Only the workspace owner can change member roles or remove members.",
    );
  }
}

export async function getWorkspaceMembersData(
  context: AuthenticatedAppContext,
): Promise<WorkspaceMembersData> {
  const appUrl = requirePublicAppUrl();
  const admin = createSupabaseAdminClient();

  const [{ data: memberships, error: membershipsError }, { data: invites, error: invitesError }] =
    await Promise.all([
      admin
        .from("workspace_memberships")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", context.workspace.id)
        .order("created_at", { ascending: true }),
      admin
        .from("workspace_invites")
        .select(
          "id, workspace_id, invited_email, role, token, status, invited_by_user_id, accepted_by_user_id, accepted_at, expires_at, created_at",
        )
        .eq("workspace_id", context.workspace.id)
        .order("created_at", { ascending: false }),
    ]);

  if (membershipsError || invitesError) {
    throw new WorkspaceMembersError(
      "We could not load the workspace members right now.",
    );
  }

  const memberRows = (memberships ?? []) as MembershipRow[];
  const inviteRows = (invites ?? []) as InviteRow[];
  const userIds = Array.from(
    new Set([
      ...memberRows.map((membership) => membership.user_id),
      ...inviteRows.map((invite) => invite.invited_by_user_id),
    ]),
  );

  let profilesById = new Map<string, ProfileRow>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profilesError) {
      throw new WorkspaceMembersError(
        "We could not load workspace member identities right now.",
      );
    }

    profilesById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
    );
  }

  return {
    members: memberRows.map((membership) => {
      const profile = profilesById.get(membership.user_id);

      return {
        id: membership.id,
        userId: membership.user_id,
        role: membership.role,
        joinedAt: membership.created_at,
        email: profile?.email ?? "Unknown account",
        fullName: profile?.full_name ?? null,
        isCurrentUser: membership.user_id === context.user.id,
      };
    }),
    invites: inviteRows.map((invite) => {
      const inviter = profilesById.get(invite.invited_by_user_id);

      return {
        id: invite.id,
        invitedEmail: invite.invited_email,
        role: invite.role,
        status: resolveInviteStatus(invite),
        invitedByLabel:
          inviter?.full_name?.trim() || inviter?.email || "Workspace admin",
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
        acceptUrl: `${appUrl}/invite/${invite.token}`,
      };
    }),
  };
}

export async function createWorkspaceInvite(
  context: AuthenticatedAppContext,
  email: string,
  role: "admin" | "member",
) {
  assertCanManageInvites(context);

  const admin = createSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail.includes("@")) {
    throw new WorkspaceMembersError("Enter a valid email address.");
  }

  if (normalizedEmail === normalizeEmail(context.user.email)) {
    throw new WorkspaceMembersError("You are already a member of this workspace.");
  }

  const { data: existingProfiles, error: profileError } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", normalizedEmail);

  if (profileError) {
    throw new WorkspaceMembersError("We could not validate that email address.");
  }

  const existingUserId = existingProfiles?.[0]?.id ?? null;

  if (existingUserId) {
    const { data: existingMembership, error: membershipError } = await admin
      .from("workspace_memberships")
      .select("id")
      .eq("workspace_id", context.workspace.id)
      .eq("user_id", existingUserId)
      .maybeSingle();

    if (membershipError) {
      throw new WorkspaceMembersError("We could not validate workspace membership.");
    }

    if (existingMembership) {
      throw new WorkspaceMembersError(
        "That person is already a member of this workspace.",
      );
    }
  }

  const { data: pendingInvite, error: pendingInviteError } = await admin
    .from("workspace_invites")
    .select("id")
    .eq("workspace_id", context.workspace.id)
    .ilike("invited_email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingInviteError) {
    throw new WorkspaceMembersError("We could not check existing invites.");
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

  if (pendingInvite) {
    const { error } = await admin
      .from("workspace_invites")
      .update({
        role,
        invited_by_user_id: context.user.id,
        expires_at: expiresAt,
        status: "pending",
      })
      .eq("id", pendingInvite.id);

    if (error) {
      throw new WorkspaceMembersError("We could not refresh that invite.");
    }

    return;
  }

  const { error } = await admin.from("workspace_invites").insert({
    workspace_id: context.workspace.id,
    invited_email: normalizedEmail,
    role,
    invited_by_user_id: context.user.id,
    expires_at: expiresAt,
  });

  if (error) {
    throw new WorkspaceMembersError("We could not create that invite.");
  }
}

export async function revokeWorkspaceInvite(
  context: AuthenticatedAppContext,
  inviteId: string,
) {
  assertCanManageInvites(context);

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("workspace_invites")
    .update({
      status: "revoked",
    })
    .eq("id", inviteId)
    .eq("workspace_id", context.workspace.id)
    .eq("status", "pending");

  if (error) {
    throw new WorkspaceMembersError("We could not revoke that invite.");
  }
}

export async function updateWorkspaceMemberRole(
  context: AuthenticatedAppContext,
  memberUserId: string,
  role: "admin" | "member",
) {
  assertOwner(context);

  if (memberUserId === context.user.id) {
    throw new WorkspaceMembersError("Owners cannot change their own membership role.");
  }

  const admin = createSupabaseAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from("workspace_memberships")
    .select("id, role")
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", memberUserId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new WorkspaceMembersError("We could not find that workspace member.");
  }

  if (membership.role === "owner") {
    throw new WorkspaceMembersError("Owner access cannot be changed here.");
  }

  const { error } = await admin
    .from("workspace_memberships")
    .update({ role })
    .eq("id", membership.id);

  if (error) {
    throw new WorkspaceMembersError("We could not update that member role.");
  }
}

export async function removeWorkspaceMember(
  context: AuthenticatedAppContext,
  memberUserId: string,
) {
  assertOwner(context);

  if (memberUserId === context.user.id) {
    throw new WorkspaceMembersError("Owners cannot remove themselves.");
  }

  const admin = createSupabaseAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from("workspace_memberships")
    .select("id, role")
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", memberUserId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new WorkspaceMembersError("We could not find that workspace member.");
  }

  if (membership.role === "owner") {
    throw new WorkspaceMembersError("Owner access cannot be removed here.");
  }

  const { error } = await admin
    .from("workspace_memberships")
    .delete()
    .eq("id", membership.id);

  if (error) {
    throw new WorkspaceMembersError("We could not remove that member.");
  }
}

export async function getInviteByToken(token: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspace_invites")
    .select("id, workspace_id, invited_email, role, token, status, invited_by_user_id, accepted_by_user_id, accepted_at, expires_at, created_at, workspaces(name, slug)")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new WorkspaceMembersError("We could not load that invite.");
  }

  if (!data) {
    return null;
  }

  const invite = data as InviteRow & {
    workspaces:
      | {
          name: string;
          slug: string;
        }[]
      | null;
  };

  return {
    ...invite,
    status: resolveInviteStatus(invite),
    workspaceName: invite.workspaces?.[0]?.name ?? "Workspace",
    workspaceSlug: invite.workspaces?.[0]?.slug ?? "workspace",
  };
}
