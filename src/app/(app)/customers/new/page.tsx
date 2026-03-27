import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { UsageLimitNotice } from "@/modules/billing/components/usage-limit-notice";
import { checkUsageLimit } from "@/modules/billing/usage";
import { CustomerForm } from "@/modules/customers/components/customer-form";
import { CustomerStatusBanner } from "@/modules/customers/components/customer-status-banner";
import { getCustomerFormDefaults } from "@/modules/customers/customers";

type NewCustomerPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function NewCustomerPage({
  searchParams,
}: NewCustomerPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const usage = await checkUsageLimit(context.workspace.id, "customer_created");
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Customers"
      title="Create customer"
      description="Add a new workspace customer record without tying it to financial flows yet."
    >
      <section className="surface section stack">
        <Link className="link-pill" href="/customers">
          Back to customers
        </Link>
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
      <CustomerForm
        mode="create"
        context={context}
        values={getCustomerFormDefaults()}
      />
    </PageShell>
  );
}
