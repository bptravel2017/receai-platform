import Link from "next/link";

import type { CustomerRecord } from "@/modules/customers/types";

type CustomerListProps = {
  customers: CustomerRecord[];
  searchQuery: string;
  canManageCustomers: boolean;
};

function summarizeSecondary(customer: CustomerRecord) {
  return [customer.company, customer.email, customer.phone]
    .filter((value) => Boolean(value?.trim()))
    .join(" • ");
}

export function CustomerList({
  customers,
  searchQuery,
  canManageCustomers,
}: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Customers</p>
          <h2 className="section-title">
            {searchQuery
              ? "No customers matched this search"
              : "No customers yet"}
          </h2>
          <p className="muted">
            {searchQuery
              ? "Try a different name, company, email, or phone search."
              : "Create the first customer record so later revenue and invoice flows have a clean source of truth."}
          </p>
        </div>

        {canManageCustomers ? (
          <div>
            <Link className="link-pill" href="/customers/new">
              Create customer
            </Link>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Directory</p>
        <h2 className="section-title">Customer records</h2>
        <p className="muted">
          Each customer belongs to the current workspace and can later anchor invoices,
          revenue entries, and related records.
        </p>
      </div>

      <div className="stack customer-list">
        {customers.map((customer) => (
          <Link className="customer-card" href={`/customers/${customer.id}`} key={customer.id}>
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{customer.name}</strong>
                <span className="muted">
                  {summarizeSecondary(customer) || "No company or contact details yet"}
                </span>
              </div>
              <span className="link-pill">Open</span>
            </div>

            {customer.notes?.trim() ? (
              <p className="muted customer-notes-preview">{customer.notes}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
