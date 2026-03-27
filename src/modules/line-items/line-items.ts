import type {
  LineItemEditorValue,
  LineItemRecord,
} from "@/modules/line-items/types";

export class LineItemsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LineItemsError";
  }
}

function parseDecimal(value: string, fieldName: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new LineItemsError(`${fieldName} must be a valid number with up to 2 decimals.`);
  }

  return Number(value);
}

export function normalizeStoredLineItems(value: unknown): LineItemRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Partial<LineItemRecord>;

    if (
      typeof record.id !== "string" ||
      typeof record.title !== "string" ||
      typeof record.quantity !== "number" ||
      typeof record.unitPriceCents !== "number" ||
      typeof record.amountCents !== "number"
    ) {
      return [];
    }

    return [
      {
        id: record.id,
        title: record.title,
        description:
          typeof record.description === "string" ? record.description : null,
        serviceCategory:
          typeof record.serviceCategory === "string"
            ? record.serviceCategory
            : null,
        quantity: record.quantity,
        unitPriceCents: record.unitPriceCents,
        amountCents: record.amountCents,
        serviceDate:
          typeof record.serviceDate === "string" ? record.serviceDate : null,
        groupDate:
          typeof record.groupDate === "string" ? record.groupDate : null,
      },
    ];
  });
}

export function getLineItemEditorValues(
  items: LineItemRecord[],
): LineItemEditorValue[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    serviceCategory: item.serviceCategory ?? "",
    quantity: item.quantity.toFixed(
      Number.isInteger(item.quantity) ? 0 : 2,
    ),
    unitPrice: (item.unitPriceCents / 100).toFixed(2),
    serviceDate: item.serviceDate ?? "",
    groupDate: item.groupDate ?? "",
  }));
}

export function parseLineItemsJson(value: string): LineItemRecord[] {
  if (!value.trim()) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new LineItemsError("We could not read the line items in this draft.");
  }

  if (!Array.isArray(parsed)) {
    throw new LineItemsError("Line items must be submitted as a list.");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new LineItemsError(`Line item ${index + 1} is invalid.`);
    }

    const valueRecord = item as Partial<LineItemEditorValue>;
    const title = typeof valueRecord.title === "string" ? valueRecord.title.trim() : "";
    const description =
      typeof valueRecord.description === "string"
        ? valueRecord.description.trim()
        : "";
    const quantityValue =
      typeof valueRecord.quantity === "string"
        ? valueRecord.quantity.trim()
        : "";
    const unitPriceValue =
      typeof valueRecord.unitPrice === "string"
        ? valueRecord.unitPrice.trim()
        : "";
    const serviceDate =
      typeof valueRecord.serviceDate === "string"
        ? valueRecord.serviceDate.trim()
        : "";
    const serviceCategory =
      typeof valueRecord.serviceCategory === "string"
        ? valueRecord.serviceCategory.trim()
        : "";
    const groupDate =
      typeof valueRecord.groupDate === "string"
        ? valueRecord.groupDate.trim()
        : "";
    const id =
      typeof valueRecord.id === "string" && valueRecord.id.trim().length > 0
        ? valueRecord.id
        : `line-item-${index + 1}`;

    if (title.length < 2) {
      throw new LineItemsError(`Line item ${index + 1} needs a title.`);
    }

    const quantity = parseDecimal(quantityValue, `Line item ${index + 1} quantity`);
    const unitPrice = parseDecimal(
      unitPriceValue,
      `Line item ${index + 1} unit price`,
    );

    if (quantity <= 0) {
      throw new LineItemsError(`Line item ${index + 1} quantity must be greater than 0.`);
    }

    if (description.length > 1000) {
      throw new LineItemsError(`Line item ${index + 1} description is too long.`);
    }

    const unitPriceCents = Math.round(unitPrice * 100);

    return {
      id,
      title,
      description: description || null,
      serviceCategory: serviceCategory || null,
      quantity,
      unitPriceCents,
      amountCents: Math.round(quantity * unitPriceCents),
      serviceDate: serviceDate || null,
      groupDate: groupDate || null,
    } satisfies LineItemRecord;
  });
}

export function sumLineItemsAmount(items: LineItemRecord[]) {
  return items.reduce((total, item) => total + item.amountCents, 0);
}
