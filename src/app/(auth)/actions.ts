"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { requirePublicAppUrl } from "@/lib/env";
import {
  normalizeNextPath,
  withStatusMessage,
} from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getTrimmedField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signInAction(formData: FormData) {
  const email = getTrimmedField(formData, "email");
  const password = getTrimmedField(formData, "password");
  const next = normalizeNextPath(formData.get("next"));

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect(
        `${withStatusMessage("/login", "error", error.message)}&next=${encodeURIComponent(next)}`,
      );
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      `${withStatusMessage(
        "/login",
        "error",
        error instanceof Error
          ? error.message
          : "Sign-in is unavailable until runtime configuration is fixed.",
        )}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const email = getTrimmedField(formData, "email");
  const password = getTrimmedField(formData, "password");
  const confirmPassword = getTrimmedField(formData, "confirmPassword");
  const fullName = getTrimmedField(formData, "fullName");
  const workspaceName = getTrimmedField(formData, "workspaceName");
  const next = normalizeNextPath(formData.get("next"));

  if (password !== confirmPassword) {
    redirect(
      `${withStatusMessage("/sign-up", "error", "Passwords do not match.")}&next=${encodeURIComponent(next)}`,
    );
  }

  try {
    const appUrl = requirePublicAppUrl();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        data: {
          full_name: fullName,
          workspace_name: workspaceName,
        },
      },
    });

    if (error) {
      redirect(
        `${withStatusMessage("/sign-up", "error", error.message)}&next=${encodeURIComponent(next)}`,
      );
    }

    if (data.session) {
      redirect(next);
    }

    redirect(
      `${withStatusMessage(
        "/login",
        "message",
        "Check your email to confirm your account, then sign in.",
      )}&next=${encodeURIComponent(next)}`,
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      `${withStatusMessage(
        "/sign-up",
        "error",
        error instanceof Error
          ? error.message
          : "Sign-up is unavailable until runtime configuration is fixed.",
      )}&next=${encodeURIComponent(next)}`,
    );
  }
}
