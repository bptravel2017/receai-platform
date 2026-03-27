import type { AuthenticatedAppContext } from "@/lib/auth/types";
import type { PlanFeature, WorkspacePlan } from "@/modules/plans/types";

const PLAN_ORDER: Record<WorkspacePlan, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

const FEATURE_MIN_PLAN: Record<PlanFeature, WorkspacePlan> = {
  receipt_save: "pro",
  invoice: "pro",
  customers: "pro",
  company_settings: "pro",
  daytime: "pro",
  cost: "pro",
  payables_basic: "pro",
  payables_bulk: "business",
  profit: "business",
  dashboard: "business",
  multi_user: "business",
};

export class FeatureAccessError extends Error {
  feature: PlanFeature;
  requiredPlan: WorkspacePlan;
  currentPlan: WorkspacePlan;
  status: number;

  constructor(args: {
    feature: PlanFeature;
    requiredPlan: WorkspacePlan;
    currentPlan: WorkspacePlan;
  }) {
    super(
      args.requiredPlan === "business"
        ? "This feature is available in Business plan."
        : "This feature is available in Pro / Business plan.",
    );
    this.name = "FeatureAccessError";
    this.feature = args.feature;
    this.requiredPlan = args.requiredPlan;
    this.currentPlan = args.currentPlan;
    this.status = 403;
  }
}

export function getRequiredPlanForFeature(feature: PlanFeature): WorkspacePlan {
  return FEATURE_MIN_PLAN[feature];
}

export function canAccessFeature(plan: WorkspacePlan, feature: PlanFeature) {
  return PLAN_ORDER[plan] >= PLAN_ORDER[FEATURE_MIN_PLAN[feature]];
}

export function assertCanAccessFeature(plan: WorkspacePlan, feature: PlanFeature) {
  const requiredPlan = getRequiredPlanForFeature(feature);

  if (canAccessFeature(plan, feature)) {
    return;
  }

  throw new FeatureAccessError({
    feature,
    requiredPlan,
    currentPlan: plan,
  });
}

export function assertPlanAccess(
  context: AuthenticatedAppContext,
  feature: PlanFeature,
) {
  assertCanAccessFeature(context.workspace.plan, feature);
}
