export default function CostsLoading() {
  return (
    <div className="page stack">
      <section className="surface page-header">
        <p className="eyebrow">Loading</p>
        <h1 className="page-title">Preparing costs</h1>
        <p className="page-subtitle">
          We are loading formal cost records, categories, and linkage choices.
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
