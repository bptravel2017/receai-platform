import { SubmitButton } from "@/components/auth/submit-button";
import { createCostReceiptIntakeAction } from "@/modules/cost-receipts/actions";

type ReceiptIntakeCreateFormProps = {
  canManageCostReceipts: boolean;
};

export function ReceiptIntakeCreateForm({
  canManageCostReceipts,
}: ReceiptIntakeCreateFormProps) {
  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Receipt intake</p>
        <h2 className="section-title">Upload or log a receipt</h2>
        <p className="muted">
          Keep receipt intake separate from formal costs. Upload a file when you have
          one, or store a temporary reference until attachment cleanup is ready.
        </p>
      </div>

      {!canManageCostReceipts ? (
        <p className="status status-error">
          Only workspace owners and admins can intake new receipts.
        </p>
      ) : null}

      <form className="stack form-stack" action={createCostReceiptIntakeAction}>
        <div className="grid grid-2">
          <label className="field">
            <span>Receipt file</span>
            <input
              name="receiptFile"
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              disabled={!canManageCostReceipts}
            />
          </label>

          <label className="field">
            <span>Temporary file reference</span>
            <input
              name="tempFileReference"
              type="text"
              placeholder="Drive/Inbox/IMG_4021.JPG"
              disabled={!canManageCostReceipts}
            />
          </label>
        </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Candidate date</span>
            <input
              name="candidateDate"
              type="date"
              disabled={!canManageCostReceipts}
            />
          </label>

          <label className="field">
            <span>Candidate amount (USD)</span>
            <input
              name="candidateAmount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              disabled={!canManageCostReceipts}
            />
          </label>
        </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Candidate vendor</span>
            <input
              name="candidateVendorName"
              type="text"
              placeholder="Staples"
              disabled={!canManageCostReceipts}
            />
          </label>

          <label className="field">
            <span>Candidate description</span>
            <input
              name="candidateDescription"
              type="text"
              placeholder="Office printer toner"
              disabled={!canManageCostReceipts}
            />
          </label>
        </div>

        <label className="field">
          <span>Candidate note</span>
          <textarea
            className="textarea"
            name="candidateNote"
            rows={4}
            placeholder="Optional review note before classification."
            disabled={!canManageCostReceipts}
          />
        </label>

        {canManageCostReceipts ? (
          <SubmitButton
            idleLabel="Create receipt intake"
            pendingLabel="Creating receipt intake..."
          />
        ) : null}
      </form>
    </section>
  );
}
