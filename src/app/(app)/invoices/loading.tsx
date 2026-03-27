export default function InvoicesLoading() {
  return (
    <div className="page stack">
      <section className="surface page-header">
        <p className="eyebrow">Loading</p>
        <h1 className="page-title">Preparing invoices</h1>
        <p className="page-subtitle">
          We are loading workspace invoice lifecycle data and revenue linkage.
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
