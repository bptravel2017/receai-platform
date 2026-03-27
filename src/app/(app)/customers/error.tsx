"use client";

type CustomersErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CustomersError({
  error,
  reset,
}: CustomersErrorProps) {
  return (
    <div className="page stack">
      <section className="surface page-header">
        <p className="eyebrow">Customers error</p>
        <h1 className="page-title">We could not load customers</h1>
        <p className="page-subtitle">
          {error.message || "Something went wrong while loading the customers module."}
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
