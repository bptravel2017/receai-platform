import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password | ReceAI v2",
};

export default function ForgotPasswordPage() {
  return (
    <div className="auth-mobile-page">
      <div className="stack stack-tight">
        <p className="eyebrow">Auth</p>
        <h1 className="section-title">Reset Password</h1>
        <p className="muted">
          Enter the email tied to your ReceAI account and we will send you a reset link.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
