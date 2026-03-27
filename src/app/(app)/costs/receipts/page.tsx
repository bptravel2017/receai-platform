import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { ReceiptIntakeCreateForm } from "@/modules/cost-receipts/components/receipt-intake-create-form";
import { ReceiptIntakeList } from "@/modules/cost-receipts/components/receipt-intake-list";
import { ReceiptStatusBanner } from "@/modules/cost-receipts/components/receipt-status-banner";
import { getCostReceiptsList } from "@/modules/cost-receipts/receipts";

type CostReceiptsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function CostReceiptsPage({
  searchParams,
}: CostReceiptsPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const data = await getCostReceiptsList(context);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Costs"
      title="Receipt Intake"
      description="Separate receipt intake records that can later post into formal costs."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Receipts</p>
          <h2 className="section-title">Receipt intake</h2>
          <p className="muted">
            Keep receipt collection, review, classification, and posting separate from
            formal cost records.
          </p>
        </div>

        <div className="cost-link-row">
          <Link className="link-pill" href="/costs">
            Back to costs
          </Link>
          <Link className="link-pill" href="/cost-categories">
            Cost categories
          </Link>
        </div>
      </section>

      <ReceiptStatusBanner status={status} />

      <section className="grid members-layout-grid">
        <ReceiptIntakeList
          receipts={data.receipts}
          canManageCostReceipts={data.canManageCostReceipts}
        />
        <ReceiptIntakeCreateForm
          canManageCostReceipts={data.canManageCostReceipts}
        />
      </section>
    </PageShell>
  );
}
