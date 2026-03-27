import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getWorkspaceCustomerChoices,
  getWorkspaceCustomerChoicesForWorkspace,
} from "@/modules/customers/customers";
import type { CustomerChoice } from "@/modules/customers/types";
import type {
  GroupChoice,
  GroupFormValues,
  GroupRecord,
  GroupsEditorData,
} from "@/modules/groups/types";

type GroupRow = {
  id: string;
  workspace_id: string;
  name: string;
  customer_id: string | null;
  status: "active" | "archived";
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
};

export class GroupsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroupsError";
  }
}

function canManageGroups(context: AuthenticatedAppContext) {
  return context.workspace.role === "owner" || context.workspace.role === "admin";
}

function buildCustomerMap(customers: CustomerChoice[]) {
  return new Map(customers.map((customer) => [customer.id, customer]));
}

function toGroupRecord(
  row: GroupRow,
  customersById: Map<string, CustomerChoice>,
): GroupRecord {
  const customer = row.customer_id ? customersById.get(row.customer_id) ?? null : null;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    customerId: row.customer_id,
    customerName: customer?.name ?? null,
    status: row.status,
    notesInternal: row.notes_internal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toGroupChoice(
  row: GroupRow,
  customersById: Map<string, CustomerChoice>,
): GroupChoice {
  const customer = row.customer_id ? customersById.get(row.customer_id) ?? null : null;
  const label = customer?.name ? `${row.name} • ${customer.name}` : row.name;

  return {
    id: row.id,
    name: row.name,
    customerId: row.customer_id,
    customerName: customer?.name ?? null,
    status: row.status,
    label,
  };
}

export function getGroupFormDefaults(group?: GroupRecord | null): GroupFormValues {
  return {
    name: group?.name ?? "",
    customerId: group?.customerId ?? "",
    status: group?.status ?? "active",
    notesInternal: group?.notesInternal ?? "",
  };
}

export function assertCanManageGroups(context: AuthenticatedAppContext) {
  if (!canManageGroups(context)) {
    throw new GroupsError("Only workspace owners and admins can create or edit groups.");
  }
}

export async function getGroupsEditorData(
  context: AuthenticatedAppContext,
): Promise<GroupsEditorData> {
  const customers = await getWorkspaceCustomerChoices(context);

  return {
    canManageGroups: canManageGroups(context),
    customers,
  };
}

export async function getWorkspaceGroupChoicesForWorkspace(
  workspaceId: string,
): Promise<GroupChoice[]> {
  const supabase = await createSupabaseServerClient();
  const [customers, response] = await Promise.all([
    getWorkspaceCustomerChoicesForWorkspace(workspaceId),
    supabase
      .from("groups")
      .select(
        "id, workspace_id, name, customer_id, status, notes_internal, created_at, updated_at",
      )
      .eq("workspace_id", workspaceId)
      .order("status", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const { data, error } = response;

  if (error) {
    throw new GroupsError("We could not load workspace groups right now.");
  }

  const customersById = buildCustomerMap(customers);

  return ((data ?? []) as GroupRow[]).map((row) => toGroupChoice(row, customersById));
}

export async function getWorkspaceGroupChoices(
  context: AuthenticatedAppContext,
): Promise<GroupChoice[]> {
  return getWorkspaceGroupChoicesForWorkspace(context.workspace.id);
}

export async function getGroupsList(context: AuthenticatedAppContext) {
  const supabase = await createSupabaseServerClient();
  const [customers, response] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    supabase
      .from("groups")
      .select(
        "id, workspace_id, name, customer_id, status, notes_internal, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .order("status", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const { data, error } = response;

  if (error) {
    throw new GroupsError("We could not load groups right now.");
  }

  const customersById = buildCustomerMap(customers);

  return {
    canManageGroups: canManageGroups(context),
    groups: ((data ?? []) as GroupRow[]).map((row) =>
      toGroupRecord(row, customersById),
    ),
  };
}

export async function getGroupById(
  context: AuthenticatedAppContext,
  groupId: string,
) {
  const supabase = await createSupabaseServerClient();
  const [customers, response] = await Promise.all([
    getWorkspaceCustomerChoices(context),
    supabase
      .from("groups")
      .select(
        "id, workspace_id, name, customer_id, status, notes_internal, created_at, updated_at",
      )
      .eq("workspace_id", context.workspace.id)
      .eq("id", groupId)
      .maybeSingle(),
  ]);

  const { data, error } = response;

  if (error) {
    throw new GroupsError("We could not load that group right now.");
  }

  if (!data) {
    return null;
  }

  const customersById = buildCustomerMap(customers);

  return {
    canManageGroups: canManageGroups(context),
    customers,
    group: toGroupRecord(data as GroupRow, customersById),
  };
}
