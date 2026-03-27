import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CustomerChoice,
  CustomerFormValues,
  CustomerRecord,
} from "@/modules/customers/types";

type CustomerRow = {
  id: string;
  workspace_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
};

export class CustomersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomersError";
  }
}

function canManageCustomers(context: AuthenticatedAppContext) {
  return (
    context.workspace.role === "owner" || context.workspace.role === "admin"
  );
}

function toCustomerRecord(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
  };
}

function sanitizeSearchQuery(value: string) {
  return value.replace(/[%(),]/g, " ").trim();
}

export function getCustomerFormDefaults(
  customer?: CustomerRecord | null,
): CustomerFormValues {
  return {
    name: customer?.name ?? "",
    company: customer?.company ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    notes: customer?.notes ?? "",
  };
}

export function assertCanManageCustomers(context: AuthenticatedAppContext) {
  if (!canManageCustomers(context)) {
    throw new CustomersError(
      "Only workspace owners and admins can create or edit customers.",
    );
  }
}

export async function getCustomersList(
  context: AuthenticatedAppContext,
  searchQuery?: string,
) {
  const supabase = await createSupabaseServerClient();
  const query = sanitizeSearchQuery(searchQuery ?? "");

  let request = supabase
    .from("customers")
    .select(
      "id, workspace_id, name, company, email, phone, notes, created_at, updated_at, created_by_user_id, updated_by_user_id",
    )
    .eq("workspace_id", context.workspace.id)
    .order("name", { ascending: true });

  if (query.length > 0) {
    const likeValue = `%${query}%`;
    request = request.or(
      `name.ilike.${likeValue},company.ilike.${likeValue},email.ilike.${likeValue},phone.ilike.${likeValue}`,
    );
  }

  const { data, error } = await request;

  if (error) {
    throw new CustomersError("We could not load customers right now.");
  }

  return {
    canManageCustomers: canManageCustomers(context),
    searchQuery: query,
    customers: ((data ?? []) as CustomerRow[]).map(toCustomerRecord),
  };
}

export async function getCustomerById(
  context: AuthenticatedAppContext,
  customerId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, workspace_id, name, company, email, phone, notes, created_at, updated_at, created_by_user_id, updated_by_user_id",
    )
    .eq("workspace_id", context.workspace.id)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw new CustomersError("We could not load that customer right now.");
  }

  if (!data) {
    return null;
  }

  return {
    canManageCustomers: canManageCustomers(context),
    customer: toCustomerRecord(data as CustomerRow),
  };
}

export async function getWorkspaceCustomerChoicesForWorkspace(
  workspaceId: string,
): Promise<CustomerChoice[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, company, email")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) {
    throw new CustomersError("We could not load workspace customers right now.");
  }

  return ((data ?? []) as Array<{
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  }>).map((customer) => ({
    id: customer.id,
    name: customer.name,
    company: customer.company,
    email: customer.email,
  }));
}

export async function getWorkspaceCustomerChoices(
  context: AuthenticatedAppContext,
): Promise<CustomerChoice[]> {
  return getWorkspaceCustomerChoicesForWorkspace(context.workspace.id);
}
