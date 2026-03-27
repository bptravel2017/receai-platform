import type { ReactNode } from "react";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { canAccessFeature } from "@/modules/plans/access";
import { FeatureGateNotice } from "@/modules/plans/components/feature-gate-notice";

export default async function PayablesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireAuthenticatedAppContext();

  if (!canAccessFeature(context.workspace.plan, "payables_basic")) {
    return (
      <FeatureGateNotice
        eyebrow="Payables"
        title="Payables"
        description="See who to pay, how much is still unpaid, and mark payout costs done."
        requiredPlan="pro"
      />
    );
  }

  return children;
}
