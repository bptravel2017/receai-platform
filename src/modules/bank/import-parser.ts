import { BankError } from "@/modules/bank/bank";

export type ParsedBankImportRow = {
  transaction_date: string;
  amount_cents: number;
  currency: string;
  description: string;
  reference: string | null;
};

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseAmountToCents(value: string) {
  const normalized = value.replace(/,/g, "").trim();

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new BankError("Each transaction amount must be a valid number with up to 2 decimals.");
  }

  return Math.round(Number(normalized) * 100);
}

function validateDate(value: string, label: string) {
  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new BankError(`${label} needs a transaction date in YYYY-MM-DD format.`);
  }

  return trimmed;
}

function validateDescription(value: string, label: string) {
  const trimmed = value.trim();

  if (trimmed.length < 2) {
    throw new BankError(`${label} needs a description.`);
  }

  return trimmed;
}

export function parseManualImportLines(value: string): ParsedBankImportRow[] {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new BankError("Add at least one bank transaction line to import.");
  }

  return lines.map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    const [transactionDate, amount, description, reference] = parts;
    const label = `Line ${index + 1}`;

    if (!amount) {
      throw new BankError(`${label} needs an amount.`);
    }

    return {
      transaction_date: validateDate(transactionDate ?? "", label),
      amount_cents: parseAmountToCents(amount),
      currency: "USD",
      description: validateDescription(description ?? "", label),
      reference: normalizeOptional(reference ?? ""),
    };
  });
}

function parseCsvText(input: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;
  const text = input.replace(/^\uFEFF/, "");

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue);
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow);
  }

  if (inQuotes) {
    throw new BankError("The CSV file could not be parsed because it contains an unmatched quote.");
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function resolveHeaderIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.includes(header));
}

export function parseCsvImportFile(args: {
  fileName: string;
  fileText: string;
}): ParsedBankImportRow[] {
  const normalizedFileName = args.fileName.trim().toLowerCase();

  if (!normalizedFileName.endsWith(".csv")) {
    throw new BankError("Upload a CSV file for this first bank import workflow.");
  }

  const rows = parseCsvText(args.fileText);

  if (rows.length < 2) {
    throw new BankError("The CSV file needs a header row and at least one bank transaction row.");
  }

  const headers = rows[0].map(normalizeHeader);
  const transactionDateIndex = resolveHeaderIndex(headers, [
    "transaction_date",
    "date",
    "posted_date",
    "posting_date",
  ]);
  const amountIndex = resolveHeaderIndex(headers, [
    "amount",
    "transaction_amount",
    "deposit_amount",
    "credit_amount",
  ]);
  const descriptionIndex = resolveHeaderIndex(headers, [
    "description",
    "details",
    "memo",
    "payee",
  ]);
  const referenceIndex = resolveHeaderIndex(headers, [
    "reference",
    "ref",
    "reference_number",
    "check_number",
    "transaction_id",
  ]);

  if (transactionDateIndex === -1 || amountIndex === -1 || descriptionIndex === -1) {
    throw new BankError(
      "The CSV file must include date, amount, and description headers. Supported examples: date, transaction_date, amount, description, reference.",
    );
  }

  return rows.slice(1).map((row, index) => {
    const label = `CSV row ${index + 2}`;
    const amount = row[amountIndex] ?? "";

    if (!amount.trim()) {
      throw new BankError(`${label} needs an amount.`);
    }

    return {
      transaction_date: validateDate(row[transactionDateIndex] ?? "", label),
      amount_cents: parseAmountToCents(amount),
      currency: "USD",
      description: validateDescription(row[descriptionIndex] ?? "", label),
      reference:
        referenceIndex === -1 ? null : normalizeOptional(row[referenceIndex] ?? ""),
    };
  });
}
