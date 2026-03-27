"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { GuestSignupModal } from "@/modules/guest/components/guest-signup-modal";

type GuestReceiptDraft = {
  id: string;
  vendor: string;
  amount: string;
  receiptDate: string;
  category: string;
  notes: string;
};

type SignupPrompt =
  | "save"
  | "invoice"
  | "customer"
  | "dashboard"
  | null;

const initialDraft = {
  vendor: "",
  amount: "",
  receiptDate: "",
  category: "driver",
  notes: "",
};

function buildPromptConfig(prompt: Exclude<SignupPrompt, null>) {
  switch (prompt) {
    case "save":
      return {
        nextPath: "/dashboard",
        message: "Create a free account to save your work",
      };
    case "invoice":
      return {
        nextPath: "/invoices",
        message: "Create a free account to save your work",
      };
    case "customer":
      return {
        nextPath: "/customers",
        message: "Create a free account to save your work",
      };
    case "dashboard":
      return {
        nextPath: "/dashboard",
        message: "Create a free account to save your work",
      };
  }
}

export function GuestReceiptsExperience() {
  const [draft, setDraft] = useState(initialDraft);
  const [receipts, setReceipts] = useState<GuestReceiptDraft[]>([]);
  const [signupPrompt, setSignupPrompt] = useState<SignupPrompt>(null);

  function updateDraft(field: keyof typeof initialDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleAddReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextReceipt: GuestReceiptDraft = {
      id: crypto.randomUUID(),
      vendor: draft.vendor.trim(),
      amount: draft.amount.trim(),
      receiptDate: draft.receiptDate,
      category: draft.category,
      notes: draft.notes.trim(),
    };

    if (!nextReceipt.vendor || !nextReceipt.amount || !nextReceipt.receiptDate) {
      return;
    }

    setReceipts((current) => [nextReceipt, ...current]);
    setDraft(initialDraft);
  }

  function removeReceipt(receiptId: string) {
    setReceipts((current) => current.filter((receipt) => receipt.id !== receiptId));
  }

  const signupConfig = signupPrompt ? buildPromptConfig(signupPrompt) : null;

  return (
    <>
      <div className="page stack">
        <section className="surface page-header">
          <p className="eyebrow">Guest receipts</p>
          <h1 className="page-title">Try receipt intake before you create an account</h1>
          <p className="page-subtitle">
            Add receipt drafts in guest mode with no signup required. Drafts stay in
            local page state only and are not saved to the database.
          </p>
        </section>

        <section className="surface section stack">
          <div className="guest-entry-grid">
            <div className="stack stack-tight">
              <p className="eyebrow">Start free</p>
              <h2 className="section-title">Capture your first receipt now</h2>
              <p className="muted">
                Test the workflow, add a few receipts, and see how the intake queue
                feels before committing to a workspace.
              </p>
            </div>
            <div className="guest-chip-row">
              <span className="role-badge">No signup required</span>
              <span className="role-badge">Local only</span>
              <span className="role-badge">No database writes</span>
            </div>
          </div>
        </section>

        <section className="grid members-layout-grid">
          <article className="surface section stack">
            <div className="stack stack-tight">
              <p className="eyebrow">Receipt draft</p>
              <h2 className="section-title">Add a guest receipt</h2>
              <p className="muted">
                This demo keeps your entries in memory only. Reloading the page clears
                the draft queue.
              </p>
            </div>

            <form className="stack form-stack" onSubmit={handleAddReceipt}>
              <label className="stack stack-tight">
                <span>Vendor or driver</span>
                <input
                  name="vendor"
                  onChange={(event) => updateDraft("vendor", event.target.value)}
                  placeholder="Airport Sedan Co."
                  required
                  value={draft.vendor}
                />
              </label>

              <div className="grid grid-2">
                <label className="stack stack-tight">
                  <span>Amount</span>
                  <input
                    inputMode="decimal"
                    name="amount"
                    onChange={(event) => updateDraft("amount", event.target.value)}
                    placeholder="128.50"
                    required
                    value={draft.amount}
                  />
                </label>

                <label className="stack stack-tight">
                  <span>Receipt date</span>
                  <input
                    name="receiptDate"
                    onChange={(event) => updateDraft("receiptDate", event.target.value)}
                    required
                    type="date"
                    value={draft.receiptDate}
                  />
                </label>
              </div>

              <label className="stack stack-tight">
                <span>Category</span>
                <select
                  name="category"
                  onChange={(event) => updateDraft("category", event.target.value)}
                  value={draft.category}
                >
                  <option value="driver">Driver payout</option>
                  <option value="fuel">Fuel</option>
                  <option value="parking">Parking / tolls</option>
                  <option value="vendor">Vendor invoice</option>
                  <option value="misc">Other cost</option>
                </select>
              </label>

              <label className="stack stack-tight">
                <span>Notes</span>
                <textarea
                  name="notes"
                  onChange={(event) => updateDraft("notes", event.target.value)}
                  placeholder="LAX pickup waiting time and parking."
                  rows={4}
                  value={draft.notes}
                />
              </label>

              <button className="button-primary" type="submit">
                Add receipt draft
              </button>
            </form>
          </article>

          <article className="surface section stack">
            <div className="stack stack-tight">
              <p className="eyebrow">Guest queue</p>
              <h2 className="section-title">
                {receipts.length === 0 ? "No receipt drafts yet" : "Receipt drafts"}
              </h2>
              <p className="muted">
                Add receipts freely. Saving, invoicing, customer creation, and dashboard
                access still require a free account.
              </p>
            </div>

            {receipts.length === 0 ? (
              <div className="status status-message">
                Add a receipt draft to start using the workflow immediately.
              </div>
            ) : (
              <div className="stack">
                {receipts.map((receipt) => (
                  <article className="customer-card stack stack-tight" key={receipt.id}>
                    <div className="guest-receipt-row">
                      <div className="stack stack-tight">
                        <strong>{receipt.vendor}</strong>
                        <span className="muted">
                          {receipt.receiptDate} · {receipt.category}
                        </span>
                      </div>
                      <strong>${receipt.amount}</strong>
                    </div>
                    {receipt.notes ? <p className="muted">{receipt.notes}</p> : null}
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => removeReceipt(receipt.id)}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="surface section stack">
          <div className="stack stack-tight">
            <p className="eyebrow">When signup appears</p>
            <h2 className="section-title">Use the tool first, create an account later</h2>
            <p className="muted">
              The first interaction is open. Account creation only appears when you try
              to save work or move into protected product areas.
            </p>
          </div>

          <div className="guest-action-grid">
            <button className="button-primary" type="button" onClick={() => setSignupPrompt("save")}>
              Save work
            </button>
            <button className="button-secondary" type="button" onClick={() => setSignupPrompt("invoice")}>
              Create invoice
            </button>
            <button className="button-secondary" type="button" onClick={() => setSignupPrompt("customer")}>
              Add customer
            </button>
            <button className="button-secondary" type="button" onClick={() => setSignupPrompt("dashboard")}>
              Open dashboard
            </button>
          </div>
        </section>
      </div>

      <GuestSignupModal
        message={signupConfig?.message}
        nextPath={signupConfig?.nextPath}
        onClose={() => setSignupPrompt(null)}
        open={signupPrompt !== null}
      />
    </>
  );
}
