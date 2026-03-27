"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertUsageAllowed,
  logWorkspaceUsage,
  UsageLimitError,
} from "@/modules/billing/usage";
import { createInvoiceDraftForRevenueRecord } from "@/modules/invoices/actions";
import type { FulfillmentPartyType } from "@/modules/fulfillment/types";
import {
  parseLineItemsJson,
  sumLineItemsAmount,
} from "@/modules/line-items/line-items";
import { assertCanManageRevenue, RevenueError } from "@/modules/revenue/revenue";
import type { RevenueBillingState, RevenueEntryType } from "@/modules/revenue/types";

function getTrimmedField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptional(value: string) {
  return value.length > 0 ? value : null;
}

function withStatus(path: string, key: "error" | "message", value: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(key, value);
  return `${path}?${searchParams.toString()}`;
}

async function assertWorkspaceCustomer(
  workspaceId: string,
  customerId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", customerId)
    .maybeSingle();

  if (error || !data) {
    throw new RevenueError("Select a valid customer from this workspace.");
  }
}

async function getWorkspaceGroup(workspaceId: string, groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("id", groupId)
    .maybeSingle();

  if (error || !data) {
    throw new RevenueError("Select a valid group from this workspace.");
  }

  return data;
}

async function assertWorkspaceFulfillmentParty(args: {
  workspaceId: string;
  fulfillmentPartyId: string;
  fulfillmentPartyType: FulfillmentPartyType | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fulfillment_parties")
    .select("id, party_type")
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.fulfillmentPartyId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    throw new RevenueError("Choose a valid fulfillment party from this workspace.");
  }

  if (args.fulfillmentPartyType && data.party_type !== args.fulfillmentPartyType) {
    throw new RevenueError("Selected fulfillment party does not match the chosen type.");
  }
}

function getLegacyFulfillmentSelection(values: {
  driverId: string;
  vendorId: string;
  guideId: string;
}) {
  if (values.driverId) {
    return {
      fulfillmentPartyType: "driver" as const,
      fulfillmentPartyId: values.driverId,
    };
  }

  if (values.vendorId) {
    return {
      fulfillmentPartyType: "vendor" as const,
      fulfillmentPartyId: values.vendorId,
    };
  }

  if (values.guideId) {
    return {
      fulfillmentPartyType: "guide" as const,
      fulfillmentPartyId: values.guideId,
    };
  }

  return {
    fulfillmentPartyType: null,
    fulfillmentPartyId: "",
  };
}

function validateRevenueInput(formData: FormData) {
  const customerId = getTrimmedField(formData, "customerId");
  const groupId = getTrimmedField(formData, "groupId");
  const serviceDate = getTrimmedField(formData, "entryDate");
  const entryType = getTrimmedField(formData, "entryType");
  const billingState = getTrimmedField(formData, "billingState");
  const driverId = getTrimmedField(formData, "driverId");
  const vendorId = getTrimmedField(formData, "vendorId");
  const guideId = getTrimmedField(formData, "guideId");
  const notes = getTrimmedField(formData, "notes");
  const lineItemsJson = getTrimmedField(formData, "lineItems");

  if (!customerId) {
    throw new RevenueError("Select a valid customer or customer-backed group before saving.");
  }

  if (!serviceDate) {
    throw new RevenueError("Choose an entry date.");
  }

  if (entryType !== "daytime" && entryType !== "transfer" && entryType !== "custom") {
    throw new RevenueError("Choose a valid revenue type.");
  }

  const normalizedBillingState: RevenueBillingState | null =
    billingState === "unbilled"
      ? "unbilled"
      : billingState === "not_needed"
        ? "not_needed"
        : null;

  if (!normalizedBillingState) {
    throw new RevenueError("Choose a valid billing state.");
  }

  if (notes.length > 4000) {
    throw new RevenueError("Notes must stay under 4000 characters.");
  }

  const normalizedEntryType = entryType as RevenueEntryType;
  const lineItems = parseLineItemsJson(lineItemsJson);
  const amountCents = sumLineItemsAmount(lineItems);
  const legacyFulfillment = getLegacyFulfillmentSelection({
    driverId,
    vendorId,
    guideId,
  });

  if (lineItems.length === 0) {
    throw new RevenueError("Add at least one Daytime item before saving.");
  }

  if (amountCents <= 0) {
    throw new RevenueError("Total must be greater than zero.");
  }

  return {
    customerId,
    groupId,
    driverId,
    vendorId,
    guideId,
    fulfillmentPartyId: legacyFulfillment.fulfillmentPartyId,
    fulfillmentPartyType: legacyFulfillment.fulfillmentPartyType,
    values: {
      service_date: serviceDate,
      entry_type: normalizedEntryType,
      fulfillment_party_type: legacyFulfillment.fulfillmentPartyType,
      fulfillment_party_id: normalizeOptional(legacyFulfillment.fulfillmentPartyId),
      driver_id: normalizeOptional(driverId),
      vendor_id: normalizeOptional(vendorId),
      guide_id: normalizeOptional(guideId),
      billing_state: normalizedBillingState,
      status: "open" as const,
      amount_cents: amountCents,
      currency: "USD",
      notes: normalizeOptional(notes),
      line_items: lineItems,
    },
  };
}

async function revenueHasLinkedInvoice(workspaceId: string, revenueId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("revenue_record_id", revenueId)
    .maybeSingle();

  if (error) {
    throw new RevenueError("We could not verify invoice status for this entry.");
  }

  return Boolean(data?.id);
}

function getSubmitIntent(formData: FormData) {
  const intent = getTrimmedField(formData, "submitIntent");

  if (
    intent === "save" ||
    intent === "save_and_invoice" ||
    intent === "save_draft"
  ) {
    return intent;
  }

  return "save";
}

export async function createRevenueAction(formData: FormData) {
  const context = await requireAuthenticatedAppContext();
  const submitIntent = getSubmitIntent(formData);
  let revenueId = "";

  try {
    assertCanManageRevenue(context);
    await assertUsageAllowed(context.workspace.id, "daytime_created");

    if (submitIntent === "save_and_invoice") {
      await assertUsageAllowed(context.workspace.id, "invoice_created");
    }

    const {
      customerId,
      groupId,
      driverId,
      vendorId,
      guideId,
      values,
    } =
      validateRevenueInput(formData);
    const nextStatus = submitIntent === "save_draft" ? "draft" : "open";
    await assertWorkspaceCustomer(context.workspace.id, customerId);
    const group = groupId
      ? await getWorkspaceGroup(context.workspace.id, groupId)
      : null;
    if (driverId) {
      await assertWorkspaceFulfillmentParty({
        workspaceId: context.workspace.id,
        fulfillmentPartyId: driverId,
        fulfillmentPartyType: "driver",
      });
    }
    if (vendorId) {
      await assertWorkspaceFulfillmentParty({
        workspaceId: context.workspace.id,
        fulfillmentPartyId: vendorId,
        fulfillmentPartyType: "vendor",
      });
    }
    if (guideId) {
      await assertWorkspaceFulfillmentParty({
        workspaceId: context.workspace.id,
        fulfillmentPartyId: guideId,
        fulfillmentPartyType: "guide",
      });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("revenue_records")
      .insert({
        workspace_id: context.workspace.id,
        customer_id: customerId,
        group_id: group?.id ?? null,
        ...values,
        status: nextStatus,
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new RevenueError("We could not create that Daytime entry.");
    }

    revenueId = data.id;
    await logWorkspaceUsage(context.workspace.id, "daytime_created");

    if (submitIntent === "save_and_invoice") {
      try {
        const invoiceResult = await createInvoiceDraftForRevenueRecord({
          context,
          workspaceId: context.workspace.id,
          revenueRecordId: revenueId,
          userId: context.user.id,
        });

        redirect(
          withStatus(
            `/invoices/${invoiceResult.invoiceId}`,
            "message",
            invoiceResult.created
              ? "Invoice draft created."
              : "An invoice already exists for this entry.",
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The entry was saved, but the invoice could not be created.";

        redirect(withStatus(`/revenue/${revenueId}`, "error", message));
      }
    }

    redirect(withStatus(`/revenue/${revenueId}`, "message", "Daytime entry saved."));
  } catch (error) {
    const message =
      error instanceof RevenueError || error instanceof UsageLimitError
        ? error.message
        : "We could not save that Daytime entry.";

    redirect(withStatus("/revenue/new", "error", message));
  }
}

export async function updateRevenueAction(formData: FormData) {
  const revenueId = getTrimmedField(formData, "revenueId");
  const context = await requireAuthenticatedAppContext();
  const submitIntent = getSubmitIntent(formData);

  try {
    assertCanManageRevenue(context);

    const {
      customerId,
      groupId,
      driverId,
      vendorId,
      guideId,
      values,
    } =
      validateRevenueInput(formData);
    const nextStatus = submitIntent === "save_draft" ? "draft" : "open";
    await assertWorkspaceCustomer(context.workspace.id, customerId);
    const group = groupId
      ? await getWorkspaceGroup(context.workspace.id, groupId)
      : null;
    if (driverId) {
      await assertWorkspaceFulfillmentParty({
        workspaceId: context.workspace.id,
        fulfillmentPartyId: driverId,
        fulfillmentPartyType: "driver",
      });
    }
    if (vendorId) {
      await assertWorkspaceFulfillmentParty({
        workspaceId: context.workspace.id,
        fulfillmentPartyId: vendorId,
        fulfillmentPartyType: "vendor",
      });
    }
    if (guideId) {
      await assertWorkspaceFulfillmentParty({
        workspaceId: context.workspace.id,
        fulfillmentPartyId: guideId,
        fulfillmentPartyType: "guide",
      });
    }

    const hasLinkedInvoice = await revenueHasLinkedInvoice(context.workspace.id, revenueId);
    const nextBillingState = hasLinkedInvoice ? "billed" : values.billing_state;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("revenue_records")
      .update({
        customer_id: customerId,
        group_id: group?.id ?? null,
        ...values,
        status: nextStatus,
        billing_state: nextBillingState,
        updated_by_user_id: context.user.id,
      })
      .eq("id", revenueId)
      .eq("workspace_id", context.workspace.id)
      .select("id")
      .single();

    if (error || !data) {
      throw new RevenueError("We could not save that Daytime entry.");
    }

    if (submitIntent === "save_and_invoice") {
      try {
        const invoiceResult = await createInvoiceDraftForRevenueRecord({
          context,
          workspaceId: context.workspace.id,
          revenueRecordId: revenueId,
          userId: context.user.id,
        });

        redirect(
          withStatus(
            `/invoices/${invoiceResult.invoiceId}`,
            "message",
            invoiceResult.created
              ? "Invoice draft created."
              : "An invoice already exists for this entry.",
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The entry was saved, but the invoice could not be created.";

        redirect(withStatus(`/revenue/${revenueId}`, "error", message));
      }
    }

    redirect(withStatus(`/revenue/${revenueId}`, "message", "Daytime entry saved."));
  } catch (error) {
    const message =
      error instanceof RevenueError
        ? error.message
        : "We could not save that Daytime entry.";

    redirect(withStatus(`/revenue/${revenueId}`, "error", message));
  }
}
