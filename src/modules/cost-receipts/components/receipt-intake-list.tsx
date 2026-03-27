import Link from "next/link";

import type { ReceiptIntakeRecord } from "@/modules/cost-receipts/types";

type ReceiptIntakeListProps = {
  receipts: ReceiptIntakeRecord[];
  canManageCostReceipts: boolean;
};

function formatAmount(amountCents: number | null) {
  if (typeof amountCents !== "number") {
    return "No amount yet";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

function sourceLabel(receipt: ReceiptIntakeRecord) {
  if (receipt.fileName) {
    return receipt.fileName;
  }

  if (receipt.tempFileReference) {
    return receipt.tempFileReference;
  }

  return "Unlabeled receipt source";
}

function classificationSummary(receipt: ReceiptIntakeRecord) {
  if (receipt.costScope === "company") {
    return receipt.costCategoryName
      ? `Company • ${receipt.costCategoryName}`
      : "Company • category needed";
  }

  if (receipt.costScope === "group_linked") {
    const parts = [
      "Group-linked",
      receipt.revenueRecordItemTitle ? `Item: ${receipt.revenueRecordItemTitle}` : null,
      receipt.revenueSummary ? `Revenue: ${receipt.revenueSummary}` : null,
      receipt.invoiceSummary ? `Invoice: ${receipt.invoiceSummary}` : null,
      receipt.customerName ? `Customer: ${receipt.customerName}` : null,
      receipt.groupName ? `Group: ${receipt.groupName}` : null,
    ];

    return parts.filter(Boolean).join(" • ");
  }

  return "Not classified yet";
}

function parserSummary(receipt: ReceiptIntakeRecord) {
  if (receipt.parseStatus === "parsed") {
    return receipt.parsedAt ? "Parser scaffold filled candidate fields." : "Parsed";
  }

  if (receipt.parseStatus === "failed") {
    return receipt.parseError || "Parser scaffold could not infer fields yet.";
  }

  return "Parser scaffold not run yet.";
}

export function ReceiptIntakeList({
  receipts,
  canManageCostReceipts,
}: ReceiptIntakeListProps) {
  if (receipts.length === 0) {
    return (
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Receipt intake</p>
          <h2 className="section-title">No receipts yet</h2>
          <p className="muted">
            Start with uploaded or manually referenced receipts here, then review and
            post them into formal costs once classification is ready.
          </p>
        </div>

        {canManageCostReceipts ? (
          <p className="muted">
            Upload a receipt file or add a temporary file reference in the intake form.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Receipt queue</p>
        <h2 className="section-title">Receipt intake records</h2>
        <p className="muted">
          Intake records stay separate from formal costs until someone reviews and posts
          them.
        </p>
      </div>

      <div className="stack customer-list">
        {receipts.map((receipt) => (
          <Link
            className="customer-card"
            href={`/costs/receipts/${receipt.id}`}
            key={receipt.id}
          >
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{receipt.candidateVendorName || sourceLabel(receipt)}</strong>
                <span className="muted">
                  {receipt.candidateDescription || sourceLabel(receipt)}
                </span>
              </div>
              <span className={`role-badge receipt-status-${receipt.status}`}>
                {receipt.status}
              </span>
            </div>

            <div className="revenue-card-meta">
              <p className="muted">
                <strong>Date:</strong> {receipt.candidateDate || "Not reviewed"}
              </p>
              <p className="muted">
                <strong>Amount:</strong> {formatAmount(receipt.candidateAmountCents)}
              </p>
            </div>

            <p className="muted customer-notes-preview">
              {classificationSummary(receipt)}
            </p>
            <p className="muted customer-notes-preview">{parserSummary(receipt)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
