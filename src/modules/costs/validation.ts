import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CostsError } from "@/modules/costs/costs";
import type { CostPaymentStatus, CostType } from "@/modules/costs/types";

export type CostValidationInput = {
  costScope?: string;
  costDate: string;
  serviceDate?: string;
  groupName?: string;
  vendorName?: string;
  note?: string;
  costCategoryId?: string;
  revenueRecordId?: string;
  invoiceId?: string;
  revenueRecordItemId?: string;
  costType?: string;
  revenueId?: string;
  customerId?: string;
  groupId?: string;
  vendorId?: string;
  driverId?: string;
  guideId?: string;
  costName?: string;
  description: string;
  amount: string;
  paymentStatus?: string;
  notesInternal?: string;
};

export type ValidatedCostValues = {
  cost_date: string;
  cost_type: CostType;
  revenue_id: string | null;
  customer_id: string | null;
  group_id: string | null;
  vendor_id: string | null;
  driver_id: string | null;
  guide_id: string | null;
  cost_name: string;
  description: string | null;
  amount_cents: number;
  currency: "USD";
  payment_status: CostPaymentStatus;
  notes_internal: string | null;
};

export function getTrimmedField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptional(value: string) {
  return value.length > 0 ? value : null;
}

export function withStatus(path: string, key: "error" | "message", value: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(key, value);
  return `${path}?${searchParams.toString()}`;
}

export function parseAmountToCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new CostsError("Enter a valid cost amount with up to 2 decimals.");
  }

  const amountCents = Math.round(Number(value) * 100);

  if (amountCents <= 0) {
    throw new CostsError("Cost amount must be greater than zero.");
  }

  return amountCents;
}

export function formatCentsAsAmount(value: number) {
  return (value / 100).toFixed(2);
}

async function assertRecordInWorkspace(
  table: "customers" | "revenue_records" | "fulfillment_parties" | "groups",
  workspaceId: string,
  id: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw new CostsError(
      `Selected ${table.replace(/_/g, " ")} is not available in this workspace.`,
    );
  }
}

export async function validateCostInput(
  input: CostValidationInput,
  workspaceId: string,
): Promise<ValidatedCostValues> {
  if (input.groupName?.trim()) {
    console.warn(
      "[groups] Deprecated groupName input received in validateCostInput. group_id is the only supported logical group key.",
    );
  }

  const costDate = input.costDate.trim();
  const legacyCostScope = input.costScope?.trim() ?? "";
  const costTypeInput = input.costType?.trim() ?? "";
  const legacyVendorName = input.vendorName?.trim() ?? "";
  const legacyNotes = input.note?.trim() ?? "";
  const costType = costTypeInput || (legacyCostScope === "company" ? "overhead" : "");
  const revenueId = (input.revenueId || input.revenueRecordId || "").trim();
  const customerId = (input.customerId || "").trim();
  const groupId = (input.groupId || "").trim();
  const vendorId = (input.vendorId || "").trim();
  const driverId = (input.driverId || "").trim();
  const guideId = (input.guideId || "").trim();
  const costName = (input.costName || legacyVendorName).trim();
  const description = input.description.trim();
  const amount = input.amount.trim();
  const paymentStatus = (input.paymentStatus || "").trim();
  const notesInternal = (input.notesInternal || legacyNotes).trim();
  const normalizedCostType =
    costType ||
    (revenueId
      ? "revenue"
      : customerId
        ? "customer"
        : groupId
          ? "group"
          : "overhead");

  if (!costDate) {
    throw new CostsError("Choose a cost date.");
  }

  if (
    normalizedCostType !== "revenue" &&
    normalizedCostType !== "customer" &&
    normalizedCostType !== "group" &&
    normalizedCostType !== "overhead"
  ) {
    throw new CostsError("Choose a valid cost type.");
  }

  if (costName.length < 2) {
    throw new CostsError("Cost name must be at least 2 characters.");
  }

  const normalizedPaymentStatus = paymentStatus || "unpaid";

  if (normalizedPaymentStatus !== "unpaid" && normalizedPaymentStatus !== "paid") {
    throw new CostsError("Choose a valid payment status.");
  }

  if (notesInternal.length > 4000) {
    throw new CostsError("Internal notes must stay under 4000 characters.");
  }

  const amountCents = parseAmountToCents(amount);

  if (normalizedCostType === "revenue" && !revenueId) {
    throw new CostsError("Revenue-linked costs require a Daytime entry.");
  }

  if (normalizedCostType === "customer" && !customerId) {
    throw new CostsError("Customer-level costs require a customer.");
  }

  if (normalizedCostType === "group" && !groupId) {
    throw new CostsError("Group-level costs require a group.");
  }

  if (normalizedCostType === "overhead" && (revenueId || customerId || groupId)) {
    throw new CostsError("Overhead costs cannot be linked to revenue, customer, or group.");
  }

  if (revenueId) {
    await assertRecordInWorkspace("revenue_records", workspaceId, revenueId);
  }

  if (customerId) {
    await assertRecordInWorkspace("customers", workspaceId, customerId);
  }

  if (groupId) {
    await assertRecordInWorkspace("groups", workspaceId, groupId);
  }

  if (vendorId) {
    await assertRecordInWorkspace("fulfillment_parties", workspaceId, vendorId);
  }

  if (driverId) {
    await assertRecordInWorkspace("fulfillment_parties", workspaceId, driverId);
  }

  if (guideId) {
    await assertRecordInWorkspace("fulfillment_parties", workspaceId, guideId);
  }

  return {
    cost_date: costDate,
    cost_type: normalizedCostType as CostType,
    revenue_id: normalizeOptional(revenueId),
    customer_id: normalizeOptional(customerId),
    group_id: normalizeOptional(groupId),
    vendor_id: normalizeOptional(vendorId),
    driver_id: normalizeOptional(driverId),
    guide_id: normalizeOptional(guideId),
    cost_name: costName,
    description: normalizeOptional(description),
    amount_cents: amountCents,
    currency: "USD",
    payment_status: normalizedPaymentStatus as CostPaymentStatus,
    notes_internal: normalizeOptional(notesInternal),
  };
}

export async function validateCostFormData(
  formData: FormData,
  workspaceId: string,
) {
  return validateCostInput(
    {
      costDate: getTrimmedField(formData, "costDate"),
      costType: getTrimmedField(formData, "costType"),
      revenueId: getTrimmedField(formData, "revenueId"),
      customerId: getTrimmedField(formData, "customerId"),
      groupId: getTrimmedField(formData, "groupId"),
      vendorId: getTrimmedField(formData, "vendorId"),
      driverId: getTrimmedField(formData, "driverId"),
      guideId: getTrimmedField(formData, "guideId"),
      costName: getTrimmedField(formData, "costName"),
      description: getTrimmedField(formData, "description"),
      amount: getTrimmedField(formData, "amount"),
      paymentStatus: getTrimmedField(formData, "paymentStatus"),
      notesInternal: getTrimmedField(formData, "notesInternal"),
    },
    workspaceId,
  );
}
