export default function AppLoading() {
  return (
    <div className="shell-grid">
      <aside className="sidebar stack">
        <section className="surface sidebar-card stack">
          <p className="eyebrow">ReceAI v2</p>
          <div className="loading-block loading-block-title" />
          <div className="loading-block loading-block-text" />
          <div className="loading-block loading-block-text" />
        </section>
      </aside>

      <main className="content">
        <div className="page stack">
          <section className="surface page-header">
            <p className="eyebrow">Loading</p>
            <h1 className="page-title">Preparing your workspace</h1>
            <p className="page-subtitle">
              We are checking your session, profile, and workspace membership.
            </p>
          </section>

          <section className="surface section stack">
            <div className="loading-block loading-block-title" />
            <div className="loading-block loading-block-text" />
            <div className="loading-block loading-block-text" />
          </section>
        </div>
      </main>
    </div>
  );
}
