"use client";

import { useState } from "react";

import type {
  LineItemEditorValue,
  LineItemRecord,
} from "@/modules/line-items/types";

type RevenueLineItemsEditorProps = {
  initialItems: LineItemRecord[];
  disabled: boolean;
};

function formatAmount(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

function createEmptyLineItem(): LineItemEditorValue {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `line-item-${Math.random().toString(36).slice(2, 9)}`,
    title: "",
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    serviceDate: "",
  };
}

function toEditorValue(item: LineItemRecord): LineItemEditorValue {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    quantity: item.quantity.toString(),
    unitPrice: (item.unitPriceCents / 100).toFixed(2),
    serviceDate: item.serviceDate ?? "",
  };
}

function sanitizeMoney(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function sanitizeQuantity(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function getLineItemAmountPreview(item: LineItemEditorValue) {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);

  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return "$0.00";
  }

  return formatAmount(Math.round(quantity * unitPrice * 100));
}

export function RevenueLineItemsEditor({
  initialItems,
  disabled,
}: RevenueLineItemsEditorProps) {
  const [items, setItems] = useState<LineItemEditorValue[]>(
    initialItems.length > 0 ? initialItems.map(toEditorValue) : [],
  );

  const updateItem = (
    itemId: string,
    key: keyof LineItemEditorValue,
    value: string,
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [key]:
                key === "unitPrice"
                  ? sanitizeMoney(value)
                  : key === "quantity"
                    ? sanitizeQuantity(value)
                    : value,
            }
          : item,
      ),
    );
  };

  const moveItem = (itemId: string, direction: -1 | 1) => {
    setItems((currentItems) => {
      const index = currentItems.findIndex((item) => item.id === itemId);

      if (index < 0) {
        return currentItems;
      }

      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= currentItems.length) {
        return currentItems;
      }

      const updatedItems = [...currentItems];
      const [movedItem] = updatedItems.splice(index, 1);
      updatedItems.splice(nextIndex, 0, movedItem);
      return updatedItems;
    });
  };

  const totalAmountCents = items.reduce((total, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      return total;
    }

    return total + Math.round(quantity * unitPrice * 100);
  }, 0);

  return (
    <section className="surface section stack">
      <div className="line-items-section-header">
        <div className="stack stack-tight">
          <p className="eyebrow">Line items</p>
          <h2 className="section-title">Revenue items</h2>
          <p className="muted">
            Add the first usable item list here. Revenue totals are derived from these
            draft items.
          </p>
        </div>

        {!disabled ? (
          <button
            className="button-secondary line-item-add-button"
            type="button"
            onClick={() => setItems((currentItems) => [...currentItems, createEmptyLineItem()])}
          >
            Add item
          </button>
        ) : null}
      </div>

      <input type="hidden" name="lineItems" value={JSON.stringify(items)} />

      <div className="surface line-items-total-card">
        <p className="eyebrow">Draft total</p>
        <strong>{formatAmount(totalAmountCents)}</strong>
      </div>

      {items.length === 0 ? (
        <p className="status status-message">
          No line items yet. Add the first item to define this revenue draft.
        </p>
      ) : (
        <div className="stack line-items-list">
          {items.map((item, index) => (
            <article className="line-item-card" key={item.id}>
              <div className="line-item-header">
                <div className="stack stack-tight">
                  <strong>Item {index + 1}</strong>
                  <span className="muted">
                    Line total preview: {getLineItemAmountPreview(item)}
                  </span>
                </div>

                {!disabled ? (
                  <div className="line-item-controls">
                    <button
                      className="button-secondary line-item-control-button"
                      type="button"
                      onClick={() => moveItem(item.id, -1)}
                      disabled={index === 0}
                    >
                      Up
                    </button>
                    <button
                      className="button-secondary line-item-control-button"
                      type="button"
                      onClick={() => moveItem(item.id, 1)}
                      disabled={index === items.length - 1}
                    >
                      Down
                    </button>
                    <button
                      className="button-secondary line-item-control-button"
                      type="button"
                      onClick={() =>
                        setItems((currentItems) =>
                          currentItems.filter((currentItem) => currentItem.id !== item.id),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>

              <label className="field">
                <span>Title</span>
                <input
                  type="text"
                  value={item.title}
                  onChange={(event) => updateItem(item.id, "title", event.target.value)}
                  placeholder="Strategy session"
                  disabled={disabled}
                />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  className="textarea line-item-textarea"
                  value={item.description}
                  onChange={(event) =>
                    updateItem(item.id, "description", event.target.value)
                  }
                  placeholder="Optional scope or context for this item."
                  rows={3}
                  disabled={disabled}
                />
              </label>

              <div className="grid grid-3 line-item-fields-grid">
                <label className="field">
                  <span>Quantity</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.id, "quantity", event.target.value)
                    }
                    placeholder="1"
                    disabled={disabled}
                  />
                </label>

                <label className="field">
                  <span>Unit price</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateItem(item.id, "unitPrice", event.target.value)
                    }
                    placeholder="0.00"
                    disabled={disabled}
                  />
                </label>

                <label className="field">
                  <span>Service date</span>
                  <input
                    type="date"
                    value={item.serviceDate}
                    onChange={(event) =>
                      updateItem(item.id, "serviceDate", event.target.value)
                    }
                    disabled={disabled}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
