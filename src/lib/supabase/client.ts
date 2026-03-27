import { createBrowserClient } from "@supabase/ssr";

import { requirePublicSupabaseEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const config = requirePublicSupabaseEnv();

  return createBrowserClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
  );
}
