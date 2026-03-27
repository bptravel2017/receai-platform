import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspacePlan } from "@/modules/plans/types";

export type UsageLogEventType =
  | "invoice_sent"
  | "receipt_created"
  | "daytime_created"
  | "invoice_created"
  | "customer_created"
  | "group_created";

export type LimitedUsageEventType =
  | "daytime_created"
  | "invoice_created"
  | "customer_created"
  | "group_created";

export type UsageLimitStatus = {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number | null;
  plan: WorkspacePlan;
  period: string;
};

export class UsageLimitError extends Error {
  eventType: LimitedUsageEventType;
  limit: number;
  used: number;
  remaining: number;
  status: number;

  constructor(args: {
    eventType: LimitedUsageEventType;
    limit: number;
    used: number;
    remaining: number;
  }) {
    super("Limit reached. Upgrade to Pro to continue.");
    this.name = "UsageLimitError";
    this.eventType = args.eventType;
    this.limit = args.limit;
    this.used = args.used;
    this.remaining = args.remaining;
    this.status = 403;
  }
}

const FREE_USAGE_LIMITS: Record<LimitedUsageEventType, number> = {
  daytime_created: 20,
  invoice_created: 10,
  customer_created: 5,
  group_created: 3,
};

type WorkspacePlanRow = {
  plan: WorkspacePlan;
};

function getCurrentUsagePeriod(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

async function getWorkspacePlan(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Workspace plan could not be loaded.");
  }

  return (data as WorkspacePlanRow).plan;
}

async function getMonthlyUsageCount(
  workspaceId: string,
  eventType: UsageLogEventType,
  period: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("usage_logs")
    .select("count")
    .eq("workspace_id", workspaceId)
    .eq("event_type", eventType)
    .eq("period", period);

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((sum, row) => {
    const count = typeof row.count === "number" ? row.count : 0;
    return sum + count;
  }, 0);
}

async function getWorkspaceRecordCount(
  workspaceId: string,
  table: "customers" | "groups",
) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("workspace_id", workspaceId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getUsageCountForLimitedEvent(
  workspaceId: string,
  eventType: LimitedUsageEventType,
  period: string,
) {
  if (eventType === "customer_created") {
    return getWorkspaceRecordCount(workspaceId, "customers");
  }

  if (eventType === "group_created") {
    return getWorkspaceRecordCount(workspaceId, "groups");
  }

  return getMonthlyUsageCount(workspaceId, eventType, period);
}

export async function getWorkspaceUsageCount(
  workspaceId: string,
  eventType: UsageLogEventType,
  period = getCurrentUsagePeriod(),
) {
  return getMonthlyUsageCount(workspaceId, eventType, period);
}

export async function logWorkspaceUsage(
  workspaceId: string,
  eventType: UsageLogEventType,
  count = 1,
) {
  const supabase = await createSupabaseServerClient();
  const period = getCurrentUsagePeriod();
  const { error } = await supabase.from("usage_logs").insert({
    workspace_id: workspaceId,
    type: eventType === "invoice_sent" ? "invoice_sent" : null,
    event_type: eventType,
    count,
    period,
  });

  if (error) {
    throw error;
  }
}

export async function checkUsageLimit(
  workspaceId: string,
  eventType: LimitedUsageEventType,
): Promise<UsageLimitStatus> {
  const plan = await getWorkspacePlan(workspaceId);
  const period = getCurrentUsagePeriod();

  if (plan !== "free") {
    return {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      used: 0,
      limit: null,
      plan,
      period,
    };
  }

  const limit = FREE_USAGE_LIMITS[eventType];
  const used = await getUsageCountForLimitedEvent(workspaceId, eventType, period);
  const remaining = Math.max(limit - used, 0);

  return {
    allowed: used < limit,
    remaining,
    used,
    limit,
    plan,
    period,
  };
}

export async function assertUsageAllowed(
  workspaceId: string,
  eventType: LimitedUsageEventType,
) {
  const status = await checkUsageLimit(workspaceId, eventType);

  if (!status.allowed && status.limit !== null) {
    throw new UsageLimitError({
      eventType,
      limit: status.limit,
      used: status.used,
      remaining: status.remaining,
    });
  }

  return status;
}
