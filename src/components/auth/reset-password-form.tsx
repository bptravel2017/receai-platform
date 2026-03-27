"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SessionState = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [status, setStatus] = useState<{
    kind: "error" | "message";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function initializeRecoverySession() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const recoveryType = hash.get("type");

      if (recoveryType === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          window.history.replaceState({}, document.title, window.location.pathname);

          if (isMounted) {
            setSessionState("ready");
            setStatus(null);
          }

          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (session) {
        setSessionState("ready");
        setStatus(null);
        return;
      }

      setSessionState("invalid");
      setStatus({ kind: "error", text: "Invalid or expired link" });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setSessionState("ready");
        setStatus(null);
      }
    });

    void initializeRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      if (sessionState !== "ready") {
        setStatus({ kind: "error", text: "Invalid or expired link" });
        return;
      }

      if (newPassword.length < 8) {
        setStatus({
          kind: "error",
          text: "Password must be at least 8 characters.",
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        setStatus({ kind: "error", text: "Passwords do not match." });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setStatus({ kind: "error", text: error.message });
        return;
      }

      await supabase.auth.signOut();
      router.push("/login?message=Password+updated");
      router.refresh();
    });
  }

  return (
    <section className="surface auth-mobile-card">
      <form className="auth-mobile-form" onSubmit={handleSubmit}>
        {sessionState === "checking" ? (
          <p className="status status-message">Checking reset link...</p>
        ) : null}

        {status ? (
          <p className={status.kind === "error" ? "status status-error" : "status status-message"}>
            {status.text}
          </p>
        ) : null}

        <label className="field">
          <span>New password</span>
          <input
            className="auth-mobile-input"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            disabled={sessionState !== "ready"}
            required
          />
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input
            className="auth-mobile-input"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            disabled={sessionState !== "ready"}
            required
          />
        </label>

        <div className="auth-sticky-action">
          <button
            className="button-primary auth-full-width-button"
            type="submit"
            disabled={isPending || sessionState !== "ready"}
          >
            {isPending ? "Updating password..." : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}
