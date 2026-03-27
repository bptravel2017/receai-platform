"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import type { PayableBucket } from "@/modules/costs/types";

type PayablesListProps = {
  buckets: PayableBucket[];
  canBulkPay: boolean;
};

function formatAmount(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

export function PayablesList({ buckets, canBulkPay }: PayablesListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = selectedIds.length;
  const selectedTotalCents = useMemo(
    () =>
      buckets
        .flatMap((bucket) => bucket.items)
        .filter(
          (item, index, items) =>
            selectedIds.includes(item.id) &&
            items.findIndex((candidate) => candidate.id === item.id) === index,
        )
        .reduce((sum, item) => sum + item.amountCents, 0),
    [buckets, selectedIds],
  );

  const toggleSelection = (costId: string) => {
    setError("");
    setSelectedIds((current) =>
      current.includes(costId)
        ? current.filter((value) => value !== costId)
        : [...current, costId],
    );
  };

  const markSelectedPaid = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    if (!canBulkPay) {
      setError("This feature is available in Business plan.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/costs/pay-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ costIds: selectedIds }),
      });

      const payload = (await response.json()) as
        | { ok: true }
        | { ok: false; error: { message: string } };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "We could not mark the selected costs as paid." : payload.error.message,
        );
      }

      setSelectedIds([]);
      startTransition(() => {
        router.refresh();
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We could not mark the selected costs as paid.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (buckets.length === 0) {
    return (
      <section className="surface section stack">
        <p className="eyebrow">Payables</p>
        <h2 className="section-title">No payables yet</h2>
        <p className="muted">Vendor, driver, and guide costs will appear here.</p>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Payables</p>
          <h2 className="section-title">Operational payouts</h2>
          <p className="muted">Open the page, see who is owed, and mark payout costs done.</p>
        </div>

        <div className="cost-link-row">
          <p className="muted">
            <strong>{selectedCount}</strong> selected •{" "}
            <strong>{formatAmount(selectedTotalCents)}</strong>
          </p>
          <button
            className="button-primary"
            type="button"
            onClick={markSelectedPaid}
            disabled={selectedCount === 0 || isSubmitting || !canBulkPay}
          >
            {isSubmitting ? "Marking Paid..." : "Mark Selected as Paid"}
          </button>
        </div>

        {error ? <p className="status status-error">{error}</p> : null}
        {!canBulkPay ? (
          <p className="muted">
            Bulk pay is available in Business plan. <Link href="/pricing">Upgrade to Business</Link>
          </p>
        ) : null}
      </section>

      <section className="surface section stack">
        {buckets.map((bucket) => (
          <article className="customer-card" key={`${bucket.bucketType}-${bucket.partyId}`}>
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{bucket.partyName}</strong>
                <span className="muted">{bucket.bucketType}</span>
              </div>
              <span className="role-badge">{formatAmount(bucket.unpaidTotalCents)} unpaid</span>
            </div>

            <div className="revenue-card-meta">
              <p className="muted">
                <strong>Unpaid:</strong> {formatAmount(bucket.unpaidTotalCents)}
              </p>
              <p className="muted">
                <strong>Paid:</strong> {formatAmount(bucket.paidTotalCents)}
              </p>
              <p className="muted">
                <strong>Items:</strong> {bucket.itemCount}
              </p>
            </div>

            <div className="stack stack-tight">
              {bucket.items.map((item) => (
                <label className="customer-card daytime-list-row" key={item.id}>
                  <div className="daytime-list-select">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      disabled={item.paymentStatus === "paid" || isSubmitting}
                      aria-label={`Select ${item.costName}`}
                    />
                  </div>

                  <div className="stack stack-tight">
                    <div className="customer-card-header">
                      <div className="stack stack-tight">
                        <strong>{item.costName}</strong>
                        <span className="muted">
                          {item.revenueSummary || "No linked Daytime entry"}
                        </span>
                      </div>
                      <span className="role-badge">{item.paymentStatus}</span>
                    </div>

                    <div className="revenue-card-meta">
                      <p className="muted">
                        <strong>Date:</strong> {item.costDate}
                      </p>
                      <p className="muted">
                        <strong>Amount:</strong> {formatAmount(item.amountCents)}
                      </p>
                      {item.paidAt ? (
                        <p className="muted">
                          <strong>Paid:</strong> {item.paidAt.slice(0, 10)}
                        </p>
                      ) : null}
                    </div>

                    <p className="muted">
                      <Link href={`/costs/${item.id}`}>Open cost</Link>
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
