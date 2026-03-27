"use client";

import { useState } from "react";

type PricingCheckoutButtonProps = {
  plan: "pro" | "business";
  label?: string;
  className?: string;
};

const CHECKOUT_ERROR_MESSAGE =
  "Payment setup error. Please try again in a moment or contact support.";

export function PricingCheckoutButton({
  plan,
  label,
  className,
}: PricingCheckoutButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/create-upgrade-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
        }),
      });

      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/pricing")}`;
        return;
      }

      const body = (await response.json()) as
        | {
            ok: true;
            data: {
              url: string;
            };
          }
        | {
            ok: false;
            error?: {
              code?: string;
              message?: string;
            };
          };

      if (!response.ok || !body.ok) {
        throw new Error(
          !body.ok && body.error?.code === "validation_error"
            ? body.error.message
            : CHECKOUT_ERROR_MESSAGE,
        );
      }

      window.location.href = body.data.url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : CHECKOUT_ERROR_MESSAGE,
      );
      setPending(false);
    }
  }

  return (
    <div className="billing-action-stack">
      <button
        className={className ?? "button-accent billing-full-width-button"}
        type="button"
        disabled={pending}
        onClick={handleCheckout}
      >
        {pending ? "Opening checkout..." : (label ?? "Choose plan")}
      </button>
      {error ? <p className="status status-error">{error}</p> : null}
    </div>
  );
}
