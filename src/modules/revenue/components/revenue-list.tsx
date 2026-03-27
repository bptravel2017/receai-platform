"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import type { RevenueRecord } from "@/modules/revenue/types";

type RevenueListProps = {
  revenue: RevenueRecord[];
  canManageRevenue: boolean;
  hasCustomers: boolean;
};

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function sortRevenueEntries(entries: RevenueRecord[]) {
  return [...entries].sort((left, right) => {
    if (left.billingState === "unbilled" && right.billingState !== "unbilled") {
      return -1;
    }

    if (left.billingState !== "unbilled" && right.billingState === "unbilled") {
      return 1;
    }

    return right.serviceDate.localeCompare(left.serviceDate);
  });
}

function canBulkInvoice(entries: RevenueRecord[]) {
  if (entries.length === 0) {
    return true;
  }

  const customerIds = new Set(entries.map((entry) => entry.customerId));
  const groupIds = new Set(entries.map((entry) => entry.groupId).filter(Boolean));

  return customerIds.size === 1 || groupIds.size === 1;
}

export function RevenueList({
  revenue,
  canManageRevenue,
  hasCustomers,
}: RevenueListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showUnbilledOnly, setShowUnbilledOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sortedRevenue = useMemo(() => sortRevenueEntries(revenue), [revenue]);
  const visibleRevenue = useMemo(
    () =>
      showUnbilledOnly
        ? sortedRevenue.filter((entry) => entry.billingState === "unbilled")
        : sortedRevenue,
    [showUnbilledOnly, sortedRevenue],
  );

  const selectedEntries = useMemo(
    () => revenue.filter((entry) => selectedIds.includes(entry.id)),
    [revenue, selectedIds],
  );

  const toggleSelection = (entryId: string) => {
    setError("");
    setSelectedIds((current) =>
      current.includes(entryId)
        ? current.filter((value) => value !== entryId)
        : [...current, entryId],
    );
  };

  const createInvoice = async () => {
    if (selectedEntries.length === 0) {
      return;
    }

    if (!canBulkInvoice(selectedEntries)) {
      setError("Selected entries must belong to the same customer or group");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/invoices/from-daytime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entry_ids: selectedEntries.map((entry) => entry.id),
        }),
      });

      const payload = (await response.json()) as
        | {
            ok: true;
            data: {
              invoiceId: string;
            };
          }
        | {
            ok: false;
            error: {
              message: string;
            };
          };

      if (!response.ok || !payload.ok) {
        setError(
          payload.ok ? "We could not create that invoice." : payload.error.message,
        );
        return;
      }

      startTransition(() => {
        router.push(`/invoices/${payload.data.invoiceId}`);
      });
    } catch {
      setError("We could not create that invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (revenue.length === 0) {
    return (
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Daytime</p>
          <h2 className="section-title">No Daytime entries yet</h2>
          <p className="muted">
            {hasCustomers
              ? "Start with a business entry tied to a real customer. Invoice creation stays optional from this point."
              : "Daytime entries require a real customer first. Create the upstream customer record before adding one."}
          </p>
        </div>

        {canManageRevenue ? (
          <div>
            <Link className="link-pill" href={hasCustomers ? "/revenue/new" : "/customers/new"}>
              {hasCustomers ? "New Daytime entry" : "Create customer first"}
            </Link>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Entries</p>
        <h2 className="section-title">Daytime ledger entries</h2>
        <p className="muted">
          Daytime is the primary business-entry flow. Billing stays separate until an
          invoice is intentionally created.
        </p>
      </div>

      <div className="daytime-list-toolbar">
        <label className="daytime-filter-toggle">
          <input
            type="checkbox"
            checked={showUnbilledOnly}
            onChange={(event) => setShowUnbilledOnly(event.target.checked)}
          />
          <span>Unbilled only</span>
        </label>

        {canManageRevenue ? (
          <button
            className="button-primary"
            type="button"
            onClick={createInvoice}
            disabled={selectedEntries.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Creating Invoice..." : "Create Invoice"}
          </button>
        ) : null}
      </div>

      {error ? <p className="status status-error">{error}</p> : null}

      <div className="stack customer-list">
        {visibleRevenue.map((entry) => {
          const selectable =
            canManageRevenue &&
            entry.billingState === "unbilled" &&
            !entry.invoiceId;

          return (
            <article className="customer-card daytime-list-row" key={entry.id}>
              <div className="daytime-list-select">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(entry.id)}
                  onChange={() => toggleSelection(entry.id)}
                  disabled={!selectable || isSubmitting}
                  aria-label={`Select ${entry.customerName} entry`}
                />
              </div>

              <div className="stack">
                <div className="customer-card-header">
                  <div className="stack stack-tight">
                    <strong>{entry.customerName}</strong>
                    <span className="muted">
                      {entry.groupName?.trim() || "No group"} • {formatDate(entry.serviceDate)}
                    </span>
                  </div>
                  <span className="role-badge">{entry.billingState}</span>
                </div>

                <div className="revenue-card-meta">
                  <p className="muted">
                    <strong>Type:</strong> {entry.entryType}
                  </p>
                  <p className="muted">
                    <strong>Amount:</strong> {formatAmount(entry.amountCents, entry.currency)}
                  </p>
                  <p className="muted">
                    <strong>Customer:</strong>{" "}
                    {entry.customerCompany?.trim() || entry.customerName}
                  </p>
                  {entry.fulfillmentPartyLabel ? (
                    <p className="muted">
                      <strong>Fulfillment:</strong> {entry.fulfillmentPartyLabel}
                    </p>
                  ) : null}
                </div>

                {entry.notes?.trim() ? (
                  <p className="muted customer-notes-preview">{entry.notes}</p>
                ) : null}

                <div>
                  <Link className="link-pill" href={`/revenue/${entry.id}`}>
                    Open entry
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
