import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/auth/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/revenue/:path*",
    "/invoices/:path*",
    "/costs/:path*",
    "/cost-categories/:path*",
    "/profit/:path*",
    "/bank/:path*",
    "/billing/:path*",
    "/settings/:path*",
    "/login",
    "/sign-in",
    "/sign-up",
  ],
};
