"use client";

import Link from "next/link";
import { useId } from "react";

type GuestSignupModalProps = {
  open: boolean;
  onClose: () => void;
  nextPath?: string;
  message?: string;
};

export function GuestSignupModal({
  open,
  onClose,
  nextPath = "/dashboard",
  message = "Create a free account to save your work",
}: GuestSignupModalProps) {
  const titleId = useId();
  const signupHref = `/sign-up?next=${encodeURIComponent(nextPath)}`;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  if (!open) {
    return null;
  }

  return (
    <div className="billing-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="surface section stack billing-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="stack stack-tight">
          <p className="eyebrow">Guest mode</p>
          <h2 className="section-title" id={titleId}>
            {message}
          </h2>
          <p className="muted">
            You can try the workflow without signing up, but account-only actions stay
            locked until you create a free workspace.
          </p>
        </div>

        <div className="guest-modal-actions">
          <Link className="button-primary billing-full-width-button" href={signupHref}>
            Create free account
          </Link>
          <Link className="button-secondary billing-full-width-button" href={loginHref}>
            Sign in
          </Link>
          <button
            className="button-secondary billing-full-width-button"
            type="button"
            onClick={onClose}
          >
            Continue in guest mode
          </button>
        </div>
      </div>
    </div>
  );
}
