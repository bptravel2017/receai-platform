export default function CustomersLoading() {
  return (
    <div className="page stack">
      <section className="surface page-header">
        <p className="eyebrow">Loading</p>
        <h1 className="page-title">Preparing customers</h1>
        <p className="page-subtitle">
          We are loading workspace customer records and access rules.
        </p>
      </section>

      <section className="surface section stack">
        <div className="loading-block loading-block-title" />
        <div className="loading-block loading-block-text" />
        <div className="loading-block loading-block-text" />
      </section>
    </div>
  );
}
