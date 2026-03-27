import type { AuthenticatedAppContext } from "@/lib/auth/types";
import {
  deleteInvoiceAction,
  recordInvoicePaymentAction,
  sendInvoicePlatformEmailAction,
  updateInvoiceDraftAction,
} from "@/modules/invoices/actions";
import { InvoiceItemsEditor } from "@/modules/invoices/components/invoice-items-editor";
import type {
  InvoiceDeliveryEventRecord,
  InvoiceDeliveryFollowUpFormValues,
  InvoiceDeliveryFormValues,
  InvoiceFormValues,
  InvoicePaymentFormValues,
  InvoicePaymentEventRecord,
  InvoiceRecord,
} from "@/modules/invoices/types";

type InvoiceFormProps = {
  context: AuthenticatedAppContext;
  invoice: InvoiceRecord;
  values: InvoiceFormValues;
  deliveryValues: InvoiceDeliveryFormValues;
  followUpValues: InvoiceDeliveryFollowUpFormValues;
  paymentValues: InvoicePaymentFormValues;
  deliveryEvents: InvoiceDeliveryEventRecord[];
  paymentEvents: InvoicePaymentEventRecord[];
};

export function InvoiceForm({
  context,
  invoice,
  values,
  deliveryValues,
  followUpValues,
  paymentValues,
  paymentEvents,
}: InvoiceFormProps) {
  const canManageInvoices =
    context.workspace.role === "owner" || context.workspace.role === "admin";
  const canSendInvoice = canManageInvoices && Boolean(invoice.customerEmail?.trim());
  const remainingAmountCents = Math.max(invoice.amountCents - invoice.paidAmountCents, 0);
  const sendActionLabel =
    invoice.deliveryStatus === "sent" ? "Resend Invoice" : "Send Invoice";

  const formatAmount = (amountCents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency,
    }).format(amountCents / 100);

  return (
    <section className="stack">
      {!canManageInvoices ? (
        <p className="status status-error">
          Only workspace owners and admins can manage invoices.
        </p>
      ) : null}

      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Invoice</p>
          <h2 className="section-title">{invoice.groupName?.trim() || invoice.customerName}</h2>
        </div>

        <div className="invoice-top-grid">
          <div className="invoice-top-stat">
            <span className="eyebrow">Group</span>
            <strong>{invoice.groupName?.trim() || "No group"}</strong>
          </div>

          <div className="invoice-top-stat">
            <span className="eyebrow">Customer</span>
            <strong>{invoice.customerName}</strong>
          </div>

          <div className="invoice-top-stat">
            <span className="eyebrow">Amount</span>
            <strong>{formatAmount(invoice.amountCents)}</strong>
          </div>

          <div className="invoice-top-stat">
            <span className="eyebrow">Status</span>
            <strong>{invoice.status}</strong>
          </div>
        </div>
      </section>

      <section className="surface section stack" id="invoice-next-actions">
        <div className="stack stack-tight">
          <p className="eyebrow">Next action</p>
          <h2 className="section-title">Move this invoice forward</h2>
        </div>

        <div className="invoice-primary-action">
          <button
            className="button-primary invoice-primary-button"
            type="submit"
            form="invoice-send-form"
            disabled={!canSendInvoice}
            title={!invoice.customerEmail?.trim() ? "Customer email required" : undefined}
          >
            {sendActionLabel}
          </button>

          <p className="muted invoice-primary-help">
            {!invoice.customerEmail?.trim()
              ? "Add a customer email before this invoice can be sent."
              : invoice.deliveryStatus === "sent"
                ? `Sends another copy to ${invoice.customerEmail.trim()}.`
                : `Finalizes the draft and sends it to ${invoice.customerEmail.trim()}.`}
          </p>
        </div>

        <div className="invoice-secondary-actions">
          <a className="button-secondary invoice-secondary-button" href="#invoice-payment-entry">
            + Record Payment
          </a>
        </div>

        <div className="invoice-utility-actions">
          <button
            className="invoice-utility-button"
            type="submit"
            form="invoice-editor-form"
            disabled={!canManageInvoices}
          >
            Save
          </button>

          <button
            className="invoice-utility-button invoice-utility-button-danger"
            type="submit"
            form="invoice-delete-form"
            disabled={!canManageInvoices}
          >
            Delete
          </button>
        </div>

        <p className="muted">
          Auto-save is not enabled yet, so save only after you finish draft edits.
        </p>
      </section>

      <form
        className="stack form-stack"
        id="invoice-editor-form"
        action={updateInvoiceDraftAction}
      >
        <input type="hidden" name="invoiceId" value={invoice.id} />

        <section className="surface section stack">
          <div className="stack stack-tight">
            <p className="eyebrow">Fields</p>
            <h2 className="section-title">Editable fields</h2>
          </div>

          <label className="field">
            <span>Invoice date</span>
            <input
              name="invoiceDate"
              type="date"
              defaultValue={values.invoiceDate}
              disabled={!canManageInvoices}
              required
            />
          </label>

          <label className="field">
            <span>Due date</span>
            <input
              name="dueDate"
              type="date"
              defaultValue={values.dueDate}
              disabled={!canManageInvoices}
            />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea
              className="textarea"
              name="notes"
              defaultValue={values.notes}
              placeholder="Notes"
              rows={5}
              disabled={!canManageInvoices}
            />
          </label>
        </section>

        <InvoiceItemsEditor
          initialItems={invoice.lineItems}
          disabled={!canManageInvoices}
        />
      </form>

      <form id="invoice-send-form" action={sendInvoicePlatformEmailAction}>
        <input type="hidden" name="invoiceId" value={invoice.id} />
        <input
          type="hidden"
          name="recipientEmail"
          value={invoice.customerEmail?.trim() || deliveryValues.recipientEmail}
        />
        <input
          type="hidden"
          name="actionType"
          value={invoice.deliveryStatus === "sent" ? followUpValues.actionType : "send"}
        />
        <input type="hidden" name="deliveryNote" value={deliveryValues.deliveryNote} />
      </form>

      <section className="surface section stack" id="invoice-payment-entry">
        <div className="stack stack-tight">
          <p className="eyebrow">Payment</p>
          <h2 className="section-title">+ Record Payment</h2>
          <p className="muted">
            Record a payment here. Payment history stays below for review.
          </p>
        </div>

        <form
          className="stack form-stack"
          id="invoice-payment-form"
          action={recordInvoicePaymentAction}
        >
          <input type="hidden" name="invoiceId" value={invoice.id} />

          <div className="grid grid-2">
            <label className="field">
              <span>Current payment snapshot</span>
              <input
                type="text"
                value={`${invoice.paymentStatus} • ${formatAmount(invoice.paidAmountCents)} received`}
                disabled
                readOnly
              />
            </label>

            <label className="field">
              <span>Remaining to collect</span>
              <input
                type="text"
                value={formatAmount(remainingAmountCents)}
                disabled
                readOnly
              />
            </label>

            <label className="field">
              <span>Payment amount (USD)</span>
              <input
                name="paidAmount"
                type="text"
                inputMode="decimal"
                defaultValue={paymentValues.paidAmount}
                placeholder="0.00"
                disabled={!canManageInvoices}
              />
            </label>
          </div>

          <div className="grid grid-2">
            <label className="field">
              <span>Payment date</span>
              <input
                name="paymentDate"
                type="date"
                defaultValue={paymentValues.paymentDate}
                disabled={!canManageInvoices}
              />
            </label>

            <label className="field">
              <span>Payment reference</span>
              <input
                name="paymentReference"
                type="text"
                defaultValue={paymentValues.paymentReference}
                placeholder="Reference"
                disabled={!canManageInvoices}
              />
            </label>
          </div>

          <label className="field">
            <span>Payment note</span>
            <textarea
              className="textarea"
              name="paymentNote"
              defaultValue={paymentValues.paymentNote}
              rows={4}
              placeholder="Payment note"
              disabled={!canManageInvoices}
            />
          </label>

          {paymentEvents.length > 0 ? (
            <p className="muted">
              Recording another payment adds a new entry to the payment history.
            </p>
          ) : null}

          <div className="invoice-payment-actions">
            <button
              className="button-secondary invoice-payment-submit"
              type="submit"
              disabled={!canManageInvoices}
            >
              + Record Payment
            </button>
          </div>
        </form>
      </section>

      <form id="invoice-delete-form" action={deleteInvoiceAction}>
        <input type="hidden" name="invoiceId" value={invoice.id} />
      </form>
    </section>
  );
}
