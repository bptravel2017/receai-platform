import type { ReactNode } from "react";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { canAccessFeature } from "@/modules/plans/access";
import { FeatureGateNotice } from "@/modules/plans/components/feature-gate-notice";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireAuthenticatedAppContext();

  if (!canAccessFeature(context.workspace.plan, "dashboard")) {
    return (
      <FeatureGateNotice
        eyebrow="Dashboard"
        title="Dashboard"
        description="Daily operations and management visibility in one place."
        requiredPlan="business"
      />
    );
  }

  return children;
}
