"use client";

import { useEffect } from "react";

import { PageShell } from "@/components/shell/page-shell";

type ProfitErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProfitErrorPage({
  error,
  reset,
}: ProfitErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell
      eyebrow="Profit"
      title="We could not load profit reporting"
      description="Something went wrong while loading the workspace profit module."
    >
      <section className="surface section stack">
        <p className="status status-error">
          {error.message || "Something went wrong while loading profit reporting."}
        </p>
        <button className="button-primary" type="button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </PageShell>
  );
}
