import { SubmitButton } from "@/components/auth/submit-button";
import {
  reconcileBankTransactionAction,
  unreconcileBankTransactionAction,
} from "@/modules/bank/actions";
import type {
  BankTransactionRecord,
  BankTransactionReconciliationFormValues,
  ReconciliationInvoiceChoice,
} from "@/modules/bank/types";

type BankTransactionReconciliationFormProps = {
  canManageBank: boolean;
  transaction: BankTransactionRecord;
  invoiceChoices: ReconciliationInvoiceChoice[];
  values: BankTransactionReconciliationFormValues;
};

function formatAmount(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

export function BankTransactionReconciliationForm({
  canManageBank,
  transaction,
  invoiceChoices,
  values,
}: BankTransactionReconciliationFormProps) {
  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Manual reconciliation</p>
        <h2 className="section-title">Match transaction to finalized invoice</h2>
        <p className="muted">
          This first version is explicit and user-confirmed. Matching updates invoice
          payment tracking, but bank transactions remain separate records.
        </p>
      </div>

      {!canManageBank ? (
        <p className="status status-error">
          Only workspace owners and admins can reconcile bank transactions.
        </p>
      ) : null}

      <form className="stack form-stack" action={reconcileBankTransactionAction}>
        <input type="hidden" name="transactionId" value={transaction.id} />

        <div className="grid grid-2">
          <label className="field">
            <span>Transaction amount</span>
            <input
              type="text"
              value={formatAmount(transaction.amountCents)}
              disabled
              readOnly
            />
          </label>

          <label className="field">
            <span>Current reconciliation</span>
            <input
              type="text"
              value={transaction.reconciliationStatus}
              disabled
              readOnly
            />
          </label>
        </div>

        <label className="field">
          <span>Finalized invoice</span>
          <select
            name="invoiceId"
            defaultValue={values.invoiceId}
            disabled={!canManageBank}
          >
            <option value="">Select finalized invoice</option>
            {invoiceChoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber || "No number"} • {invoice.customerName} •{" "}
                {formatAmount(invoice.amountCents)} • paid {formatAmount(invoice.paidAmountCents)}
              </option>
            ))}
          </select>
        </label>

        {canManageBank ? (
          <div className="cost-link-row">
            <SubmitButton
              idleLabel="Match to invoice"
              pendingLabel="Matching to invoice..."
            />
          </div>
        ) : null}
      </form>

      {canManageBank && transaction.reconciliationStatus === "matched" ? (
        <form action={unreconcileBankTransactionAction}>
          <input type="hidden" name="transactionId" value={transaction.id} />
          <SubmitButton
            idleLabel="Unreconcile transaction"
            pendingLabel="Removing match..."
          />
        </form>
      ) : null}
    </section>
  );
}
