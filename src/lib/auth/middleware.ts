import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeNextPath } from "@/lib/auth/redirects";
import { requirePublicSupabaseEnv } from "@/lib/env";

const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/customers",
  "/revenue",
  "/invoices",
  "/costs",
  "/cost-categories",
  "/profit",
  "/bank",
  "/billing",
  "/settings",
];

const AUTH_ROUTE_PREFIXES = ["/login", "/sign-in", "/sign-up"];

function matchesRoute(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });
  let config;

  try {
    config = requirePublicSupabaseEnv();
  } catch (error) {
    return new NextResponse(
      error instanceof Error
        ? error.message
        : "ReceAI runtime configuration is missing required Supabase settings.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }

  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedAppRoute = matchesRoute(pathname, APP_ROUTE_PREFIXES);
  const isAuthRoute = matchesRoute(pathname, AUTH_ROUTE_PREFIXES);

  if (!user && isProtectedAppRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      normalizeNextPath(
        `${pathname}${request.nextUrl.search ? request.nextUrl.search : ""}`,
      ),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    const next = normalizeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}
