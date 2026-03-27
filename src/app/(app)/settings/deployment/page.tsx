import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { getDeploymentReadinessData } from "@/modules/settings/deployment-readiness";

function formatCheckedAt(value: string) {
  return new Date(value).toLocaleString();
}

function statusLabel(value: "ready" | "missing" | "invalid" | "warning") {
  return value.replace("_", " ");
}

export default async function DeploymentReadinessPage() {
  const context = await requireAuthenticatedAppContext();
  const { report, releaseChecklist, acceptanceChecklist } =
    getDeploymentReadinessData();

  return (
    <PageShell
      eyebrow="Settings"
      title="Deployment Readiness"
      description="Review production config health, launch guardrails, and manual acceptance checks before treating ReceAI v2 as production-ready."
    >
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Runtime audit</p>
          <h2 className="section-title">Config boundary status</h2>
          <p className="muted">
            This page is read-only. It reports whether the deployed runtime appears
            ready for Supabase, platform invoice email, Stripe boundary setup, and
            public URL assumptions.
          </p>
          <p className="muted">
            <strong>Checked:</strong> {formatCheckedAt(report.checkedAt)}
          </p>
          <p className="muted">
            <strong>Workspace:</strong> {context.workspace.name}
          </p>
        </div>

        <div className="grid grid-2">
          {report.sections.map((section) => (
            <article className="surface revenue-line-items-note stack" key={section.id}>
              <div className="customer-card-header">
                <div className="stack stack-tight">
                  <strong>{section.title}</strong>
                  <span className="muted">{section.summary}</span>
                </div>
                <span className={`role-badge readiness-status-${section.status}`}>
                  {statusLabel(section.status)}
                </span>
              </div>

              <div className="stack stack-tight">
                {section.checks.map((check) => (
                  <div className="surface customer-notes-panel stack stack-tight" key={check.key}>
                    <div className="customer-card-header">
                      <strong>{check.label}</strong>
                      <span className={`role-badge readiness-status-${check.status}`}>
                        {statusLabel(check.status)}
                      </span>
                    </div>
                    <p className="muted">
                      <strong>{check.key}</strong>
                    </p>
                    <p className="muted">{check.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-2">
        <article className="surface section stack">
          <div className="stack stack-tight">
            <p className="eyebrow">Release checklist</p>
            <h2 className="section-title">Operator launch steps</h2>
          </div>

          <div className="stack">
            {releaseChecklist.map((section) => (
              <section className="surface revenue-line-items-note stack" key={section.title}>
                <strong>{section.title}</strong>
                <div className="stack stack-tight">
                  {section.items.map((item) => (
                    <div key={item.title}>
                      <p className="muted">
                        <strong>{item.title}</strong>
                      </p>
                      <p className="muted">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <article className="surface section stack">
          <div className="stack stack-tight">
            <p className="eyebrow">Acceptance checklist</p>
            <h2 className="section-title">Manual pre-launch verification</h2>
          </div>

          <div className="stack">
            {acceptanceChecklist.map((section) => (
              <section className="surface revenue-line-items-note stack" key={section.title}>
                <strong>{section.title}</strong>
                <div className="stack stack-tight">
                  {section.items.map((item) => (
                    <div key={item.title}>
                      <p className="muted">
                        <strong>{item.title}</strong>
                      </p>
                      <p className="muted">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}
