import { SubmitButton } from "@/components/auth/submit-button";
import { createBankImportAction } from "@/modules/bank/actions";
import type { BankImportFormValues } from "@/modules/bank/types";

type BankImportFormProps = {
  canManageBank: boolean;
  values: BankImportFormValues;
};

export function BankImportForm({ canManageBank, values }: BankImportFormProps) {
  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Import intake</p>
        <h2 className="section-title">Create bank import batch</h2>
        <p className="muted">
          Upload a CSV file for the real first-pass workflow, or fall back to pasted
          rows when needed. Imports stay explicit and reviewable before reconciliation.
        </p>
      </div>

      {!canManageBank ? (
        <p className="status status-error">
          Only workspace owners and admins can import bank statements.
        </p>
      ) : null}

      <form className="stack form-stack" action={createBankImportAction}>
        <div className="grid grid-2">
          <label className="field">
            <span>Import source</span>
            <input
              name="sourceName"
              type="text"
              defaultValue={values.sourceName}
              placeholder="March checking export"
              disabled={!canManageBank}
            />
          </label>

          <label className="field">
            <span>Import note</span>
            <input
              name="note"
              type="text"
              defaultValue={values.note}
              placeholder="CSV pasted from bank portal"
              disabled={!canManageBank}
            />
          </label>
        </div>

        <label className="field">
          <span>CSV file</span>
          <input
            name="statementFile"
            type="file"
            accept=".csv,text/csv"
            disabled={!canManageBank}
          />
        </label>

        <div className="surface revenue-line-items-note stack">
          <p className="eyebrow">Supported CSV headers</p>
          <p className="muted">
            Include a header row with date, amount, and description fields. Supported
            examples: `date` or `transaction_date`, `amount`, `description`, and optional
            `reference`.
          </p>
        </div>

        <label className="field">
          <span>Manual fallback rows</span>
          <textarea
            className="textarea"
            name="transactionsText"
            rows={10}
            defaultValue={values.transactionsText}
            placeholder={`2026-03-01 | 1200.00 | ACH PAYMENT RECEIVED | INV-20260301-001
2026-03-03 | 650.00 | CHECK DEPOSIT | Check 1042`}
            disabled={!canManageBank}
          />
        </label>

        <p className="muted">
          Use either one CSV file or manual pasted rows for a single import batch, not
          both together.
        </p>

        {canManageBank ? (
          <SubmitButton
            idleLabel="Create import batch"
            pendingLabel="Creating import batch..."
          />
        ) : null}
      </form>
    </section>
  );
}
