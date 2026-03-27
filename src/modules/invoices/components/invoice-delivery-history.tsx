import type { InvoiceDeliveryEventRecord } from "@/modules/invoices/types";

type InvoiceDeliveryHistoryProps = {
  events: InvoiceDeliveryEventRecord[];
};

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

function formatMethod(method: InvoiceDeliveryEventRecord["deliveryMethod"]) {
  if (method === "platform_email") {
    return "Platform email";
  }

  return method === "external_email" ? "External email" : "Manual share";
}

function formatActionType(actionType: InvoiceDeliveryEventRecord["actionType"]) {
  if (actionType === "reminder") {
    return "Reminder";
  }

  if (actionType === "resend") {
    return "Resend";
  }

  return "Send";
}

export function InvoiceDeliveryHistory({
  events,
}: InvoiceDeliveryHistoryProps) {
  if (events.length === 0) {
    return (
      <div className="surface revenue-line-items-note">
        <p className="eyebrow">Delivery history</p>
        <p className="muted">
          No finalized delivery records exist yet. Draft invoices stay outside this
          workflow until they are finalized and explicitly sent.
        </p>
      </div>
    );
  }

  return (
    <div className="surface revenue-line-items-note stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Delivery history</p>
        <p className="muted">
          Delivery records stay internal to the workspace and do not appear in the
          customer-facing invoice render.
        </p>
      </div>

      <div className="stack customer-list">
        {events.map((event) => (
          <article className="customer-card" key={event.id}>
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{formatMethod(event.deliveryMethod)}</strong>
                <span className="muted">
                  {formatActionType(event.actionType)} • {formatDate(event.createdAt)}
                </span>
              </div>
              <div className="cost-link-row">
                <span className="role-badge">{event.actionType}</span>
                <span className="role-badge">{event.deliveryStatus}</span>
                <span className="role-badge">{event.deliveryMethod}</span>
              </div>
            </div>

            <div className="revenue-card-meta">
              <p className="muted">
                <strong>Recipient:</strong>{" "}
                {event.recipientEmail?.trim() || "No recipient email saved"}
              </p>
              <p className="muted">
                <strong>Reply-to:</strong>{" "}
                {event.replyToEmail?.trim() || "No reply-to email"}
              </p>
              {event.providerMessageId?.trim() ? (
                <p className="muted">
                  <strong>Provider ID:</strong> {event.providerMessageId}
                </p>
              ) : null}
            </div>

            {event.note?.trim() ? (
              <p className="muted customer-notes-preview">{event.note}</p>
            ) : null}
            {event.errorMessage?.trim() ? (
              <p className="status status-error">{event.errorMessage}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
