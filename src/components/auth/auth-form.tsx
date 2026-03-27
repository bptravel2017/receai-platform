import Link from "next/link";

import { SubmitButton } from "@/components/auth/submit-button";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  action: (formData: FormData) => void | Promise<void>;
  next?: string;
  status?: {
    kind: "error" | "message";
    text: string;
  } | null;
};

export function AuthForm({ mode, action, next, status }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const alternateHref = isSignUp
    ? next
      ? `/login?next=${encodeURIComponent(next)}`
      : "/login"
    : next
      ? `/sign-up?next=${encodeURIComponent(next)}`
      : "/sign-up";

  return (
    <section className="surface auth-card">
      <div className="stack">
        <p className="eyebrow">{isSignUp ? "Create account" : "Welcome back"}</p>
        <div className="stack auth-copy">
          <h2>{isSignUp ? "Start your ReceAI workspace" : "Sign in to ReceAI v2"}</h2>
          <p className="muted">
            {isSignUp
              ? "Create your account and the first workspace will be provisioned automatically on first authenticated load."
              : "Use your Supabase-backed email login to access the protected workspace shell."}
          </p>
        </div>
      </div>

      {status ? (
        <p className={status.kind === "error" ? "status status-error" : "status status-message"}>
          {status.text}
        </p>
      ) : null}

      <form className="stack auth-form" action={action}>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {isSignUp ? (
          <>
            <label className="field">
              <span>Full name</span>
              <input name="fullName" type="text" autoComplete="name" placeholder="Alex Morgan" />
            </label>

            <label className="field">
              <span>Workspace name</span>
              <input
                name="workspaceName"
                type="text"
                autoComplete="organization"
                placeholder="Alex Studio"
              />
            </label>
          </>
        ) : null}

        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="alex@company.com"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="••••••••"
            required
            minLength={8}
          />
        </label>

        {!isSignUp ? (
          <div className="auth-link-row">
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        ) : null}

        {isSignUp ? (
          <label className="field">
            <span>Confirm password</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </label>
        ) : null}

        <SubmitButton
          idleLabel={isSignUp ? "Create account" : "Sign in"}
          pendingLabel={isSignUp ? "Creating account..." : "Signing in..."}
        />
      </form>

      <p className="muted auth-switch">
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <Link href={alternateHref}>
          {isSignUp ? "Go to sign in" : "Start with sign up"}
        </Link>
      </p>
    </section>
  );
}
