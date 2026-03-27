import type { ReceiptParseStatus } from "@/modules/cost-receipts/types";

const PARSER_NAME = "receipt_scaffold_heuristic";
const PARSER_VERSION = "v1";
const GENERIC_TOKENS = new Set([
  "img",
  "image",
  "scan",
  "receipt",
  "receipts",
  "upload",
  "uploaded",
  "file",
  "copy",
  "photo",
  "camera",
  "jpeg",
  "jpg",
  "png",
  "pdf",
  "heic",
  "doc",
  "statement",
  "cost",
]);

type ReceiptParserInput = {
  fileName: string | null;
  tempFileReference: string | null;
};

type ParsedReceiptCandidates = {
  candidateDate: string | null;
  candidateVendorName: string | null;
  candidateAmountCents: number | null;
  candidateDescription: string | null;
  candidateNote: string | null;
};

export type ReceiptParserResult = ParsedReceiptCandidates & {
  parseStatus: ReceiptParseStatus;
  parserName: string;
  parserVersion: string;
  parseAttemptedAt: string;
  parsedAt: string | null;
  parseError: string | null;
};

function cleanSourceLabel(value: string) {
  return value
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractDate(text: string) {
  const normalized = text.replace(/[_./]/g, "-");
  const isoMatch = normalized.match(/\b(20\d{2}-\d{1,2}-\d{1,2})\b/);

  if (isoMatch) {
    const [year, month, day] = isoMatch[1].split("-");

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const usMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);

  if (!usMatch) {
    return null;
  }

  return `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
}

function parseAmountToken(token: string) {
  const cleaned = token.replace(/[$,\s]/g, "");

  if (!/^-?\d+(?:\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const amount = Number.parseFloat(cleaned);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100);
}

function extractAmountCents(text: string) {
  const tokens = text.match(/\$?\d[\d,]*(?:\.\d{2})/g) ?? [];

  for (const token of tokens) {
    const parsed = parseAmountToken(token);

    if (typeof parsed === "number" && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function extractVendorName(text: string) {
  const tokens = cleanSourceLabel(text)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .filter((part) => !/^\d+$/.test(part))
    .filter((part) => !GENERIC_TOKENS.has(part.toLowerCase()));

  if (tokens.length === 0) {
    return null;
  }

  return titleCase(tokens.slice(0, 3).join(" "));
}

function extractDescription(text: string, vendorName: string | null) {
  const cleaned = cleanSourceLabel(text);
  const tokens = cleaned
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .filter((part) => !/^\d+$/.test(part))
    .filter((part) => !GENERIC_TOKENS.has(part.toLowerCase()));

  if (!cleaned || tokens.length < 2) {
    return null;
  }

  const normalizedDescription = titleCase(tokens.join(" "));

  if (
    vendorName &&
    normalizedDescription.toLowerCase() === vendorName.toLowerCase()
  ) {
    return null;
  }

  return normalizedDescription.slice(0, 120);
}

export function runReceiptParserScaffold(
  input: ReceiptParserInput,
): ReceiptParserResult {
  const source = [input.fileName, input.tempFileReference].filter(Boolean).join(" ");
  const attemptedAt = new Date().toISOString();
  const candidateDate = extractDate(source);
  const candidateAmountCents = extractAmountCents(source);
  const candidateVendorName = extractVendorName(source);
  const candidateDescription = extractDescription(source, candidateVendorName);
  const candidateNote =
    candidateDate || candidateAmountCents || candidateVendorName || candidateDescription
      ? input.fileName
        ? "Parser scaffold inferred candidates from the uploaded receipt reference."
        : input.tempFileReference
          ? "Parser scaffold inferred candidates from the temporary receipt reference."
          : null
      : null;

  const hasCandidates = Boolean(
    candidateDate ||
      candidateAmountCents ||
      candidateVendorName ||
      candidateDescription ||
      candidateNote,
  );

  return {
    parseStatus: hasCandidates ? "parsed" : "failed",
    parserName: PARSER_NAME,
    parserVersion: PARSER_VERSION,
    parseAttemptedAt: attemptedAt,
    parsedAt: hasCandidates ? attemptedAt : null,
    parseError: hasCandidates
      ? null
      : "The parser scaffold could not infer candidate fields from this receipt source yet.",
    candidateDate,
    candidateVendorName,
    candidateAmountCents,
    candidateDescription,
    candidateNote,
  };
}
