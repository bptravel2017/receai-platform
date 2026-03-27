import { buildAuthenticatedAppContext } from "@/lib/auth/workspaces";
import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getApiAppContext(): Promise<AuthenticatedAppContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
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
