"use client";

import { useMemo, useState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { type CostReceiptEditorData } from "@/modules/cost-receipts/receipts";
import {
  postReceiptToCostAction,
  runReceiptParserAction,
  updateCostReceiptReviewAction,
} from "@/modules/cost-receipts/actions";
import type {
  ReceiptIntakeFormValues,
  ReceiptIntakeRecord,
} from "@/modules/cost-receipts/types";

type ReceiptReviewFormProps = {
  canManageCostReceipts: boolean;
  editorData: CostReceiptEditorData;
  receipt: ReceiptIntakeRecord;
  values: ReceiptIntakeFormValues;
};

export function ReceiptReviewForm({
  canManageCostReceipts,
  editorData,
  receipt,
  values,
}: ReceiptReviewFormProps) {
  const isPosted = Boolean(receipt.postedCostRecordId);
  const isEditable = canManageCostReceipts && !isPosted;
  const [costScope, setCostScope] = useState(values.costScope);
  const [revenueRecordId, setRevenueRecordId] = useState(values.revenueRecordId);
  const [customerId, setCustomerId] = useState(values.customerId);

  const filteredRevenueItems = useMemo(() => {
    const revenue = editorData.revenueChoices.find(
      (choice) => choice.id === revenueRecordId,
    );

    return revenue?.items ?? [];
  }, [editorData.revenueChoices, revenueRecordId]);

  const filteredInvoices = useMemo(() => {
    return editorData.invoiceChoices.filter((invoice) => {
      if (revenueRecordId && invoice.revenueRecordId !== revenueRecordId) {
        return false;
      }

      if (customerId && invoice.customerId !== customerId) {
        return false;
      }

      return true;
    });
  }, [customerId, editorData.invoiceChoices, revenueRecordId]);

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Receipt review</p>
        <h2 className="section-title">Classify and post receipt</h2>
        <p className="muted">
          Attachment priority is explicit here: revenue item first, then revenue draft,
          then invoice draft, then customer plus group name and service date.
        </p>
      </div>

      {!canManageCostReceipts ? (
        <p className="status status-error">
          Only workspace owners and admins can review or post receipts.
        </p>
      ) : null}

      {isPosted ? (
        <p className="status status-message">
          This receipt is already posted into a formal cost record and is now read-only.
        </p>
      ) : null}

      <section className="surface revenue-line-items-note stack">
        <div className="stack stack-tight">
          <div className="customer-card-header">
            <div className="stack stack-tight">
              <p className="eyebrow">Parser scaffold</p>
              <p className="muted">
                Parsed values stay editable. Classification and posting remain separate,
                explicit steps.
              </p>
            </div>
            <span
              className={`role-badge ${
                receipt.parseStatus === "parsed"
                  ? "receipt-status-parsed"
                  : receipt.parseStatus === "failed"
                    ? "receipt-status-failed"
                    : "receipt-status-uploaded"
              }`}
            >
              {receipt.parseStatus.replace("_", " ")}
            </span>
          </div>

          <div className="grid grid-2">
            <p className="muted">
              <strong>Parser:</strong>{" "}
              {receipt.parserName
                ? `${receipt.parserName}${receipt.parserVersion ? ` • ${receipt.parserVersion}` : ""}`
                : "Not run yet"}
            </p>
            <p className="muted">
              <strong>Last attempt:</strong>{" "}
              {receipt.parseAttemptedAt
                ? new Date(receipt.parseAttemptedAt).toLocaleString()
                : "Not run yet"}
            </p>
          </div>

          {receipt.parseStatus === "failed" && receipt.parseError ? (
            <p className="status status-error">{receipt.parseError}</p>
          ) : null}

          {isEditable ? (
            <form action={runReceiptParserAction}>
              <input type="hidden" name="receiptId" value={receipt.id} />
              <SubmitButton
                idleLabel="Run parser scaffold"
                pendingLabel="Running parser scaffold..."
              />
            </form>
          ) : null}
        </div>
      </section>

      <form className="stack form-stack" action={updateCostReceiptReviewAction}>
        <input type="hidden" name="receiptId" value={receipt.id} />

        <section className="surface revenue-line-items-note stack">
          <div className="stack stack-tight">
            <p className="eyebrow">Parsed candidate fields</p>
            <p className="muted">
              These fields are parser or reviewer candidates. Edit them freely before
              you classify or post the receipt.
            </p>
          </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Review status</span>
            <select
              name="reviewStatus"
              defaultValue={values.reviewStatus}
              disabled={!isEditable}
            >
              <option value="uploaded">Uploaded</option>
              <option value="parsed">Parsed</option>
              <option value="classified">Classified</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          <label className="field">
            <span>Temporary file reference</span>
            <input
              name="tempFileReference"
              type="text"
              defaultValue={values.tempFileReference}
              placeholder="Drive/Inbox/IMG_4021.JPG"
              disabled={!isEditable}
            />
          </label>
        </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Candidate date</span>
            <input
              name="candidateDate"
              type="date"
              defaultValue={values.candidateDate}
              disabled={!isEditable}
            />
          </label>

          <label className="field">
            <span>Candidate amount (USD)</span>
            <input
              name="candidateAmount"
              type="text"
              inputMode="decimal"
              defaultValue={values.candidateAmount}
              placeholder="0.00"
              disabled={!isEditable}
            />
          </label>
        </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Candidate vendor</span>
            <input
              name="candidateVendorName"
              type="text"
              defaultValue={values.candidateVendorName}
              placeholder="Staples"
              disabled={!isEditable}
            />
          </label>

          <label className="field">
            <span>Candidate description</span>
            <input
              name="candidateDescription"
              type="text"
              defaultValue={values.candidateDescription}
              placeholder="Office printer toner"
              disabled={!isEditable}
            />
          </label>
        </div>

        <label className="field">
          <span>Candidate note</span>
          <textarea
            className="textarea"
            name="candidateNote"
            defaultValue={values.candidateNote}
            rows={4}
            placeholder="Optional note carried into the posted cost."
            disabled={!isEditable}
          />
        </label>
        </section>

        <section className="surface revenue-line-items-note stack">
          <div className="stack stack-tight">
            <p className="eyebrow">Confirmed classification fields</p>
            <p className="muted">
              These fields define how the receipt will attach to formal cost records if
              you post it.
            </p>
          </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Cost scope</span>
            <select
              name="costScope"
              defaultValue={values.costScope}
              onChange={(event) =>
                setCostScope(event.target.value as "" | "company" | "group_linked")
              }
              disabled={!isEditable}
            >
              <option value="">Not classified yet</option>
              <option value="company">Company cost</option>
              <option value="group_linked">Group-linked cost</option>
            </select>
          </label>

          {costScope === "company" ? (
            <label className="field">
              <span>Company category</span>
              <select
                name="costCategoryId"
                defaultValue={values.costCategoryId}
                disabled={!isEditable}
              >
                <option value="">Select category</option>
                {editorData.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Customer</span>
              <select
                name="customerId"
                defaultValue={values.customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                disabled={!isEditable}
              >
                <option value="">No customer link</option>
                {editorData.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.company?.trim() ? ` • ${customer.company}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {costScope === "group_linked" ? (
          <section className="surface revenue-line-items-note stack">
            <div className="stack stack-tight">
              <p className="eyebrow">Group-linked attachment</p>
              <p className="muted">
                Prefer the most specific link available. Start with a revenue item when
                possible, then fall back to revenue, invoice, or customer plus group
                context.
              </p>
            </div>

            <div className="grid grid-2">
              <label className="field">
                <span>Group name</span>
                <input
                  name="groupName"
                  type="text"
                  defaultValue={values.groupName}
                  placeholder="Spring rollout"
                  disabled={!isEditable}
                />
              </label>

              <label className="field">
                <span>Service date</span>
                <input
                  name="serviceDate"
                  type="date"
                  defaultValue={values.serviceDate}
                  disabled={!isEditable}
                />
              </label>
            </div>

            <div className="grid grid-2">
              <label className="field">
                <span>Revenue draft</span>
                <select
                  name="revenueRecordId"
                  defaultValue={values.revenueRecordId}
                  onChange={(event) => setRevenueRecordId(event.target.value)}
                  disabled={!isEditable}
                >
                  <option value="">No revenue link</option>
                  {editorData.revenueChoices.map((revenue) => (
                    <option key={revenue.id} value={revenue.id}>
                      {revenue.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Invoice draft</span>
                <select
                  name="invoiceId"
                  defaultValue={values.invoiceId}
                  disabled={!isEditable}
                >
                  <option value="">No invoice link</option>
                  {filteredInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Revenue item link</span>
              <select
                name="revenueRecordItemId"
                defaultValue={values.revenueRecordItemId}
                disabled={!isEditable || !revenueRecordId}
              >
                <option value="">No item link</option>
                {filteredRevenueItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                    {item.serviceDate ? ` • ${item.serviceDate}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}
        </section>

        {isEditable ? (
          <SubmitButton
            idleLabel="Save receipt review"
            pendingLabel="Saving receipt review..."
          />
        ) : null}
      </form>

      {isEditable ? (
        <form action={postReceiptToCostAction}>
          <input type="hidden" name="receiptId" value={receipt.id} />
          <SubmitButton
            idleLabel="Post into formal costs"
            pendingLabel="Posting into formal costs..."
          />
        </form>
      ) : null}
    </section>
  );
}
