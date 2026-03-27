import { PageShell } from "@/components/shell/page-shell";
import { RoutePlaceholder } from "@/components/shell/route-placeholder";

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Public site"
      title="Privacy"
      description="Legal route scaffold for future privacy policy content."
    >
      <RoutePlaceholder
        moduleName="Privacy"
        summary="Reserved for the finalized privacy policy once product data flows are defined."
        nextSteps={[
          "Document data collection boundaries.",
          "Map retention and deletion policies.",
          "Publish policy after auth and billing flows stabilize.",
        ]}
      />
    </PageShell>
  );
}
