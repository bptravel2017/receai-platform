import type { LineItemRecord } from "@/modules/line-items/types";

type LineItemsDisplayProps = {
  items: LineItemRecord[];
  emptyMessage: string;
};

function formatAmount(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

function formatServiceDate(value: string | null) {
  if (!value) {
    return "No item date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function LineItemsDisplay({
  items,
  emptyMessage,
}: LineItemsDisplayProps) {
  if (items.length === 0) {
    return <p className="status status-message">{emptyMessage}</p>;
  }

  return (
    <div className="stack line-items-list">
      {items.map((item, index) => (
        <article className="line-item-card" key={item.id}>
          <div className="line-item-header">
            <div className="stack stack-tight">
              <strong>
                {index + 1}. {item.title}
              </strong>
              <span className="muted">
                Qty {item.quantity} • {formatAmount(item.unitPriceCents)} each
              </span>
            </div>
            <strong>{formatAmount(item.amountCents)}</strong>
          </div>

          {item.description?.trim() ? (
            <p className="muted line-item-description">{item.description}</p>
          ) : null}

          <p className="muted line-item-meta">
            Service date: {formatServiceDate(item.serviceDate)}
          </p>
        </article>
      ))}
    </div>
  );
}
