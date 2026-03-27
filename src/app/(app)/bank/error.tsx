"use client";

import { useEffect } from "react";

import { PageShell } from "@/components/shell/page-shell";

type BankErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function BankErrorPage({ error, reset }: BankErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell
      eyebrow="Bank"
      title="We could not load bank reconciliation"
      description="Something went wrong while loading the bank import and reconciliation module."
    >
      <section className="surface section stack">
        <p className="status status-error">
          {error.message || "Something went wrong while loading the bank module."}
        </p>
        <button className="button-primary" type="button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </PageShell>
  );
}
