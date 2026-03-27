"use client";

import { useState } from "react";

import type { LineItemRecord } from "@/modules/line-items/types";

type InvoiceItemsEditorProps = {
  initialItems: LineItemRecord[];
  disabled: boolean;
};

type InvoiceItemEditorValue = {
  id: string;
  description: string;
  amount: string;
};

function sanitizeMoney(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function createItem(): InvoiceItemEditorValue {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `invoice-item-${Math.random().toString(36).slice(2, 9)}`,
    description: "",
    amount: "0.00",
  };
}

function toEditorValue(item: LineItemRecord): InvoiceItemEditorValue {
  return {
    id: item.id,
    description: item.description?.trim() || item.title,
    amount: (item.amountCents / 100).toFixed(2),
  };
}

function formatAmount(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

export function InvoiceItemsEditor({
  initialItems,
  disabled,
}: InvoiceItemsEditorProps) {
  const [items, setItems] = useState<InvoiceItemEditorValue[]>(
    initialItems.length > 0 ? initialItems.map(toEditorValue) : [createItem()],
  );

  const totalAmountCents = items.reduce((total, item) => {
    const amount = Number(item.amount);

    if (!Number.isFinite(amount)) {
      return total;
    }

    return total + Math.round(amount * 100);
  }, 0);

  const lineItems = JSON.stringify(
    items.map((item, index) => {
      const description = item.description.trim();

      return {
        id: item.id,
        title: description || `Item ${index + 1}`,
        description,
        quantity: "1",
        unitPrice: item.amount.trim() || "0.00",
        serviceDate: "",
      };
    }),
  );

  return (
    <section className="surface section stack">
      <div className="invoice-section-header">
        <div className="stack stack-tight">
          <p className="eyebrow">Items</p>
          <h2 className="section-title">Invoice items</h2>
        </div>

        {!disabled ? (
          <button
            className="button-secondary"
            type="button"
            onClick={() => setItems((current) => [...current, createItem()])}
          >
            Add item
          </button>
        ) : null}
      </div>

      <input type="hidden" name="lineItems" value={lineItems} />

      <div className="surface line-items-total-card">
        <p className="eyebrow">Amount</p>
        <strong>{formatAmount(totalAmountCents)}</strong>
      </div>

      {items.length === 0 ? (
        <p className="status status-message">No items yet.</p>
      ) : (
        <div className="stack invoice-items-list">
          {items.map((item, index) => (
            <div className="invoice-item-row" key={item.id}>
              <label className="field">
                <span>Description</span>
                <input
                  type="text"
                  value={item.description}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? { ...currentItem, description: event.target.value }
                          : currentItem,
                      ),
                    )
                  }
                  placeholder={`Item ${index + 1}`}
                  disabled={disabled}
                />
              </label>

              <label className="field invoice-item-amount-field">
                <span>Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.amount}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? {
                              ...currentItem,
                              amount: sanitizeMoney(event.target.value),
                            }
                          : currentItem,
                      ),
                    )
                  }
                  placeholder="0.00"
                  disabled={disabled}
                />
              </label>

              {!disabled ? (
                <button
                  className="button-secondary invoice-item-delete-button"
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((currentItem) => currentItem.id !== item.id),
                    )
                  }
                >
                  Delete
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
