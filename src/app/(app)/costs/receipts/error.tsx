"use client";

import { useEffect } from "react";

import { PageShell } from "@/components/shell/page-shell";

type CostReceiptsErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CostReceiptsErrorPage({
  error,
  reset,
}: CostReceiptsErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell
      eyebrow="Costs"
      title="We could not load receipt intake"
      description="Something went wrong while loading receipt intake for this workspace."
    >
      <section className="surface section stack">
        <p className="status status-error">
          {error.message ||
            "Something went wrong while loading the receipt intake module."}
        </p>
        <button className="button-primary" type="button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </PageShell>
  );
}
