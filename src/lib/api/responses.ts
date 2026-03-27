import { NextResponse } from "next/server";

type ApiErrorShape = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status },
  );
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorShape = {
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };

  return NextResponse.json(body, { status });
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}
