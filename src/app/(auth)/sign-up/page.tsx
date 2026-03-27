import type { Metadata } from "next";

import { signUpAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { PageShell } from "@/components/shell/page-shell";
import { normalizeNextPath } from "@/lib/auth/redirects";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Sign up | ReceAI v2",
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Auth"
      title="Sign up"
      description="Create a new ReceAI account and bootstrap the first workspace through the new v2 foundation."
    >
      <AuthForm
        mode="sign-up"
        action={signUpAction}
        next={normalizeNextPath(params.next ?? null)}
        status={status}
      />
    </PageShell>
  );
}
