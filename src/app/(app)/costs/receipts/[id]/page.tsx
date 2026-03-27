import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { ReceiptReviewForm } from "@/modules/cost-receipts/components/receipt-review-form";
import { ReceiptStatusBanner } from "@/modules/cost-receipts/components/receipt-status-banner";
import {
  getCostReceiptById,
  getReceiptIntakeFormDefaults,
} from "@/modules/cost-receipts/receipts";

type CostReceiptDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatAmount(amountCents: number | null) {
  if (typeof amountCents !== "number") {
    return "Not parsed";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

function formatFileSize(value: number | null) {
  if (!value) {
    return "Unknown size";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function parseStatusLabel(value: string) {
  return value.replace("_", " ");
}

export default async function CostReceiptDetailPage({
  params,
  searchParams,
}: CostReceiptDetailPageProps) {
  const [{ id }, context, query] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const result = await getCostReceiptById(context, id);

  if (!result) {
    notFound();
  }

  const { receipt, editorData, canManageCostReceipts } = result;
  const status = query.error
    ? { kind: "error" as const, text: query.error }
    : query.message
      ? { kind: "message" as const, text: query.message }
      : null;

  return (
    <PageShell
      eyebrow="Costs"
      title={receipt.candidateVendorName || receipt.fileName || "Receipt review"}
      description="Review a receipt intake record, classify it safely, and post it into formal costs."
    >
      <section className="grid customer-detail-grid">
        <article className="surface section stack">
          <div className="stack stack-tight">
            <div className="cost-link-row">
              <Link className="link-pill" href="/costs/receipts">
                Back to receipts
              </Link>
              <Link className="link-pill" href="/costs">
                Formal costs
              </Link>
            </div>
            <p className="eyebrow">Receipt summary</p>
            <h2 className="section-title">
              {receipt.candidateVendorName || receipt.fileName || "Receipt review"}
            </h2>
            <p className="muted">
              {receipt.candidateDescription ||
                receipt.tempFileReference ||
                "Review the candidate fields and classification before posting."}
            </p>
          </div>

          <div className="stack customer-meta-list">
            <p className="muted">
              <strong>Status:</strong> {receipt.status}
            </p>
            <p className="muted">
              <strong>Parser status:</strong> {parseStatusLabel(receipt.parseStatus)}
            </p>
            <p className="muted">
              <strong>Parsed at:</strong> {formatTimestamp(receipt.parsedAt)}
            </p>
            <p className="muted">
              <strong>Candidate date:</strong> {receipt.candidateDate || "Not parsed"}
            </p>
            <p className="muted">
              <strong>Candidate amount:</strong>{" "}
              {formatAmount(receipt.candidateAmountCents)}
            </p>
            {receipt.parseError ? (
              <p className="muted">
                <strong>Parser note:</strong> {receipt.parseError}
              </p>
            ) : null}
          </div>

          <div className="surface revenue-line-items-note stack stack-tight">
            <p className="eyebrow">Parsed candidate data</p>
            <p className="muted">
              Candidate fields can come from parser scaffolding or manual review. They
              stay editable until you explicitly post the receipt.
            </p>
            <p className="muted">
              <strong>Vendor:</strong> {receipt.candidateVendorName || "Not parsed"}
            </p>
            <p className="muted">
              <strong>Description:</strong>{" "}
              {receipt.candidateDescription || "Not parsed"}
            </p>
            <p className="muted">
              <strong>Note:</strong> {receipt.candidateNote || "No candidate note"}
            </p>
          </div>

          <div className="surface revenue-line-items-note stack stack-tight">
            <p className="eyebrow">Confirmed classification</p>
            <p className="muted">
              Classification is separate from parsed candidates. Posting uses the
              reviewed candidate fields plus the confirmed cost linkage below.
            </p>
            <p className="muted">
              <strong>Cost scope:</strong>{" "}
              {receipt.costScope
                ? receipt.costScope === "company"
                  ? "Company"
                  : "Group-linked"
                : "Not classified"}
            </p>
            <p className="muted">
              <strong>Category:</strong>{" "}
              {receipt.costCategoryName || "No company category"}
            </p>
            <p className="muted">
              <strong>Revenue item:</strong>{" "}
              {receipt.revenueRecordItemTitle || "No item link"}
            </p>
            <p className="muted">
              <strong>Revenue draft:</strong>{" "}
              {receipt.revenueSummary || "No revenue link"}
            </p>
            <p className="muted">
              <strong>Invoice draft:</strong>{" "}
              {receipt.invoiceSummary || "No invoice link"}
            </p>
            <p className="muted">
              <strong>Customer:</strong> {receipt.customerName || "No customer link"}
            </p>
          </div>

          <div className="surface revenue-line-items-note stack stack-tight">
            <p className="eyebrow">Attachment source</p>
            {receipt.fileName ? (
              <>
                <p className="muted">
                  <strong>Uploaded file:</strong> {receipt.fileName}
                </p>
                <p className="muted">
                  <strong>File details:</strong>{" "}
                  {receipt.fileMimeType || "Unknown type"} •{" "}
                  {formatFileSize(receipt.fileSizeBytes)}
                </p>
                {receipt.fileUrl ? (
                  <Link
                    className="link-pill"
                    href={receipt.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open uploaded receipt
                  </Link>
                ) : null}
              </>
            ) : (
              <p className="muted">
                <strong>Temporary reference:</strong>{" "}
                {receipt.tempFileReference || "No stored reference"}
              </p>
            )}
          </div>

          <div className="surface revenue-line-items-note stack stack-tight">
            <p className="eyebrow">Parser metadata</p>
            <p className="muted">
              <strong>Parser:</strong>{" "}
              {receipt.parserName
                ? `${receipt.parserName}${receipt.parserVersion ? ` • ${receipt.parserVersion}` : ""}`
                : "Not run yet"}
            </p>
            <p className="muted">
              <strong>Last parse attempt:</strong>{" "}
              {formatTimestamp(receipt.parseAttemptedAt)}
            </p>
          </div>

          <div className="surface revenue-line-items-note stack stack-tight">
            <p className="eyebrow">Posting boundary</p>
            <p className="muted">
              Posting creates a separate formal cost record. Parser output only prefills
              candidate fields, and there is still no auto-posting into formal costs.
            </p>
            {receipt.postedCostRecordId ? (
              <Link className="link-pill" href={`/costs/${receipt.postedCostRecordId}`}>
                Open posted cost
              </Link>
            ) : null}
          </div>

          {!canManageCostReceipts ? (
            <p className="status status-message">
              You can view this receipt intake record, but only workspace owners and
              admins can review or post it.
            </p>
          ) : null}
        </article>

        <div className="stack">
          <ReceiptStatusBanner status={status} />
          <ReceiptReviewForm
            canManageCostReceipts={canManageCostReceipts}
            editorData={editorData}
            receipt={receipt}
            values={getReceiptIntakeFormDefaults(receipt)}
          />
        </div>
      </section>
    </PageShell>
  );
}
