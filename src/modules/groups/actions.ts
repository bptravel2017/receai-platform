"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertUsageAllowed,
  logWorkspaceUsage,
  UsageLimitError,
} from "@/modules/billing/usage";
import {
  assertCanManageGroups,
  GroupsError,
} from "@/modules/groups/groups";

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

async function assertWorkspaceCustomer(workspaceId: string, customerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", customerId)
    .maybeSingle();

  if (error || !data) {
    throw new GroupsError("Choose a valid customer from this workspace.");
  }
}

function validateGroupInput(formData: FormData) {
  const name = getTrimmedField(formData, "name");
  const customerId = getTrimmedField(formData, "customerId");
  const status = getTrimmedField(formData, "status");
  const notesInternal = getTrimmedField(formData, "notesInternal");

  if (name.length < 2) {
    throw new GroupsError("Group name must be at least 2 characters.");
  }

  if (status !== "active" && status !== "archived") {
    throw new GroupsError("Choose a valid group status.");
  }

  if (notesInternal.length > 4000) {
    throw new GroupsError("Internal notes must stay under 4000 characters.");
  }

  return {
    customerId,
    values: {
      name,
      customer_id: normalizeOptional(customerId),
      status,
      notes_internal: normalizeOptional(notesInternal),
    },
  };
}

export async function createGroupAction(formData: FormData) {
  const context = await requireAuthenticatedAppContext();
  let groupId = "";

  try {
    assertCanManageGroups(context);
    await assertUsageAllowed(context.workspace.id, "group_created");
    const { customerId, values } = validateGroupInput(formData);
    if (customerId) {
      await assertWorkspaceCustomer(context.workspace.id, customerId);
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("groups")
      .insert({
        workspace_id: context.workspace.id,
        ...values,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new GroupsError("We could not create that group.");
    }

    groupId = data.id;
    await logWorkspaceUsage(context.workspace.id, "group_created");
  } catch (error) {
    const message =
      error instanceof GroupsError || error instanceof UsageLimitError
        ? error.message
        : "We could not create that group.";

    redirect(withStatus("/groups/new", "error", message));
  }

  redirect(withStatus(`/groups/${groupId}`, "message", "Group created."));
}

export async function updateGroupAction(formData: FormData) {
  const groupId = getTrimmedField(formData, "groupId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageGroups(context);
    const { customerId, values } = validateGroupInput(formData);
    if (customerId) {
      await assertWorkspaceCustomer(context.workspace.id, customerId);
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("groups")
      .update(values)
      .eq("id", groupId)
      .eq("workspace_id", context.workspace.id)
      .select("id")
      .single();

    if (error || !data) {
      throw new GroupsError("We could not save that group.");
    }
  } catch (error) {
    const message =
      error instanceof GroupsError ? error.message : "We could not save that group.";

    redirect(withStatus(`/groups/${groupId}`, "error", message));
  }

  redirect(withStatus(`/groups/${groupId}`, "message", "Group updated."));
}
