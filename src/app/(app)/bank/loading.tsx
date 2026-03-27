import { PageShell } from "@/components/shell/page-shell";

export default function BankLoading() {
  return (
    <PageShell
      eyebrow="Bank"
      title="Preparing bank reconciliation"
      description="Loading bank imports, transactions, and reconciliation data."
    >
      <section className="surface section stack">
        <div className="loading-block loading-block-title" />
        <div className="loading-block loading-block-text" />
        <div className="loading-block loading-block-text" />
      </section>
    </PageShell>
  );
}
