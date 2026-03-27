"use client";

import { useState } from "react";

export function BillingPortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePortal() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
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
              message?: string;
            };
          };

      if (!response.ok || !body.ok) {
        throw new Error(body.ok ? "Billing portal is unavailable." : body.error?.message);
      }

      window.location.href = body.data.url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Billing portal is unavailable right now.",
      );
      setPending(false);
    }
  }

  return (
    <div className="billing-action-stack">
      <button
        className="button-primary billing-full-width-button"
        type="button"
        disabled={pending}
        onClick={handlePortal}
      >
        {pending ? "Opening billing..." : "Manage billing"}
      </button>
      {error ? <p className="status status-error">{error}</p> : null}
    </div>
  );
}
