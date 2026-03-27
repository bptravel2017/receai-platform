import { PageShell } from "@/components/shell/page-shell";

export default function CostReceiptsLoading() {
  return (
    <PageShell
      eyebrow="Costs"
      title="Preparing receipt intake"
      description="Loading receipt intake records and cost-link classification data."
    >
      <section className="surface section stack">
        <div className="loading-block loading-block-title" />
        <div className="loading-block loading-block-text" />
        <div className="loading-block loading-block-text" />
      </section>
    </PageShell>
  );
}
