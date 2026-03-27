"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Menu, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import type { CustomerChoice } from "@/modules/customers/types";
import type { FulfillmentPartyChoice } from "@/modules/fulfillment/types";
import type { GroupChoice } from "@/modules/groups/types";
import type {
  DaytimeServiceCategory,
  DaytimeSheetRow,
  RevenueBillingState,
  RevenueFormValues,
  RevenueStatus,
} from "@/modules/revenue/types";

type DaytimeEntryFlowProps = {
  mode: "create" | "edit";
  customers: CustomerChoice[];
  groups: GroupChoice[];
  fulfillmentParties: FulfillmentPartyChoice[];
  values: RevenueFormValues;
  disabled: boolean;
  linkedInvoiceId?: string | null;
};

type DaytimeRowGroup = {
  key: string;
  label: string;
  rows: DaytimeSheetRow[];
};

const serviceCategoryOptions: Array<{
  value: DaytimeServiceCategory;
  label: string;
  defaultDescription: string;
}> = [
  { value: "charter", label: "Charter", defaultDescription: "Charter" },
  { value: "transfer", label: "Transfer", defaultDescription: "Transfer" },
  { value: "ticket", label: "Ticket", defaultDescription: "Ticket" },
  { value: "advance", label: "Advance", defaultDescription: "Advance" },
  { value: "other", label: "Other", defaultDescription: "" },
];

function sanitizeMoney(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function sanitizeQuantity(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function createRow(overrides: Partial<DaytimeSheetRow> = {}): DaytimeSheetRow {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `daytime-row-${Math.random().toString(36).slice(2, 9)}`,
    serviceDate: "",
    groupDate: "",
    serviceCategory: "charter",
    itemDescription: "Charter",
    qty: "1",
    unitPrice: "0.00",
    ...overrides,
  };
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getCategoryLabel(value: DaytimeServiceCategory) {
  return (
    serviceCategoryOptions.find((option) => option.value === value)?.label ?? "Other"
  );
}

function getRowTotalCents(row: DaytimeSheetRow) {
  const qty = Number(row.qty);
  const unitPrice = Number(row.unitPrice);

  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) {
    return 0;
  }

  return Math.round(qty * unitPrice * 100);
}

function getVisibleDateKey(row: DaytimeSheetRow) {
  if (row.serviceDate) {
    return row.serviceDate;
  }

  if (row.groupDate) {
    return row.groupDate;
  }

  return "undated";
}

function buildGroups(rows: DaytimeSheetRow[]): DaytimeRowGroup[] {
  const grouped = new Map<string, DaytimeSheetRow[]>();

  rows.forEach((row) => {
    const key = getVisibleDateKey(row);
    const currentRows = grouped.get(key);

    if (currentRows) {
      currentRows.push(row);
      return;
    }

    grouped.set(key, [row]);
  });

  const datedKeys = Array.from(grouped.keys())
    .filter((key) => key !== "undated")
    .sort((left, right) => left.localeCompare(right));

  const orderedKeys = grouped.has("undated") ? [...datedKeys, "undated"] : datedKeys;

  return orderedKeys.map((key) => {
    const rowsForGroup = grouped.get(key) ?? [];
    const datedRows = rowsForGroup.filter((row) => row.serviceDate);
    const groupedUndatedRows = rowsForGroup.filter((row) => !row.serviceDate);

    return {
      key,
      label: key === "undated" ? "Undated" : formatDateLabel(key),
      rows: [...datedRows, ...groupedUndatedRows],
    };
  });
}

function buildNumbering(groups: DaytimeRowGroup[]) {
  const numbering = new Map<string, string>();
  let counter = 0;

  groups.forEach((group) => {
    group.rows.forEach((row) => {
      if (!row.serviceDate) {
        return;
      }

      counter += 1;
      numbering.set(row.id, `${counter}.`);
    });
  });

  return numbering;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function SegmentButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "daytime-segment-button is-active" : "daytime-segment-button"}
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function DaytimeEntryFlow({
  mode,
  customers,
  groups,
  fulfillmentParties,
  values,
  disabled,
  linkedInvoiceId,
}: DaytimeEntryFlowProps) {
  const [step, setStep] = useState(0);
  const [belongsTo, setBelongsTo] = useState(values.belongsTo);
  const [customerId, setCustomerId] = useState(values.customerId);
  const [groupId, setGroupId] = useState(values.groupId);
  const [entryDate, setEntryDate] = useState(values.serviceDate || getTodayDate());
  const [billingState, setBillingState] = useState<RevenueBillingState>(
    values.billingState === "not_needed"
      ? "not_needed"
      : values.billingState === "billed"
        ? "billed"
        : "unbilled",
  );
  const [status, setStatus] = useState<RevenueStatus>(values.status === "open" ? "open" : "draft");
  const [createInvoiceNow, setCreateInvoiceNow] = useState(values.createInvoiceNow);
  const [driverId, setDriverId] = useState(values.driverId);
  const [vendorId, setVendorId] = useState(values.vendorId);
  const [guideId, setGuideId] = useState(values.guideId);
  const [notes, setNotes] = useState(values.notes);
  const [rows, setRows] = useState<DaytimeSheetRow[]>(
    values.lineItems.length > 0 ? values.lineItems : [createRow({ serviceDate: entryDate })],
  );

  const activeGroups = groups.filter((group) => group.status === "active");
  const selectedGroup = activeGroups.find((group) => group.id === groupId) ?? null;
  const resolvedCustomerId =
    belongsTo === "group" ? selectedGroup?.customerId ?? "" : customerId;
  const customerName =
    customers.find((customer) => customer.id === resolvedCustomerId)?.name ?? "Not selected";
  const selectedGroupName = selectedGroup?.name ?? "Not selected";
  const driverChoices = fulfillmentParties.filter((party) => party.partyType === "driver");
  const vendorChoices = fulfillmentParties.filter((party) => party.partyType === "vendor");
  const guideChoices = fulfillmentParties.filter((party) => party.partyType === "guide");

  const groupsForRender = useMemo(() => buildGroups(rows), [rows]);
  const datedGroupKeys = groupsForRender
    .filter((group) => group.key !== "undated")
    .map((group) => group.key);
  const [selectedDateKey, setSelectedDateKey] = useState(
    datedGroupKeys[0] ?? entryDate ?? getTodayDate(),
  );
  const activeDateKey = datedGroupKeys.includes(selectedDateKey)
    ? selectedDateKey
    : datedGroupKeys[0] ?? entryDate ?? getTodayDate();

  const numbering = useMemo(() => buildNumbering(groupsForRender), [groupsForRender]);
  const subtotalCents = useMemo(
    () => rows.reduce((total, row) => total + getRowTotalCents(row), 0),
    [rows],
  );

  const serializedLineItems = JSON.stringify(
    rows.map((row, index) => {
      const description = row.itemDescription.trim();
      const categoryLabel = getCategoryLabel(row.serviceCategory);

      return {
        id: row.id || `daytime-row-${index + 1}`,
        title: description || categoryLabel,
        description: description || categoryLabel,
        serviceCategory: row.serviceCategory,
        quantity: row.qty.trim() || "0",
        unitPrice: row.unitPrice.trim() || "0.00",
        serviceDate: row.serviceDate,
        groupDate: row.serviceDate ? "" : row.groupDate,
      };
    }),
  );

  const updateRow = (rowId: string, key: keyof DaytimeSheetRow, nextValue: string) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (key === "qty") {
          return { ...row, qty: sanitizeQuantity(nextValue) };
        }

        if (key === "unitPrice") {
          return { ...row, unitPrice: sanitizeMoney(nextValue) };
        }

        if (key === "serviceCategory") {
          const nextCategory = nextValue as DaytimeServiceCategory;
          const option = serviceCategoryOptions.find((item) => item.value === nextCategory);
          const currentDescription = row.itemDescription.trim();
          const shouldReplaceDescription =
            currentDescription === "" || currentDescription === getCategoryLabel(row.serviceCategory);

          return {
            ...row,
            serviceCategory: nextCategory,
            itemDescription:
              shouldReplaceDescription && option
                ? option.defaultDescription
                : row.itemDescription,
          };
        }

        if (key === "serviceDate") {
          return {
            ...row,
            serviceDate: nextValue,
            groupDate: nextValue ? "" : row.groupDate,
          };
        }

        return {
          ...row,
          [key]: nextValue,
        };
      }),
    );
  };

  const updateGroupDate = (previousDate: string, nextDate: string) => {
    if (!nextDate || previousDate === nextDate) {
      return;
    }

    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.serviceDate === previousDate) {
          return { ...row, serviceDate: nextDate };
        }

        if (!row.serviceDate && row.groupDate === previousDate) {
          return { ...row, groupDate: nextDate };
        }

        return row;
      }),
    );
    setSelectedDateKey(nextDate);
  };

  const removeRow = (rowId: string) => {
    setRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
  };

  const addDatedItem = () => {
    const nextDate = activeDateKey !== "undated" ? activeDateKey : entryDate || getTodayDate();
    setRows((currentRows) => [...currentRows, createRow({ serviceDate: nextDate })]);
    setSelectedDateKey(nextDate);
  };

  const addItemUnderDate = () => {
    if (datedGroupKeys.length === 0) {
      addDatedItem();
      return;
    }

    setRows((currentRows) => [...currentRows, createRow({ groupDate: activeDateKey })]);
  };

  const addUndatedItem = () => {
    setRows((currentRows) => [...currentRows, createRow()]);
  };

  const primaryLabel =
    createInvoiceNow === "yes" && !linkedInvoiceId ? "Save & Create Invoice" : "Save Daytime";
  const canMoveToItems = Boolean(resolvedCustomerId) && Boolean(entryDate);
  const canSubmit = Boolean(resolvedCustomerId) && Boolean(entryDate) && rows.length > 0;
  const billingStateValue = linkedInvoiceId ? "billed" : billingState;

  return (
    <section className="daytime-flow">
      <div className="daytime-topbar">
        <Link className="daytime-brand" href="/dashboard">
          <span className="daytime-brand-mark">R</span>
          <span>ReceAI</span>
        </Link>

        <button className="daytime-topbar-menu" type="button" aria-label="Open workspace menu">
          <Menu size={18} />
        </button>
      </div>

      <div className="daytime-flow-head">
        <Link className="daytime-back-link" href="/revenue">
          Back to Daytime
        </Link>
        <h1>{mode === "create" ? "New Daytime" : "Edit Daytime"}</h1>
        <p>
          Build the entry first, shape the document line items, then review before saving or
          creating the invoice draft.
        </p>
      </div>

      <div className="daytime-progress" aria-label="Daytime progress">
        {[
          { label: "Header", index: 0 },
          { label: "Line Items", index: 1 },
          { label: "Review & Action", index: 2 },
        ].map((item) => (
          <button
            key={item.label}
            className={step === item.index ? "daytime-progress-step is-active" : "daytime-progress-step"}
            type="button"
            onClick={() => setStep(item.index)}
          >
            <span className="daytime-progress-bar" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <input type="hidden" name="customerId" value={resolvedCustomerId} />
      <input type="hidden" name="groupId" value={belongsTo === "group" ? groupId : ""} />
      <input type="hidden" name="entryDate" value={entryDate} />
      <input type="hidden" name="entryType" value="daytime" />
      <input type="hidden" name="billingState" value={billingStateValue} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="driverId" value={driverId} />
      <input type="hidden" name="vendorId" value={vendorId} />
      <input type="hidden" name="guideId" value={guideId} />
      <input type="hidden" name="lineItems" value={serializedLineItems} />

      <section className="daytime-card">
        {step === 0 ? (
          <>
            <div className="daytime-card-head">
              <p className="daytime-card-kicker">Step 1</p>
              <h2>Header</h2>
            </div>

            <div className="daytime-field-stack">
              <label className="daytime-field">
                <span>Belongs To</span>
                <div className="daytime-segmented">
                  <SegmentButton
                    active={belongsTo === "customer"}
                    disabled={disabled}
                    onClick={() => setBelongsTo("customer")}
                  >
                    Customer
                  </SegmentButton>
                  <SegmentButton
                    active={belongsTo === "group"}
                    disabled={disabled}
                    onClick={() => setBelongsTo("group")}
                  >
                    Group
                  </SegmentButton>
                </div>
              </label>

              <label className="daytime-field">
                <span>{belongsTo === "group" ? "Group" : "Customer"}</span>
                {belongsTo === "group" ? (
                  <select
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select a group</option>
                    {activeGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="daytime-field">
                <span>Entry Date</span>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setEntryDate(nextDate);
                    if (datedGroupKeys.length === 0) {
                      setSelectedDateKey(nextDate);
                    }
                  }}
                  disabled={disabled}
                />
              </label>

              <div className="daytime-field">
                <span>Billing State</span>
                {linkedInvoiceId ? (
                  <div className="daytime-static-pill">Billed via linked invoice</div>
                ) : (
                  <div className="daytime-segmented">
                    <SegmentButton
                      active={billingState === "unbilled"}
                      disabled={disabled}
                      onClick={() => setBillingState("unbilled")}
                    >
                      Unbilled
                    </SegmentButton>
                    <SegmentButton
                      active={billingState === "not_needed"}
                      disabled={disabled || createInvoiceNow === "yes"}
                      onClick={() => setBillingState("not_needed")}
                    >
                      Not billable
                    </SegmentButton>
                  </div>
                )}
              </div>

              <div className="daytime-field">
                <span>Entry Status</span>
                <div className="daytime-segmented">
                  <SegmentButton
                    active={status === "draft"}
                    disabled={disabled}
                    onClick={() => setStatus("draft")}
                  >
                    Draft
                  </SegmentButton>
                  <SegmentButton
                    active={status === "open"}
                    disabled={disabled}
                    onClick={() => setStatus("open")}
                  >
                    Confirmed
                  </SegmentButton>
                </div>
              </div>

              <div className="daytime-field">
                <span>Create Invoice Now</span>
                <div className="daytime-segmented">
                  <SegmentButton
                    active={createInvoiceNow === "no"}
                    disabled={disabled || Boolean(linkedInvoiceId)}
                    onClick={() => setCreateInvoiceNow("no")}
                  >
                    No
                  </SegmentButton>
                  <SegmentButton
                    active={createInvoiceNow === "yes"}
                    disabled={disabled || Boolean(linkedInvoiceId)}
                    onClick={() => {
                      setCreateInvoiceNow("yes");
                      setBillingState("unbilled");
                    }}
                  >
                    Yes
                  </SegmentButton>
                </div>
              </div>

              <div className="daytime-subsection">
                <div className="daytime-subsection-head">
                  <h3>Internal Fulfillment</h3>
                  <p>Internal only — not shown on invoice</p>
                </div>

                <label className="daytime-field">
                  <span>Driver</span>
                  <select
                    value={driverId}
                    onChange={(event) => setDriverId(event.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select a driver</option>
                    {driverChoices.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="daytime-field">
                  <span>Vendor</span>
                  <select
                    value={vendorId}
                    onChange={(event) => setVendorId(event.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select a vendor</option>
                    {vendorChoices.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="daytime-field">
                  <span>Guide</span>
                  <select
                    value={guideId}
                    onChange={(event) => setGuideId(event.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select a guide</option>
                    {guideChoices.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="daytime-card-actions">
              <button
                className="daytime-primary-button"
                type="button"
                onClick={() => setStep(1)}
                disabled={disabled || !canMoveToItems}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="daytime-card-head">
              <p className="daytime-card-kicker">Step 2</p>
              <h2>Line Items</h2>
              <p className="daytime-card-copy">
                Add the document items in service-date order. Dated rows are numbered
                automatically. Same-day add-ons stay under the selected date without a number.
              </p>
            </div>

            <div className="daytime-line-item-actions">
              <button className="daytime-secondary-button" type="button" onClick={addDatedItem}>
                <Plus size={16} /> Add dated item
              </button>
              <button
                className="daytime-secondary-button"
                type="button"
                onClick={addItemUnderDate}
                disabled={datedGroupKeys.length === 0}
              >
                <Plus size={16} /> Add item under this date
              </button>
              <button className="daytime-secondary-button" type="button" onClick={addUndatedItem}>
                <Plus size={16} /> Add undated item
              </button>
            </div>

            {datedGroupKeys.length > 0 ? (
              <p className="daytime-line-item-helper">
                Current date group: {formatDateLabel(activeDateKey)}
              </p>
            ) : null}

            <div className="daytime-group-list">
              {groupsForRender.map((group) => (
                <article className="daytime-group-card" key={group.key}>
                  <div
                    className={
                      group.key === activeDateKey
                        ? "daytime-group-head is-active"
                        : "daytime-group-head"
                    }
                  >
                    <div>
                      <h3>{group.label}</h3>
                      <p>
                        {group.key === "undated"
                          ? "Items with no service date appear once at the end."
                          : "Tap this date to add same-day items beneath it."}
                      </p>
                    </div>

                    {group.key !== "undated" ? (
                      <button
                        className="daytime-date-chip"
                        type="button"
                        onClick={() => setSelectedDateKey(group.key)}
                      >
                        This date
                      </button>
                    ) : null}
                  </div>

                  {group.key !== "undated" ? (
                    <label className="daytime-field">
                      <span>Service date</span>
                      <input
                        type="date"
                        value={group.key}
                        onChange={(event) => updateGroupDate(group.key, event.target.value)}
                        disabled={disabled}
                      />
                    </label>
                  ) : null}

                  <div className="daytime-item-list">
                    {group.rows.map((row) => (
                      <article className="daytime-item-row" key={row.id}>
                        <div className="daytime-item-topline">
                          <div className="daytime-item-number">
                            {numbering.get(row.id) ?? ""}
                          </div>
                          <input
                            type="text"
                            value={row.itemDescription}
                            onChange={(event) =>
                              updateRow(row.id, "itemDescription", event.target.value)
                            }
                            placeholder="Item Description"
                            disabled={disabled}
                          />
                          <button
                            className="daytime-remove-button"
                            type="button"
                            onClick={() => removeRow(row.id)}
                            aria-label="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <label className="daytime-field">
                          <span>Service Category</span>
                          <select
                            value={row.serviceCategory}
                            onChange={(event) =>
                              updateRow(row.id, "serviceCategory", event.target.value)
                            }
                            disabled={disabled}
                          >
                            {serviceCategoryOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="daytime-row-financials">
                          <label className="daytime-field">
                            <span>Qty</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.qty}
                              onChange={(event) => updateRow(row.id, "qty", event.target.value)}
                              placeholder="1"
                              disabled={disabled}
                            />
                          </label>
                          <label className="daytime-field">
                            <span>Unit Price</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.unitPrice}
                              onChange={(event) =>
                                updateRow(row.id, "unitPrice", event.target.value)
                              }
                              placeholder="0.00"
                              disabled={disabled}
                            />
                          </label>
                          <div className="daytime-total-box">
                            <span>Total</span>
                            <strong>{formatCurrency(getRowTotalCents(row))}</strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="daytime-card-actions is-split">
              <button className="daytime-ghost-button" type="button" onClick={() => setStep(0)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="daytime-primary-button" type="button" onClick={() => setStep(2)}>
                Review <ChevronRight size={16} />
              </button>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="daytime-card-head">
              <p className="daytime-card-kicker">Step 3</p>
              <h2>Final Details</h2>
              <p className="daytime-card-copy">
                Review the internal Daytime record before saving it as a draft, confirming it,
                or generating the invoice draft.
              </p>
            </div>

            <div className="daytime-review-block">
              <h3>Header Summary</h3>
              <dl className="daytime-summary-list">
                <div>
                  <dt>Belongs To</dt>
                  <dd>{belongsTo === "group" ? "Group" : "Customer"}</dd>
                </div>
                <div>
                  <dt>{belongsTo === "group" ? "Group" : "Customer"}</dt>
                  <dd>{belongsTo === "group" ? selectedGroupName : customerName}</dd>
                </div>
                <div>
                  <dt>Entry Date</dt>
                  <dd>{entryDate ? formatDateLabel(entryDate) : "Not set"}</dd>
                </div>
                <div>
                  <dt>Billing State</dt>
                  <dd>
                    {billingStateValue === "billed"
                      ? "Billed"
                      : billingStateValue === "not_needed"
                        ? "Not billable"
                        : "Unbilled"}
                  </dd>
                </div>
                <div>
                  <dt>Entry Status</dt>
                  <dd>{status === "draft" ? "Draft" : "Confirmed"}</dd>
                </div>
                <div>
                  <dt>Create Invoice Now</dt>
                  <dd>{createInvoiceNow === "yes" ? "Yes" : "No"}</dd>
                </div>
                {driverId ? (
                  <div>
                    <dt>Driver</dt>
                    <dd>{driverChoices.find((party) => party.id === driverId)?.displayName}</dd>
                  </div>
                ) : null}
                {vendorId ? (
                  <div>
                    <dt>Vendor</dt>
                    <dd>{vendorChoices.find((party) => party.id === vendorId)?.displayName}</dd>
                  </div>
                ) : null}
                {guideId ? (
                  <div>
                    <dt>Guide</dt>
                    <dd>{guideChoices.find((party) => party.id === guideId)?.displayName}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="daytime-review-block">
              <h3>Item Summary</h3>
              <div className="daytime-review-groups">
                {groupsForRender.map((group) => (
                  <section className="daytime-review-group" key={group.key}>
                    <h4>{group.label}</h4>
                    <div className="daytime-review-items">
                      {group.rows.map((row) => (
                        <div className="daytime-review-item" key={row.id}>
                          <div className="daytime-review-item-main">
                            <span className="daytime-review-number">
                              {numbering.get(row.id) ?? ""}
                            </span>
                            <div>
                              <strong>{row.itemDescription.trim() || getCategoryLabel(row.serviceCategory)}</strong>
                              <p>{getCategoryLabel(row.serviceCategory)}</p>
                            </div>
                          </div>
                          <div className="daytime-review-amounts">
                            <span>
                              {row.qty || "0"} x {formatCurrency(Math.round(Number(row.unitPrice || "0") * 100))}
                            </span>
                            <strong>{formatCurrency(getRowTotalCents(row))}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="daytime-review-block">
              <h3>Notes</h3>
              <textarea
                className="daytime-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                placeholder="Optional internal notes"
                disabled={disabled}
              />
            </div>

            <div className="daytime-totals-card">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotalCents)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatCurrency(subtotalCents)}</strong>
              </div>
            </div>

            <div className="daytime-card-actions is-review">
              <button className="daytime-ghost-button" type="button" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button
                className="daytime-secondary-button"
                type="submit"
                name="submitIntent"
                value="save_draft"
                disabled={disabled || !canSubmit}
              >
                Save Draft
              </button>
              <button
                className="daytime-primary-button"
                type="submit"
                name="submitIntent"
                value={createInvoiceNow === "yes" && !linkedInvoiceId ? "save_and_invoice" : "save"}
                disabled={disabled || !canSubmit}
              >
                {primaryLabel}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </section>
  );
}
