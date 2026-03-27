import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { createRevenueCostAction } from "@/modules/costs/actions";
import { getCostsEditorData, getCostsByRevenueId, getRevenueCostSummary } from "@/modules/costs/costs";
import { getInvoiceById, getInvoiceByRevenueRecordId } from "@/modules/invoices/invoices";
import { RevenueForm } from "@/modules/revenue/components/revenue-form";
import { RevenueStatusBanner } from "@/modules/revenue/components/revenue-status-banner";
import { getRevenueById, getRevenueFormDefaults } from "@/modules/revenue/revenue";

type RevenueDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export default async function RevenueDetailPage({
  params,
  searchParams,
}: RevenueDetailPageProps) {
  const [{ id }, context, query] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const result = await getRevenueById(context, id);

  if (!result) {
    notFound();
  }

  const [linkedInvoice, revenueCosts, costEditorData, profitSummary] = await Promise.all([
    result.revenue.invoiceId
      ? getInvoiceById(context, result.revenue.invoiceId).then((value) => value?.invoice ?? null)
      : getInvoiceByRevenueRecordId(context, id),
    getCostsByRevenueId(context, id),
    getCostsEditorData(context),
    getRevenueCostSummary(context, id, result.revenue.amountCents),
  ]);

  const { revenue, customers, fulfillmentParties, canManageRevenue } = result;
  const status = query.error
    ? { kind: "error" as const, text: query.error }
    : query.message
      ? { kind: "message" as const, text: query.message }
      : null;

  return (
    <PageShell
      eyebrow="Daytime"
      title={revenue.groupName?.trim() || revenue.customerName}
      description="Daytime entry detail inside the current workspace."
    >
      <section className="grid customer-detail-grid">
        <article className="surface section stack">
          <div className="stack stack-tight">
            <Link className="link-pill" href="/revenue">
              Back to Daytime
            </Link>
            <p className="eyebrow">Summary</p>
            <h2 className="section-title">
              {revenue.groupName?.trim() || revenue.customerName}
            </h2>
            <p className="muted">
              Linked customer:{" "}
              <Link href={`/customers/${revenue.customerId}`}>{revenue.customerName}</Link>
            </p>
          </div>

          <div className="stack customer-meta-list">
            <p className="muted">
              <strong>Revenue:</strong> {formatAmount(revenue.amountCents, revenue.currency)}
            </p>
            <p className="muted">
              <strong>Cost:</strong> {formatAmount(profitSummary.totalCostCents, revenue.currency)}
            </p>
            <p className="muted">
              <strong>Unpaid cost:</strong>{" "}
              {formatAmount(profitSummary.unpaidCostCents, revenue.currency)}
            </p>
            <p className="muted">
              <strong>Paid cost:</strong>{" "}
              {formatAmount(profitSummary.paidCostCents, revenue.currency)}
            </p>
            <p className="muted">
              <strong>Profit:</strong> {formatAmount(profitSummary.profitCents, revenue.currency)}
            </p>
            <p className="muted">
              <strong>Billing state:</strong> {revenue.billingState}
            </p>
            <p className="muted">
              <strong>Service date:</strong> {formatDate(revenue.serviceDate)}
            </p>
            <p className="muted">
              <strong>Revenue type:</strong> {revenue.entryType}
            </p>
            <p className="muted">
              <strong>Amount:</strong>{" "}
              {formatAmount(revenue.amountCents, revenue.currency)}
            </p>
            <p className="muted">
              <strong>Fulfillment type:</strong>{" "}
              {revenue.fulfillmentPartyType || "Not set"}
            </p>
            <p className="muted">
              <strong>Fulfillment party:</strong>{" "}
              {revenue.fulfillmentPartyLabel || "Not set"}
            </p>
            <p className="muted">
              <strong>Customer company:</strong>{" "}
              {revenue.customerCompany?.trim() || "Not provided"}
            </p>
            <p className="muted">
              <strong>Updated:</strong> {formatDate(revenue.updatedAt)}
            </p>
          </div>

          <div className="surface customer-notes-panel">
            <p className="eyebrow">Notes</p>
            <p className="muted">
              {revenue.notes?.trim() || "No entry notes saved yet."}
            </p>
          </div>

          <div className="surface revenue-line-items-note">
            <p className="eyebrow">Invoice</p>
            {linkedInvoice ? (
              <>
                <p className="muted">
                  This Daytime entry already has a linked invoice.
                </p>
                <div>
                  <Link className="link-pill" href={`/invoices/${linkedInvoice.id}`}>
                    Open invoice
                  </Link>
                </div>
              </>
            ) : (
              <p className="muted">
                No invoice has been created from this entry yet.
              </p>
            )}
          </div>

          <div className="surface revenue-line-items-note stack">
            <div className="stack stack-tight">
              <p className="eyebrow">Costs</p>
              <h2 className="section-title">Costs</h2>
              <p className="muted">
                Revenue-linked costs stay internal and do not affect invoices.
              </p>
            </div>

            {revenueCosts.costs.length === 0 ? (
              <p className="muted">No costs linked to this entry yet.</p>
            ) : (
              <div className="stack customer-list">
                {revenueCosts.costs.map((cost) => (
                  <Link className="customer-card" href={`/costs/${cost.id}`} key={cost.id}>
                    <div className="customer-card-header">
                      <div className="stack stack-tight">
                        <strong>{cost.costName}</strong>
                        <span className="muted">{cost.description || "No description"}</span>
                      </div>
                      <span className="role-badge">{cost.paymentStatus}</span>
                    </div>

                    <div className="revenue-card-meta">
                      <p className="muted">
                        <strong>Amount:</strong> {formatAmount(cost.amountCents, cost.currency)}
                      </p>
                      <p className="muted">
                        <strong>Date:</strong> {formatDate(cost.costDate)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {canManageRevenue ? (
              <form className="stack form-stack" action={createRevenueCostAction}>
                <input type="hidden" name="revenueId" value={revenue.id} />
                <input type="hidden" name="customerId" value={revenue.customerId} />
                <input type="hidden" name="groupId" value={revenue.groupId ?? ""} />
                <input type="hidden" name="costDate" value={revenue.serviceDate} />

                <div className="grid grid-2">
                  <label className="field">
                    <span>Cost name</span>
                    <input name="costName" type="text" placeholder="Driver payout" required />
                  </label>

                  <label className="field">
                    <span>Amount (USD)</span>
                    <input
                      name="amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      required
                    />
                  </label>
                </div>

                <div className="grid grid-3">
                  <label className="field">
                    <span>Vendor</span>
                    <select name="vendorId" defaultValue="">
                      <option value="">No vendor</option>
                      {costEditorData.vendorChoices.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.displayName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Driver</span>
                    <select name="driverId" defaultValue="">
                      <option value="">No driver</option>
                      {costEditorData.driverChoices.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.displayName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Guide</span>
                    <select name="guideId" defaultValue="">
                      <option value="">No guide</option>
                      {costEditorData.guideChoices.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <input type="hidden" name="paymentStatus" value="unpaid" />

                <button className="button-secondary" type="submit">
                  Add Cost
                </button>
              </form>
            ) : null}
          </div>

          {!canManageRevenue ? (
            <p className="status status-message">
              You can view this Daytime entry, but only workspace owners and admins can
              edit it.
            </p>
          ) : null}
        </article>

        <div className="stack">
          <RevenueStatusBanner status={status} />
          <RevenueForm
            mode="edit"
            context={context}
            customers={customers}
            groups={result.groups}
            fulfillmentParties={fulfillmentParties}
            revenue={revenue}
            values={getRevenueFormDefaults(revenue)}
            linkedInvoiceId={linkedInvoice?.id ?? null}
          />
        </div>
      </section>
    </PageShell>
  );
}
