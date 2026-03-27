"use client";

type InvoicesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function InvoicesError({
  error,
  reset,
}: InvoicesErrorProps) {
  return (
    <div className="page stack">
      <section className="surface page-header">
        <p className="eyebrow">Invoices error</p>
        <h1 className="page-title">We could not load invoices</h1>
        <p className="page-subtitle">
          {error.message || "Something went wrong while loading the invoices module."}
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
