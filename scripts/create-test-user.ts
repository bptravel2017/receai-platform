import { createClient, type User } from "@supabase/supabase-js";

const TEST_EMAIL = "test@receai.com";
const TEST_PASSWORD = "Test123456!";
const TEST_FULL_NAME = "ReceAI Test Admin";
const TEST_WORKSPACE_NAME = "ReceAI Test Workspace";
const TEST_ROLE = "owner";
const DEFAULT_REDIRECT_PATH = "/dashboard";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  reply_to_email: string | null;
};

function getEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createAdminClient() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createAnonClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!anonKey) {
    return null;
  }

  return createClient(getEnv("SUPABASE_URL"), anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function findUserByEmail(email: string) {
  const admin = createAdminClient();
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Unable to list Supabase auth users: ${error.message}`);
    }

    const matchedUser = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (matchedUser) {
      return matchedUser;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function ensureAuthUser() {
  const admin = createAdminClient();
  const existingUser = await findUserByEmail(TEST_EMAIL);

  if (existingUser) {
    const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        full_name: TEST_FULL_NAME,
        workspace_name: TEST_WORKSPACE_NAME,
      },
      app_metadata: {
        ...(existingUser.app_metadata ?? {}),
        role: "admin",
      },
    });

    if (error) {
      throw new Error(`Unable to update existing test user: ${error.message}`);
    }

    console.log("test user already exists");

    return {
      user: data.user,
      created: false,
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: TEST_FULL_NAME,
      workspace_name: TEST_WORKSPACE_NAME,
    },
    app_metadata: {
      role: "admin",
    },
  });

  if (error || !data.user) {
    throw new Error(`Unable to create test user: ${error?.message ?? "Unknown error"}`);
  }

  return {
    user: data.user,
    created: true,
  };
}

async function buildUniqueWorkspaceSlug() {
  const admin = createAdminClient();
  const baseSlug = slugify(TEST_WORKSPACE_NAME) || "receai-test-workspace";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const { data, error } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to check workspace slug availability: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

async function getExistingWorkspace(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspace_memberships")
    .select("role, workspace_id, workspaces(id, name, slug, reply_to_email)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to read workspace membership: ${error.message}`);
  }

  return data as
    | {
        role: string;
        workspace_id: string;
        workspaces: WorkspaceRow | null;
      }
    | null;
}

async function createWorkspace(userId: string) {
  const admin = createAdminClient();
  const slug = await buildUniqueWorkspaceSlug();

  const { data, error } = await admin
    .from("workspaces")
    .insert({
      name: TEST_WORKSPACE_NAME,
      slug,
      owner_user_id: userId,
      reply_to_email: null,
    })
    .select("id, name, slug, reply_to_email")
    .single();

  if (error) {
    throw new Error(`Unable to create workspace for test user: ${error.message}`);
  }

  return data as WorkspaceRow;
}

async function ensureWorkspaceMembership(userId: string, workspaceId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("workspace_memberships").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role: TEST_ROLE,
    },
    {
      onConflict: "workspace_id,user_id",
    },
  );

  if (error) {
    throw new Error(`Unable to ensure workspace membership: ${error.message}`);
  }
}

async function ensureProfile(user: User, workspaceId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? TEST_EMAIL,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : TEST_FULL_NAME,
      default_workspace_id: workspaceId,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw new Error(`Unable to ensure profile: ${error.message}`);
  }
}

async function ensureWorkspaceBundle(user: User) {
  const existingWorkspace = await getExistingWorkspace(user.id);
  const workspace =
    existingWorkspace?.workspaces ?? (await createWorkspace(user.id));

  await ensureWorkspaceMembership(user.id, workspace.id);
  await ensureProfile(user, workspace.id);

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    role: TEST_ROLE,
  };
}

async function verifyDirectLogin() {
  const anon = createAnonClient();

  if (!anon) {
    return {
      verified: false,
      reason: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set; skipped password login verification.",
    };
  }

  const { data, error } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    throw new Error(`Created test user cannot log in yet: ${error.message}`);
  }

  await anon.auth.signOut();

  return {
    verified: Boolean(data.session),
    reason: data.session
      ? "Password login returned a session successfully."
      : "Password login completed without a session.",
  };
}

function printResult(args: {
  created: boolean;
  role: string;
  loginVerified: boolean;
  loginReason: string;
  workspaceSlug: string;
}) {
  console.log(`email: ${TEST_EMAIL}`);
  console.log(`password: ${TEST_PASSWORD}`);
  console.log(`role: ${args.role}`);
  console.log(`created: ${args.created ? "true" : "false"}`);
  console.log(`login_verified: ${args.loginVerified ? "true" : "false"}`);
  console.log(`login_check: ${args.loginReason}`);
  console.log(`redirect_path: ${DEFAULT_REDIRECT_PATH}`);
  console.log(`workspace_slug: ${args.workspaceSlug}`);
}

async function main() {
  const { user, created } = await ensureAuthUser();
  const workspace = await ensureWorkspaceBundle(user);
  const loginCheck = await verifyDirectLogin();

  printResult({
    created,
    role: workspace.role,
    loginVerified: loginCheck.verified,
    loginReason: loginCheck.reason,
    workspaceSlug: workspace.workspaceSlug,
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (
    (message.includes("relation") || message.includes("schema cache")) &&
    (message.includes("profiles") ||
      message.includes("workspace_memberships") ||
      message.includes("workspaces") ||
      message.includes("auth_workspace_foundation"))
  ) {
    console.error(message);
    console.error("ReceAI v2 auth foundation tables are missing in this Supabase project.");
    console.error(
      "Apply at least supabase/migrations/20260323_auth_workspace_foundation.sql and supabase/migrations/20260324_invoice_platform_email.sql, then rerun this script.",
    );
    console.error("If you use the Supabase CLI, the usual command is: supabase db push");
    process.exit(1);
  }

  console.error(message);
  process.exit(1);
});
