import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sumLineItemsAmount } from "@/modules/line-items/line-items";
import type { LineItemRecord } from "@/modules/line-items/types";
import { getInvoiceById, InvoicesError } from "@/modules/invoices/invoices";

type CustomerRenderRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
};

export type InvoicePrintView = {
  invoice: Awaited<ReturnType<typeof getInvoiceById>> extends infer T
    ? T extends { invoice: infer I }
      ? I
      : never
    : never;
  issuer: {
    workspaceName: string;
    workspaceSlug: string;
  };
  customer: {
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
  };
  subtotalCents: number;
  totalCents: number;
  totalLineItems: number;
};

export async function getInvoicePrintView(
  context: AuthenticatedAppContext,
  invoiceId: string,
): Promise<InvoicePrintView | null> {
  const invoiceResult = await getInvoiceById(context, invoiceId);

  if (!invoiceResult) {
    return null;
  }

  const { invoice } = invoiceResult;

  if (invoice.status !== "finalized") {
    throw new InvoicesError(
      "Only finalized invoices can use the export-ready rendering view.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, company, email, phone")
    .eq("workspace_id", context.workspace.id)
    .eq("id", invoice.customerId)
    .maybeSingle();

  if (error || !data) {
    throw new InvoicesError("We could not load the customer details for this invoice.");
  }

  const customer = data as CustomerRenderRow;
  const subtotalCents = sumLineItemsAmount(invoice.lineItems as LineItemRecord[]);

  return {
    invoice,
    issuer: {
      workspaceName: context.workspace.name,
      workspaceSlug: context.workspace.slug,
    },
    customer: {
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
    },
    subtotalCents: subtotalCents > 0 ? subtotalCents : invoice.amountCents,
    totalCents: invoice.amountCents,
    totalLineItems: invoice.lineItems.length,
  };
}
