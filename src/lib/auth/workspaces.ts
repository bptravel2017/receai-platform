import type {
  AuthenticatedAppContext,
  BootstrapSummary,
  ProfileSummary,
  WorkspaceSummary,
} from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getWorkspaceBillingSummaryByWorkspaceId } from "@/modules/billing/accounts";
import type { WorkspacePlan } from "@/modules/plans/types";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  default_workspace_id: string | null;
};

type MembershipRow = {
  role: string;
  workspace_id: string;
  workspaces: {
    id: string;
    name: string;
    slug: string;
    reply_to_email: string | null;
    plan: WorkspacePlan;
  } | null;
};

type AuthUserInput = {
  id: string;
  email: string;
  fullName?: string | null;
  workspaceName?: string | null;
};

export class AuthBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthBootstrapError";
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function deriveWorkspaceName(user: AuthUserInput) {
  if (user.workspaceName && user.workspaceName.trim().length > 0) {
    return user.workspaceName.trim();
  }

  if (user.fullName && user.fullName.trim().length > 0) {
    return `${user.fullName.trim()}'s Workspace`;
  }

  const emailPrefix = user.email.split("@")[0] ?? "receai";
  return `${emailPrefix}'s Workspace`;
}

async function buildUniqueWorkspaceSlug(baseName: string) {
  const admin = createSupabaseAdminClient();
  const baseSlug = slugify(baseName) || "receai-workspace";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const { data } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

async function getWorkspaceMembership(
  userId: string,
  workspaceId?: string | null,
) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("workspace_memberships")
    .select("role, workspace_id, workspaces(id, name, slug, reply_to_email, plan)")
    .eq("user_id", userId);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.limit(1);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as MembershipRow | null;
}

async function getProfile(userId: string) {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, default_workspace_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new AuthBootstrapError(
      "We could not load your profile right now. Please try again.",
    );
  }

  return data as ProfileRow | null;
}

async function upsertProfileAndDefaultWorkspace(
  user: AuthUserInput,
  workspaceId: string,
  fullName: string | null = user.fullName ?? null,
) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      default_workspace_id: workspaceId,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new AuthBootstrapError(
      "We could not save your profile details right now. Please try again.",
    );
  }
}

async function createWorkspaceForUser(user: AuthUserInput) {
  const admin = createSupabaseAdminClient();
  const workspaceName = deriveWorkspaceName(user);
  const workspaceSlug = await buildUniqueWorkspaceSlug(workspaceName);

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .insert({
      name: workspaceName,
      slug: workspaceSlug,
      owner_user_id: user.id,
      reply_to_email: null,
      plan: "free",
    })
    .select("id, name, slug, reply_to_email, plan")
    .single();

  if (workspaceError) {
    throw new AuthBootstrapError(
      "We could not create your workspace right now. Please try again.",
    );
  }

  const { error: membershipError } = await admin
    .from("workspace_memberships")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

  if (membershipError) {
    throw new AuthBootstrapError(
      "We could not connect you to a workspace right now. Please try again.",
    );
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    replyToEmail: workspace.reply_to_email,
    plan: workspace.plan,
    role: "owner",
  } satisfies WorkspaceSummary;
}

function toProfileSummary(
  profile: ProfileRow | null,
  user: AuthUserInput,
): ProfileSummary {
  return {
    id: user.id,
    email: profile?.email ?? user.email,
    fullName: profile?.full_name ?? user.fullName ?? null,
    defaultWorkspaceId: profile?.default_workspace_id ?? null,
  };
}

export async function buildAuthenticatedAppContext(user: AuthUserInput) {
  const profile = await getProfile(user.id);
  const preferredMembership = await getWorkspaceMembership(
    user.id,
    profile?.default_workspace_id,
  );
  const existingMembership =
    preferredMembership ?? (await getWorkspaceMembership(user.id));

  const bootstrap: BootstrapSummary = {
    createdWorkspace: false,
    createdProfile: !profile,
    recoveredProfile: false,
    recoveredDefaultWorkspace: false,
    isFirstLogin: !profile && !existingMembership,
  };

  let workspace: WorkspaceSummary;

  if (existingMembership?.workspaces) {
    workspace = {
      id: existingMembership.workspaces.id,
      name: existingMembership.workspaces.name,
      slug: existingMembership.workspaces.slug,
      replyToEmail: existingMembership.workspaces.reply_to_email,
      plan: existingMembership.workspaces.plan,
      role: existingMembership.role,
    };
  } else {
    workspace = await createWorkspaceForUser(user);
    bootstrap.createdWorkspace = true;
  }

  const needsProfileRecovery =
    !profile ||
    profile.email !== user.email ||
    profile.default_workspace_id !== workspace.id;

  if (needsProfileRecovery) {
    await upsertProfileAndDefaultWorkspace(
      user,
      workspace.id,
      profile?.full_name ?? user.fullName ?? null,
    );
    bootstrap.recoveredProfile = Boolean(profile);
    bootstrap.recoveredDefaultWorkspace =
      profile?.default_workspace_id !== workspace.id;
  }

  const refreshedProfile = needsProfileRecovery
    ? ({
        id: user.id,
        email: user.email,
        full_name: profile?.full_name ?? user.fullName ?? null,
        default_workspace_id: workspace.id,
      } satisfies ProfileRow)
    : profile;
  const billing = await getWorkspaceBillingSummaryByWorkspaceId(workspace.id, {
    admin: true,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: refreshedProfile?.full_name ?? user.fullName ?? null,
    },
    profile: toProfileSummary(refreshedProfile, user),
    workspace,
    billing,
    bootstrap,
  } satisfies AuthenticatedAppContext;
}
