import type { ReactNode } from "react";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { canAccessFeature } from "@/modules/plans/access";
import { FeatureGateNotice } from "@/modules/plans/components/feature-gate-notice";

export default async function CostsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireAuthenticatedAppContext();

  if (!canAccessFeature(context.workspace.plan, "cost")) {
    return (
      <FeatureGateNotice
        eyebrow="Costs"
        title="Costs"
        description="Internal cost tracking for Daytime, customer, group, and overhead."
        requiredPlan="pro"
      />
    );
  }

  return children;
}
