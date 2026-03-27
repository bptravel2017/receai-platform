import { PageShell } from "@/components/shell/page-shell";

export default function ProfitLoading() {
  return (
    <PageShell
      eyebrow="Profit"
      title="Preparing profit report"
      description="Loading workspace revenue, invoice, and cost aggregates."
    >
      <section className="surface section stack">
        <div className="loading-block loading-block-title" />
        <div className="loading-block loading-block-text" />
        <div className="loading-block loading-block-text" />
      </section>
    </PageShell>
  );
}
