"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertUsageAllowed,
  logWorkspaceUsage,
  UsageLimitError,
} from "@/modules/billing/usage";
import { assertCanManageCustomers, CustomersError } from "@/modules/customers/customers";

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

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateCustomerInput(formData: FormData) {
  const name = getTrimmedField(formData, "name");
  const company = getTrimmedField(formData, "company");
  const email = getTrimmedField(formData, "email");
  const phone = getTrimmedField(formData, "phone");
  const notes = getTrimmedField(formData, "notes");

  if (name.length < 2) {
    throw new CustomersError("Customer name must be at least 2 characters.");
  }

  if (email.length > 0 && !validateEmail(email)) {
    throw new CustomersError("Enter a valid email address.");
  }

  if (notes.length > 4000) {
    throw new CustomersError("Notes must stay under 4000 characters.");
  }

  return {
    name,
    company: normalizeOptional(company),
    email: normalizeOptional(email),
    phone: normalizeOptional(phone),
    notes: normalizeOptional(notes),
  };
}

export async function createCustomerAction(formData: FormData) {
  const context = await requireAuthenticatedAppContext();
  let customerId: string;

  try {
    assertCanManageCustomers(context);
    await assertUsageAllowed(context.workspace.id, "customer_created");

    const values = validateCustomerInput(formData);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        workspace_id: context.workspace.id,
        ...values,
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new CustomersError("We could not create that customer.");
    }
    customerId = data.id;
    await logWorkspaceUsage(context.workspace.id, "customer_created");
  } catch (error) {
    const message =
      error instanceof CustomersError || error instanceof UsageLimitError
        ? error.message
        : "We could not create that customer.";

    redirect(withStatus("/customers/new", "error", message));
  }

  redirect(withStatus(`/customers/${customerId}`, "message", "Customer created."));
}

export async function updateCustomerAction(formData: FormData) {
  const customerId = getTrimmedField(formData, "customerId");
  const context = await requireAuthenticatedAppContext();

  try {
    assertCanManageCustomers(context);

    const values = validateCustomerInput(formData);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("customers")
      .update({
        ...values,
        updated_by_user_id: context.user.id,
      })
      .eq("id", customerId)
      .eq("workspace_id", context.workspace.id)
      .select("id")
      .single();

    if (error || !data) {
      throw new CustomersError("We could not save that customer.");
    }
  } catch (error) {
    const message =
      error instanceof CustomersError
        ? error.message
        : "We could not save that customer.";

    redirect(withStatus(`/customers/${customerId}`, "error", message));
  }

  redirect(withStatus(`/customers/${customerId}`, "message", "Customer updated."));
}
