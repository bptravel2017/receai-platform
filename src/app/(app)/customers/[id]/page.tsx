import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { CustomerForm } from "@/modules/customers/components/customer-form";
import { CustomerStatusBanner } from "@/modules/customers/components/customer-status-banner";
import {
  getCustomerById,
  getCustomerFormDefaults,
} from "@/modules/customers/customers";

type CustomerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  const [{ id }, context, query] = await Promise.all([
    params,
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const result = await getCustomerById(context, id);

  if (!result) {
    notFound();
  }

  const { customer, canManageCustomers } = result;
  const status = query.error
    ? { kind: "error" as const, text: query.error }
    : query.message
      ? { kind: "message" as const, text: query.message }
      : null;

  return (
    <PageShell
      eyebrow="Customers"
      title={customer.name}
      description="Customer detail and edit view inside the current workspace."
    >
      <section className="grid customer-detail-grid">
        <article className="surface section stack">
          <div className="stack stack-tight">
            <Link className="link-pill" href="/customers">
              Back to customers
            </Link>
            <p className="eyebrow">Summary</p>
            <h2 className="section-title">{customer.name}</h2>
            <p className="muted">
              {customer.company?.trim() || "No company set yet"}
            </p>
          </div>

          <div className="stack customer-meta-list">
            <p className="muted">
              <strong>Email:</strong> {customer.email || "Not provided"}
            </p>
            <p className="muted">
              <strong>Phone:</strong> {customer.phone || "Not provided"}
            </p>
            <p className="muted">
              <strong>Workspace:</strong> {context.workspace.name}
            </p>
            <p className="muted">
              <strong>Created:</strong> {formatDate(customer.createdAt)}
            </p>
            <p className="muted">
              <strong>Updated:</strong> {formatDate(customer.updatedAt)}
            </p>
          </div>

          <div className="surface customer-notes-panel">
            <p className="eyebrow">Notes</p>
            <p className="muted">
              {customer.notes?.trim() || "No notes saved for this customer yet."}
            </p>
          </div>

          {!canManageCustomers ? (
            <p className="status status-message">
              You can view this customer, but only workspace owners and admins can
              edit it.
            </p>
          ) : null}
        </article>

        <div className="stack">
          <CustomerStatusBanner status={status} />
          <CustomerForm
            mode="edit"
            context={context}
            customer={customer}
            values={getCustomerFormDefaults(customer)}
          />
        </div>
      </section>
    </PageShell>
  );
}
