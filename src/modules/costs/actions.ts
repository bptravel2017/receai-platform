"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertCanManageCosts,
  CostsError,
  getCostById,
  mapCostCategoryRow,
} from "@/modules/costs/costs";
import { assertPlanAccess } from "@/modules/plans/access";
import {
  type CostValidationInput,
  getTrimmedField,
  validateCostFormData,
  validateCostInput,
  withStatus,
} from "@/modules/costs/validation";

export async function createCostRecord(
  context: AuthenticatedAppContext,
  input: CostValidationInput,
) {
  assertCanManageCosts(context);

  const values = await validateCostInput(input, context.workspace.id);
  const supabase = await createSupabaseServerClient();
  const paidAt = values.payment_status === "paid" ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from("costs")
    .insert({
      workspace_id: context.workspace.id,
      ...values,
      paid_at: paidAt,
      created_by_user_id: context.user.id,
      updated_by_user_id: context.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new CostsError("We could not create that cost.");
  }

  const created = await getCostById(context, data.id);

  if (!created) {
    throw new CostsError("We could not load that cost after creation.");
  }

  return created.cost;
}

export async function createCostAction(formData: FormData) {
  const context = await requireAuthenticatedAppContext();

  try {
    const created = await createCostRecord(context, {
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
    });

    redirect(withStatus(`/costs/${created.id}`, "message", "Cost created."));
  } catch (error) {
    const message =
      error instanceof CostsError ? error.message : "We could not create that cost.";

    redirect(withStatus("/costs/new", "error", message));
  }
}

export async function createRevenueCostAction(formData: FormData) {
  const revenueId = getTrimmedField(formData, "revenueId");
  const customerId = getTrimmedField(formData, "customerId");
  const groupId = getTrimmedField(formData, "groupId");
  const context = await requireAuthenticatedAppContext();

  try {
    await createCostRecord(context, {
      costDate: getTrimmedField(formData, "costDate"),
      costType: "revenue",
      revenueId,
      customerId,
      groupId,
      vendorId: getTrimmedField(formData, "vendorId"),
      driverId: getTrimmedField(formData, "driverId"),
      guideId: getTrimmedField(formData, "guideId"),
      costName: getTrimmedField(formData, "costName"),
      description: "",
      amount: getTrimmedField(formData, "amount"),
      paymentStatus: getTrimmedField(formData, "paymentStatus") || "unpaid",
      notesInternal: "",
    });

    redirect(withStatus(`/revenue/${revenueId}`, "message", "Cost added."));
  } catch (error) {
    const message =
      error instanceof CostsError ? error.message : "We could not add that cost.";

    redirect(withStatus(`/revenue/${revenueId}`, "error", message));
  }
}

export async function updateCostAction(formData: FormData) {
  const costId = getTrimmedField(formData, "costId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageCosts(context);

    const values = await validateCostFormData(formData, context.workspace.id);
    const paidAt = values.payment_status === "paid" ? new Date().toISOString() : null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("costs")
      .update({
        ...values,
        paid_at: paidAt,
        updated_by_user_id: context.user.id,
      })
      .eq("id", costId)
      .eq("workspace_id", context.workspace.id)
      .select("id")
      .single();

    if (error || !data) {
      throw new CostsError("We could not save that cost.");
    }

    redirect(withStatus(`/costs/${costId}`, "message", "Cost updated."));
  } catch (error) {
    const message =
      error instanceof CostsError ? error.message : "We could not save that cost.";

    redirect(withStatus(`/costs/${costId}`, "error", message));
  }
}

export async function markCostPaidRecord(
  context: AuthenticatedAppContext,
  costId: string,
) {
  assertPlanAccess(context, "payables_basic");
  assertCanManageCosts(context);

  const supabase = await createSupabaseServerClient();
  const paidAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("costs")
    .update({
      payment_status: "paid",
      paid_at: paidAt,
      updated_by_user_id: context.user.id,
    })
    .eq("id", costId)
    .eq("workspace_id", context.workspace.id)
    .select("id")
    .single();

  if (error || !data) {
    throw new CostsError("We could not mark that cost as paid.");
  }

  const updated = await getCostById(context, costId);

  if (!updated) {
    throw new CostsError("We could not load that cost after payment update.");
  }

  return updated.cost;
}

export async function markCostsPaidRecord(
  context: AuthenticatedAppContext,
  costIds: string[],
) {
  assertPlanAccess(context, "payables_bulk");
  assertCanManageCosts(context);

  if (costIds.length === 0) {
    throw new CostsError("Select at least one cost to mark as paid.");
  }

  const supabase = await createSupabaseServerClient();
  const paidAt = new Date().toISOString();
  const { error } = await supabase
    .from("costs")
    .update({
      payment_status: "paid",
      paid_at: paidAt,
      updated_by_user_id: context.user.id,
    })
    .eq("workspace_id", context.workspace.id)
    .in("id", costIds);

  if (error) {
    throw new CostsError("We could not mark the selected costs as paid.");
  }
}

type CostCategoryRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type CostCategoryInput = {
  name: string;
  description?: string | null;
};

export async function createCostCategoryRecord(
  context: AuthenticatedAppContext,
  input: CostCategoryInput,
) {
  assertCanManageCosts(context);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cost_categories")
    .insert({
      workspace_id: context.workspace.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      created_by_user_id: context.user.id,
      updated_by_user_id: context.user.id,
    })
    .select("id, workspace_id, name, description, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new CostsError("We could not create that cost category.");
  }

  return mapCostCategoryRow(data as CostCategoryRow);
}

export async function createCostCategoryAction(formData: FormData) {
  const context = await requireAuthenticatedAppContext();

  try {
    await createCostCategoryRecord(context, {
      name: getTrimmedField(formData, "name"),
      description: getTrimmedField(formData, "description"),
    });

    redirect(withStatus("/cost-categories", "message", "Cost category created."));
  } catch (error) {
    const message =
      error instanceof CostsError
        ? error.message
        : "We could not create that cost category.";

    redirect(withStatus("/cost-categories", "error", message));
  }
}

export async function updateCostCategoryAction(formData: FormData) {
  const categoryId = getTrimmedField(formData, "categoryId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageCosts(context);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cost_categories")
      .update({
        name: getTrimmedField(formData, "name"),
        description: getTrimmedField(formData, "description") || null,
        updated_by_user_id: context.user.id,
      })
      .eq("id", categoryId)
      .eq("workspace_id", context.workspace.id)
      .select("id")
      .single();

    if (error || !data) {
      throw new CostsError("We could not save that cost category.");
    }

    redirect(withStatus("/cost-categories", "message", "Cost category updated."));
  } catch (error) {
    const message =
      error instanceof CostsError
        ? error.message
        : "We could not save that cost category.";

    redirect(withStatus("/cost-categories", "error", message));
  }
}
