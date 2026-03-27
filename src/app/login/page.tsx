import type { Metadata } from "next";

import { signInAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { PageShell } from "@/components/shell/page-shell";
import { normalizeNextPath } from "@/lib/auth/redirects";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Login | ReceAI v2",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Auth"
      title="Login"
      description="Sign in with your Supabase email and password to access the protected ReceAI workspace."
    >
      <AuthForm
        mode="sign-in"
        action={signInAction}
        next={normalizeNextPath(params.next ?? null)}
        status={status}
      />
    </PageShell>
  );
}
