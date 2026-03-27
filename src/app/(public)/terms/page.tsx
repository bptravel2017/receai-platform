import { PageShell } from "@/components/shell/page-shell";
import { RoutePlaceholder } from "@/components/shell/route-placeholder";

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Public site"
      title="Terms"
      description="Legal route scaffold for future terms of service."
    >
      <RoutePlaceholder
        moduleName="Terms"
        summary="Reserved for product usage terms, billing language, and support commitments."
        nextSteps={[
          "Draft subscription and cancellation terms.",
          "Define liability and acceptable use language.",
          "Publish once billing behavior is finalized.",
        ]}
      />
    </PageShell>
  );
}
