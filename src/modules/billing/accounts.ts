import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BillingEventType,
  BillingPlan,
  BillingStatus,
  WorkspaceSubscription,
  WorkspaceBillingAccount,
} from "@/modules/billing/types";
import { mapBillingPlanToWorkspacePlan } from "@/modules/billing/types";

function getWorkspacePlanFromBillingState(
  plan: BillingPlan | null | undefined,
  status: BillingStatus,
) {
  if (status === "active" || status === "trialing" || status === "past_due" || status === "unpaid" || status === "paused") {
    return mapBillingPlanToWorkspacePlan(plan) ?? "free";
  }

  return "free" as const;
}

type BillingAccountRow = {
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: BillingPlan | null;
  price_id: string | null;
  status: BillingStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

type WorkspaceSubscriptionRow = {
  id: string;
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string;
  stripe_price_id: string | null;
  plan: BillingPlan | null;
  status: BillingStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingAccountUpsert = {
  workspaceId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan?: BillingPlan | null;
  priceId?: string | null;
  status?: BillingStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
};

export type WorkspaceSubscriptionUpsert = {
  workspaceId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId: string;
  stripePriceId?: string | null;
  plan?: BillingPlan | null;
  status?: BillingStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
};

function toBillingAccount(row: BillingAccountRow): WorkspaceBillingAccount {
  return {
    workspaceId: row.workspace_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    plan: row.plan,
    priceId: row.price_id,
    status: row.status,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toWorkspaceSubscription(row: WorkspaceSubscriptionRow): WorkspaceSubscription {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    plan: row.plan,
    status: row.status,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getWorkspaceBillingSummaryByWorkspaceId(
  workspaceId: string,
  {
    admin = false,
  }: {
    admin?: boolean;
  } = {},
) {
  const supabase = admin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_billing_accounts")
    .select(
      "workspace_id, stripe_customer_id, stripe_subscription_id, plan, price_id, status, current_period_start, current_period_end, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error("We could not load workspace billing right now.");
  }

  return data ? toBillingAccount(data as BillingAccountRow) : null;
}

export async function getWorkspaceBillingAccountByStripeCustomerId(stripeCustomerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workspace_billing_accounts")
    .select(
      "workspace_id, stripe_customer_id, stripe_subscription_id, plan, price_id, status, current_period_start, current_period_end, created_at, updated_at",
    )
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new Error("We could not match that Stripe customer to a workspace.");
  }

  return data ? toBillingAccount(data as BillingAccountRow) : null;
}

export async function upsertWorkspaceBillingAccount(
  values: BillingAccountUpsert,
  {
    admin = false,
  }: {
    admin?: boolean;
  } = {},
) {
  const supabase = admin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const payload = {
    workspace_id: values.workspaceId,
    ...(values.stripeCustomerId === undefined
      ? {}
      : { stripe_customer_id: values.stripeCustomerId }),
    ...(values.stripeSubscriptionId === undefined
      ? {}
      : { stripe_subscription_id: values.stripeSubscriptionId }),
    ...(values.plan === undefined ? {} : { plan: values.plan }),
    ...(values.priceId === undefined ? {} : { price_id: values.priceId }),
    ...(values.status === undefined ? {} : { status: values.status }),
    ...(values.currentPeriodStart === undefined
      ? {}
      : { current_period_start: values.currentPeriodStart }),
    ...(values.currentPeriodEnd === undefined
      ? {}
      : { current_period_end: values.currentPeriodEnd }),
  };

  const { data, error } = await supabase
    .from("workspace_billing_accounts")
    .upsert(payload, { onConflict: "workspace_id" })
    .select(
      "workspace_id, stripe_customer_id, stripe_subscription_id, plan, price_id, status, current_period_start, current_period_end, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error("We could not save workspace billing right now.");
  }

  const workspacePlan = getWorkspacePlanFromBillingState(data.plan, data.status);
  const { error: workspaceError } = await supabase
    .from("workspaces")
    .update({
      plan: workspacePlan,
    })
    .eq("id", values.workspaceId);

  if (workspaceError) {
    throw new Error("Workspace plan could not be synchronized right now.");
  }

  return toBillingAccount(data as BillingAccountRow);
}

export async function getWorkspaceSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string,
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .select(
      "id, workspace_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_start, current_period_end, created_at, updated_at",
    )
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error("We could not load that workspace subscription right now.");
  }

  return data ? toWorkspaceSubscription(data as WorkspaceSubscriptionRow) : null;
}

export async function upsertWorkspaceSubscription(
  values: WorkspaceSubscriptionUpsert,
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .upsert(
      {
        workspace_id: values.workspaceId,
        stripe_customer_id: values.stripeCustomerId ?? null,
        stripe_subscription_id: values.stripeSubscriptionId,
        stripe_price_id: values.stripePriceId ?? null,
        plan: values.plan ?? null,
        status: values.status ?? "not_started",
        current_period_start: values.currentPeriodStart ?? null,
        current_period_end: values.currentPeriodEnd ?? null,
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select(
      "id, workspace_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_start, current_period_end, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error("We could not save workspace subscription state right now.");
  }

  return toWorkspaceSubscription(data as WorkspaceSubscriptionRow);
}

export async function createBillingEvent(args: {
  workspaceId: string;
  eventType: BillingEventType;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeEventId?: string | null;
  stripeEventType?: string | null;
  plan?: BillingPlan | null;
  status?: BillingStatus | null;
  detail?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("billing_events").insert({
    workspace_id: args.workspaceId,
    stripe_customer_id: args.stripeCustomerId ?? null,
    stripe_subscription_id: args.stripeSubscriptionId ?? null,
    stripe_event_id: args.stripeEventId ?? null,
    stripe_event_type: args.stripeEventType ?? null,
    event_type: args.eventType,
    plan: args.plan ?? null,
    status: args.status ?? null,
    detail: args.detail ?? {},
  });

  if (error) {
    throw new Error("Billing event could not be recorded right now.");
  }
}
