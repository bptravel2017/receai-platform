import { redirect } from "next/navigation";

import { buildAuthenticatedAppContext } from "@/lib/auth/workspaces";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getOptionalUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireAuthenticatedAppContext() {
  const user = await getOptionalUser();

  if (!user?.email) {
    redirect("/sign-in");
  }

  return buildAuthenticatedAppContext({
    id: user.id,
    email: user.email,
    fullName:
      typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    workspaceName:
      typeof user.user_metadata.workspace_name === "string"
        ? user.user_metadata.workspace_name
        : null,
  });
}
