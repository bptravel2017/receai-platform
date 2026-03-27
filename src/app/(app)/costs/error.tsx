"use client";

type CostsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CostsError({ error, reset }: CostsErrorProps) {
  return (
    <div className="page stack">
      <section className="surface page-header">
        <p className="eyebrow">Costs error</p>
        <h1 className="page-title">We could not load costs</h1>
        <p className="page-subtitle">
          {error.message || "Something went wrong while loading the costs module."}
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
