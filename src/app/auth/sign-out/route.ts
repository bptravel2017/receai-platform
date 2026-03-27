import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL(request.url);
  const redirectUrl = new URL("/login?message=You+have+been+signed+out.", url.origin);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
