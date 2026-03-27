import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password | ReceAI v2",
};

export default function ResetPasswordPage() {
  return (
    <div className="auth-mobile-page">
      <div className="stack stack-tight">
        <p className="eyebrow">Auth</p>
        <h1 className="section-title">Reset Password</h1>
        <p className="muted">
          Choose a new password for your ReceAI account after opening the secure email link.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
