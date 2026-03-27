"use client";

type RevenueErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RevenueError({
  error,
  reset,
}: RevenueErrorProps) {
  return (
    <div className="page stack">
      <section className="surface page-header">
        <p className="eyebrow">Revenue error</p>
        <h1 className="page-title">We could not load revenue</h1>
        <p className="page-subtitle">
          {error.message || "Something went wrong while loading the revenue module."}
        </p>
      </section>

      <section className="surface section stack">
        <button className="button-primary" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </div>
  );
}
