import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { UsageLimitNotice } from "@/modules/billing/components/usage-limit-notice";
import { checkUsageLimit } from "@/modules/billing/usage";
import { CustomerList } from "@/modules/customers/components/customer-list";
import { CustomerSearchForm } from "@/modules/customers/components/customer-search-form";
import { CustomerStatusBanner } from "@/modules/customers/components/customer-status-banner";
import { getCustomersList } from "@/modules/customers/customers";

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const searchQuery = typeof params.q === "string" ? params.q : "";
  const [data, usage] = await Promise.all([
    getCustomersList(context, searchQuery),
    checkUsageLimit(context.workspace.id, "customer_created"),
  ]);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Customers"
      title="Customers"
      description="Workspace customer records that will later feed revenue, invoices, and costs safely."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Source of truth</p>
          <h2 className="section-title">Customer directory</h2>
          <p className="muted">
            Start with clean customer identity and contact records before any financial
            modules depend on them.
          </p>
        </div>

        {data.canManageCustomers ? (
          <Link className="link-pill" href="/customers/new">
            Create customer
          </Link>
        ) : null}
      </section>

      <CustomerStatusBanner status={status} />
      {usage.plan === "free" && usage.limit !== null ? (
        <UsageLimitNotice
          used={usage.used}
          limit={usage.limit}
          label="customers"
          exceeded={!usage.allowed}
        />
      ) : null}
      <CustomerSearchForm initialQuery={searchQuery} />
      <CustomerList
        customers={data.customers}
        searchQuery={data.searchQuery}
        canManageCustomers={data.canManageCustomers}
      />
    </PageShell>
  );
}
