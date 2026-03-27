import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseArgs(argv: string[]) {
  let email: string | null = null;
  let password: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1];

    if (arg === "--email") {
      email = nextValue ?? null;
      index += 1;
      continue;
    }

    if (arg === "--password") {
      password = nextValue ?? null;
      index += 1;
    }
  }

  if (!email || !password) {
    throw new Error("Usage: node scripts/reset-user-password.ts --email <email> --password <password>");
  }

  return { email, password };
}

function createAdminClient() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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

async function main() {
  const { email, password } = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error(`User not found for ${email}`);
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, { password });

  if (error) {
    throw new Error(error.message);
  }

  console.log(`Password updated for ${email}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exit(1);
});
