"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertPlanAccess } from "@/modules/plans/access";

function getTrimmedField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithStatus(
  path: string,
  key: "error" | "message",
  value: string,
) {
  const searchParams = new URLSearchParams();
  searchParams.set(key, value);
  redirect(`${path}?${searchParams.toString()}`);
}

function slugifyWorkspace(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updateProfileSettingsAction(formData: FormData) {
  const fullName = getTrimmedField(formData, "fullName");
  const context = await requireAuthenticatedAppContext();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      email: context.user.email,
      default_workspace_id: context.workspace.id,
    })
    .eq("id", context.user.id);

  if (error) {
    redirectWithStatus(
      "/settings/profile",
      "error",
      "We could not save your profile changes.",
    );
  }

  redirectWithStatus(
    "/settings/profile",
    "message",
    "Profile settings updated.",
  );
}

export async function updateWorkspaceSettingsAction(formData: FormData) {
  const name = getTrimmedField(formData, "name");
  const rawSlug = getTrimmedField(formData, "slug");
  const replyToEmail = getTrimmedField(formData, "replyToEmail");
  const context = await requireAuthenticatedAppContext();

  try {
    assertPlanAccess(context, "company_settings");
  } catch {
    redirectWithStatus(
      "/settings/workspace",
      "error",
      "This feature is available in Pro / Business plan.",
    );
  }

  if (name.length < 2) {
    redirectWithStatus(
      "/settings/workspace",
      "error",
      "Workspace name must be at least 2 characters.",
    );
  }

  const slug = slugifyWorkspace(rawSlug);

  if (slug.length < 2) {
    redirectWithStatus(
      "/settings/workspace",
      "error",
      "Workspace URL slug must include letters or numbers.",
    );
  }

  if (replyToEmail && !isValidEmail(replyToEmail)) {
    redirectWithStatus(
      "/settings/workspace",
      "error",
      "Reply-to email must be a valid email address.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("workspaces")
    .update({
      name,
      slug,
      reply_to_email: replyToEmail || null,
    })
    .eq("id", context.workspace.id);

  if (error) {
    const message =
      error.code === "23505"
        ? "That workspace URL is already in use."
        : "We could not save your workspace changes.";

    redirectWithStatus("/settings/workspace", "error", message);
  }

  redirectWithStatus(
    "/settings/workspace",
    "message",
    "Workspace settings updated.",
  );
}
