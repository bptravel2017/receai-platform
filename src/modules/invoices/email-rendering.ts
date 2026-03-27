import type { InvoicePrintView } from "@/modules/invoices/rendering";
import type { InvoiceDeliveryActionType } from "@/modules/invoices/types";

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatAmount(amountCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInvoiceEmailContent(
  view: InvoicePrintView,
  actionType: InvoiceDeliveryActionType,
) {
  const subjectPrefix =
    actionType === "reminder"
      ? "Reminder:"
      : actionType === "resend"
        ? "Resending:"
        : "Invoice";
  const subject = `${subjectPrefix} ${view.invoice.invoiceNumber} from ${view.issuer.workspaceName}`;
  const introLine =
    actionType === "reminder"
      ? `This is a reminder for invoice ${view.invoice.invoiceNumber} from ${view.issuer.workspaceName}.`
      : actionType === "resend"
        ? `We are resending invoice ${view.invoice.invoiceNumber} from ${view.issuer.workspaceName}.`
        : `Please find invoice ${view.invoice.invoiceNumber} from ${view.issuer.workspaceName}.`;
  const customerLabel = view.customer.company?.trim()
    ? `${view.customer.name} (${view.customer.company})`
    : view.customer.name;

  const text = [
    `Hello ${view.customer.name},`,
    "",
    introLine,
    `Invoice date: ${formatDate(view.invoice.invoiceDate)}`,
    `Due date: ${formatDate(view.invoice.dueDate)}`,
    `Total due: ${formatAmount(view.totalCents, view.invoice.currency)}`,
    "",
    "Line items:",
    ...view.invoice.lineItems.map(
      (item, index) =>
        `${index + 1}. ${item.title} | Qty ${item.quantity} | ${formatAmount(item.amountCents, view.invoice.currency)}`,
    ),
    "",
    view.invoice.notes?.trim() ? `Notes: ${view.invoice.notes}` : "Notes: None",
    "",
    `Issued to: ${customerLabel}`,
  ].join("\n");

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #2f241d; max-width: 720px; margin: 0 auto; padding: 24px;">
      <p style="text-transform: uppercase; letter-spacing: 0.12em; color: #8a6751; font-size: 12px;">Invoice</p>
      <h1 style="margin: 0 0 8px; font-size: 32px;">${escapeHtml(view.issuer.workspaceName)}</h1>
      <p style="margin: 0 0 24px; color: #6f665c;">Invoice ${escapeHtml(view.invoice.invoiceNumber ?? "")}</p>
      <p style="margin: 0 0 24px; color: #6f665c;">${escapeHtml(introLine)}</p>

      <div style="display: grid; gap: 12px; margin-bottom: 24px;">
        <div><strong>Invoice date:</strong> ${escapeHtml(formatDate(view.invoice.invoiceDate))}</div>
        <div><strong>Due date:</strong> ${escapeHtml(formatDate(view.invoice.dueDate))}</div>
        <div><strong>Bill to:</strong> ${escapeHtml(view.customer.name)}${view.customer.company?.trim() ? `, ${escapeHtml(view.customer.company)}` : ""}</div>
        ${view.invoice.groupName?.trim() ? `<div><strong>Group:</strong> ${escapeHtml(view.invoice.groupName)}</div>` : ""}
      </div>

      <div style="border: 1px solid #dbc7b6; border-radius: 18px; padding: 18px; margin-bottom: 24px; background: #fffdf8;">
        ${view.invoice.lineItems
          .map(
            (item, index) => `
              <div style="padding: ${index === 0 ? "0" : "16px 0 0"}; ${index === 0 ? "" : "border-top: 1px solid #ebdfd4; margin-top: 16px;"}">
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <strong>${escapeHtml(`${index + 1}. ${item.title}`)}</strong>
                  <strong>${escapeHtml(formatAmount(item.amountCents, view.invoice.currency))}</strong>
                </div>
                ${item.description?.trim() ? `<p style="margin: 8px 0 0; color: #6f665c;">${escapeHtml(item.description)}</p>` : ""}
                <p style="margin: 8px 0 0; color: #6f665c;">Qty ${escapeHtml(String(item.quantity))} at ${escapeHtml(formatAmount(item.unitPriceCents, view.invoice.currency))} each</p>
              </div>
            `,
          )
          .join("")}
      </div>

      <div style="border: 1px solid #dbc7b6; border-radius: 18px; padding: 18px; margin-bottom: 24px; background: #fffdf8;">
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span>Total due</span>
          <strong>${escapeHtml(formatAmount(view.totalCents, view.invoice.currency))}</strong>
        </div>
      </div>

      <div style="border: 1px solid #dbc7b6; border-radius: 18px; padding: 18px; background: #fffdf8;">
        <p style="margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.12em; color: #8a6751; font-size: 12px;">Notes</p>
        <p style="margin: 0; color: #6f665c;">${escapeHtml(view.invoice.notes?.trim() || "No additional notes.")}</p>
      </div>
    </div>
  `.trim();

  return { subject, text, html };
}
