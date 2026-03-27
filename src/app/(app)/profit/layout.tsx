import type { ReactNode } from "react";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { canAccessFeature } from "@/modules/plans/access";
import { FeatureGateNotice } from "@/modules/plans/components/feature-gate-notice";

export default async function ProfitLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireAuthenticatedAppContext();

  if (!canAccessFeature(context.workspace.plan, "profit")) {
    return (
      <FeatureGateNotice
        eyebrow="Profit"
        title="Profit Dashboard"
        description="Operational profit reporting built from Daytime revenue and internal costs."
        requiredPlan="business"
      />
    );
  }

  return children;
}
