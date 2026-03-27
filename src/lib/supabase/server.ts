import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { requirePublicSupabaseEnv, requireSupabaseAdminEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const config = requirePublicSupabaseEnv();

  return createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookie writes are not always available during server rendering.
          }
        },
      },
    },
  );
}

export function createSupabaseAdminClient() {
  const config = requireSupabaseAdminEnv();

  return createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
