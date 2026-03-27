"use client";

import { useMemo, useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getResetRedirectUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  return `${siteUrl}/reset-password`;
}

export function ForgotPasswordForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{
    kind: "error" | "message";
    text: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setToast(null);

    startTransition(async () => {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        setStatus({ kind: "error", text: "Enter your email address." });
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getResetRedirectUrl(),
      });

      if (error) {
        setStatus({ kind: "error", text: error.message });
        return;
      }

      setStatus({
        kind: "message",
        text: "We sent a password reset link if that email exists in ReceAI.",
      });
      setToast("Check your email for reset link");
    });
  }

  return (
    <>
      <section className="surface auth-mobile-card">
        <form className="auth-mobile-form" onSubmit={handleSubmit}>
          {status ? (
            <p className={status.kind === "error" ? "status status-error" : "status status-message"}>
              {status.text}
            </p>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              className="auth-mobile-input"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="alex@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <div className="auth-sticky-action">
            <button className="button-primary auth-full-width-button" type="submit" disabled={isPending}>
              {isPending ? "Sending reset link..." : "Send reset link"}
            </button>
          </div>
        </form>
      </section>

      {toast ? <div className="auth-toast">{toast}</div> : null}
    </>
  );
}
