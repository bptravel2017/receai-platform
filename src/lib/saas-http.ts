import { NextResponse } from "next/server";
import { SaaSNotFoundError, SaaSValidationError } from "@/lib/saas-service";
import { SupabaseConfigError, SupabaseConnectionError } from "@/lib/supabase";

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SaaSValidationError("Request body must be valid JSON.");
  }
}

export function success<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, {
    status: 200,
    ...init,
  });
}

export function created<T>(data: T): NextResponse<T> {
  return success(data, { status: 201 });
}

export function fail(error: unknown): NextResponse {
  if (error instanceof SaaSValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error instanceof SaaSNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error instanceof SupabaseConfigError || error instanceof SupabaseConnectionError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  console.error(error);

  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

export function parseSearchParams(url: string): URLSearchParams {
  return new URL(url).searchParams;
}
