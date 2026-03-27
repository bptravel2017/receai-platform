type RoutePlaceholderProps = {
  moduleName: string;
  summary: string;
  nextSteps: string[];
};

export function RoutePlaceholder({
  moduleName,
  summary,
  nextSteps,
}: RoutePlaceholderProps) {
  return (
    <section className="surface section stack">
      <div className="stack">
        <h2>{moduleName} scaffold</h2>
        <p className="muted">{summary}</p>
      </div>

      <div className="grid grid-2">
        <article className="surface section">
          <p className="eyebrow">Status</p>
          <p className="muted">
            Route shell only. No queries, mutations, auth policies, or business
            workflows are implemented yet.
          </p>
        </article>

        <article className="surface section">
          <p className="eyebrow">Next</p>
          <ul className="link-list">
            {nextSteps.map((step) => (
              <li key={step} className="muted">
                {step}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
