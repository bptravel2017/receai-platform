import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { UsageLimitNotice } from "@/modules/billing/components/usage-limit-notice";
import { checkUsageLimit } from "@/modules/billing/usage";
import { RevenueForm } from "@/modules/revenue/components/revenue-form";
import { RevenueStatusBanner } from "@/modules/revenue/components/revenue-status-banner";
import {
  getRevenueEditorData,
  getRevenueFormDefaults,
} from "@/modules/revenue/revenue";

type NewRevenuePageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function NewRevenuePage({
  searchParams,
}: NewRevenuePageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const [editorData, usage] = await Promise.all([
    getRevenueEditorData(context),
    checkUsageLimit(context.workspace.id, "daytime_created"),
  ]);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <div className="daytime-route">
      <RevenueStatusBanner status={status} />
      {usage.plan === "free" && usage.limit !== null ? (
        <UsageLimitNotice
          used={usage.used}
          limit={usage.limit}
          label="entries this month"
          exceeded={!usage.allowed}
        />
      ) : null}
      <RevenueForm
        mode="create"
        context={context}
        customers={editorData.customers}
        groups={editorData.groups}
        fulfillmentParties={editorData.fulfillmentParties}
        values={getRevenueFormDefaults()}
      />
    </div>
  );
}
