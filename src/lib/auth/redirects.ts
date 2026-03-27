const DEFAULT_AUTH_REDIRECT = "/dashboard/invoices";

export function normalizeNextPath(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || value.length === 0) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return value;
}

export function withStatusMessage(
  path: string,
  key: "error" | "message",
  value: string,
) {
  const searchParams = new URLSearchParams();
  searchParams.set(key, value);
  return `${path}?${searchParams.toString()}`;
}
