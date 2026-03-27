"use client";

import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createCostAction, updateCostAction } from "@/modules/costs/actions";
import type { CostsEditorData } from "@/modules/costs/costs";
import type { CostFormValues, CostRecord } from "@/modules/costs/types";

type CostFormProps = {
  mode: "create" | "edit";
  context: AuthenticatedAppContext;
  editorData: CostsEditorData;
  values: CostFormValues;
  cost?: CostRecord | null;
};

export function CostForm({
  mode,
  context,
  editorData,
  values,
  cost,
}: CostFormProps) {
  const canManageCosts =
    context.workspace.role === "owner" || context.workspace.role === "admin";
  const action = mode === "create" ? createCostAction : updateCostAction;

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">{mode === "create" ? "New cost" : "Cost"}</p>
        <h2 className="section-title">
          {mode === "create" ? "Create cost" : "Edit cost"}
        </h2>
        <p className="muted">
          Costs are internal only. They can link to Daytime, customer, group, or
          overhead without affecting invoices.
        </p>
      </div>

      {!canManageCosts ? (
        <p className="status status-error">
          Only workspace owners and admins can create or edit costs.
        </p>
      ) : null}

      <form className="stack form-stack" action={action}>
        {cost ? <input type="hidden" name="costId" value={cost.id} /> : null}

        <div className="grid grid-2">
          <label className="field">
            <span>Cost type</span>
            <select name="costType" defaultValue={values.costType} disabled={!canManageCosts}>
              <option value="revenue">Revenue-linked</option>
              <option value="customer">Customer-level</option>
              <option value="group">Group-level</option>
              <option value="overhead">Overhead</option>
            </select>
          </label>

          <label className="field">
            <span>Cost date</span>
            <input
              name="costDate"
              type="date"
              defaultValue={values.costDate}
              disabled={!canManageCosts}
              required
            />
          </label>
        </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Cost name</span>
            <input
              name="costName"
              type="text"
              defaultValue={values.costName}
              placeholder="Driver payout"
              disabled={!canManageCosts}
              required
            />
          </label>

          <label className="field">
            <span>Amount (USD)</span>
            <input
              name="amount"
              type="text"
              inputMode="decimal"
              defaultValue={values.amount}
              placeholder="0.00"
              disabled={!canManageCosts}
              required
            />
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            className="textarea"
            name="description"
            defaultValue={values.description}
            placeholder="Optional internal description."
            rows={3}
            disabled={!canManageCosts}
          />
        </label>

        <div className="grid grid-2">
          <label className="field">
            <span>Payment status</span>
            <select
              name="paymentStatus"
              defaultValue={values.paymentStatus}
              disabled={!canManageCosts}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </label>

          <label className="field">
            <span>Daytime entry</span>
            <select name="revenueId" defaultValue={values.revenueId} disabled={!canManageCosts}>
              <option value="">No Daytime link</option>
              {editorData.revenueChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Customer</span>
            <select name="customerId" defaultValue={values.customerId} disabled={!canManageCosts}>
              <option value="">No customer link</option>
              {editorData.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Group</span>
            <select name="groupId" defaultValue={values.groupId} disabled={!canManageCosts}>
              <option value="">No group link</option>
              {editorData.groupChoices.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-3">
          <label className="field">
            <span>Vendor</span>
            <select name="vendorId" defaultValue={values.vendorId} disabled={!canManageCosts}>
              <option value="">No vendor</option>
              {editorData.vendorChoices.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Driver</span>
            <select name="driverId" defaultValue={values.driverId} disabled={!canManageCosts}>
              <option value="">No driver</option>
              {editorData.driverChoices.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Guide</span>
            <select name="guideId" defaultValue={values.guideId} disabled={!canManageCosts}>
              <option value="">No guide</option>
              {editorData.guideChoices.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Internal notes</span>
          <textarea
            className="textarea"
            name="notesInternal"
            defaultValue={values.notesInternal}
            rows={4}
            placeholder="Internal only."
            disabled={!canManageCosts}
          />
        </label>

        {canManageCosts ? (
          <button className="button-primary" type="submit">
            {mode === "create" ? "Create cost" : "Save cost"}
          </button>
        ) : null}
      </form>
    </section>
  );
}
