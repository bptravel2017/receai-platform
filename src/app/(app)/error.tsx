"use client";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <div className="shell-grid">
      <aside className="sidebar stack">
        <section className="surface sidebar-card stack">
          <div>
            <p className="eyebrow">ReceAI v2</p>
            <h2>Workspace unavailable</h2>
            <p className="muted">
              Bootstrap failed before the protected shell could finish loading.
            </p>
          </div>

          <form action="/auth/sign-out" method="post">
            <button className="button-secondary" type="submit">
              Sign out
            </button>
          </form>
        </section>
      </aside>

      <main className="content">
        <div className="page stack">
          <section className="surface page-header">
            <p className="eyebrow">Bootstrap error</p>
            <h1 className="page-title">We could not finish workspace setup</h1>
            <p className="page-subtitle">
              {error.message ||
                "Something went wrong while loading your profile or workspace."}
            </p>
          </section>

          <section className="surface section stack">
            <button className="button-primary" type="button" onClick={reset}>
              Try again
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
