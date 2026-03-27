import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { CostForm } from "@/modules/costs/components/cost-form";
import { CostStatusBanner } from "@/modules/costs/components/cost-status-banner";
import { getCostById, getCostFormDefaults } from "@/modules/costs/costs";

type CostDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export default async function CostDetailPage({
  params,
  searchParams,
}: CostDetailPageProps) {
  const [{ id }, context, query] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const result = await getCostById(context, id);

  if (!result) {
    notFound();
  }

  const { cost, editorData, canManageCosts } = result;
  const status = query.error
    ? { kind: "error" as const, text: query.error }
    : query.message
      ? { kind: "message" as const, text: query.message }
      : null;

  return (
    <PageShell
      eyebrow="Costs"
      title={cost.costName}
      description="Internal cost detail and editing view inside the current workspace."
    >
      <section className="grid customer-detail-grid">
        <article className="surface section stack">
          <div className="stack stack-tight">
            <div className="cost-link-row">
              <Link className="link-pill" href="/costs">
                Back to costs
              </Link>
              <Link className="link-pill" href="/payables">
                Payables
              </Link>
            </div>
            <p className="eyebrow">Summary</p>
            <h2 className="section-title">{cost.costName}</h2>
            <p className="muted">{cost.description || "No description"}</p>
          </div>

          <div className="stack customer-meta-list">
            <p className="muted">
              <strong>Type:</strong> {cost.costType}
            </p>
            <p className="muted">
              <strong>Cost date:</strong> {cost.costDate}
            </p>
            <p className="muted">
              <strong>Amount:</strong>{" "}
              {formatAmount(cost.amountCents, cost.currency)}
            </p>
            <p className="muted">
              <strong>Payment status:</strong> {cost.paymentStatus}
            </p>
            <p className="muted">
              <strong>Customer:</strong> {cost.customerName || "No customer link"}
            </p>
            <p className="muted">
              <strong>Daytime entry:</strong>{" "}
              {cost.revenueSummary || "No revenue link"}
            </p>
            <p className="muted">
              <strong>Group:</strong> {cost.groupName || "No group link"}
            </p>
            <p className="muted">
              <strong>Vendor:</strong> {cost.vendorName || "Not set"}
            </p>
            <p className="muted">
              <strong>Driver:</strong> {cost.driverName || "Not set"}
            </p>
            <p className="muted">
              <strong>Guide:</strong> {cost.guideName || "Not set"}
            </p>
          </div>

          <div className="surface revenue-line-items-note">
            <p className="eyebrow">Internal notes</p>
            <p className="muted">
              {cost.notesInternal?.trim() || "No internal notes yet."}
            </p>
          </div>

          {!canManageCosts ? (
            <p className="status status-message">
              You can view this cost, but only workspace owners and admins can edit it.
            </p>
          ) : null}
        </article>

        <div className="stack">
          <CostStatusBanner status={status} />
          <CostForm
            mode="edit"
            context={context}
            editorData={editorData}
            cost={cost}
            values={getCostFormDefaults(cost)}
          />
        </div>
      </section>
    </PageShell>
  );
}
