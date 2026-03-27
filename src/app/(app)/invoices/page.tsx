import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";
import { requireAuthenticatedAppContext } from "@/lib/auth/session";
import { UsageLimitNotice } from "@/modules/billing/components/usage-limit-notice";
import { checkUsageLimit } from "@/modules/billing/usage";
import { InvoiceList } from "@/modules/invoices/components/invoice-list";
import { InvoiceStatusBanner } from "@/modules/invoices/components/invoice-status-banner";
import { getInvoicesList } from "@/modules/invoices/invoices";

type InvoicesPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const [context, params] = await Promise.all([
    requireAuthenticatedAppContext(),
    searchParams,
  ]);
  const [data, usage] = await Promise.all([
    getInvoicesList(context),
    checkUsageLimit(context.workspace.id, "invoice_created"),
  ]);
  const status = params.error
    ? { kind: "error" as const, text: params.error }
    : params.message
      ? { kind: "message" as const, text: params.message }
      : null;

  return (
    <PageShell
      eyebrow="Invoices"
      title="Invoices"
      description="Manage invoices from one list."
    >
      <section className="surface section customer-toolbar">
        <div className="stack stack-tight">
          <p className="eyebrow">Invoices</p>
          <h2 className="section-title">Invoice list</h2>
        </div>

        {data.canManageInvoices ? (
          <Link className="link-pill" href="/revenue/new">
            Create Invoice
          </Link>
        ) : null}
      </section>

      <InvoiceStatusBanner status={status} />
      {usage.plan === "free" && usage.limit !== null ? (
        <UsageLimitNotice
          used={usage.used}
          limit={usage.limit}
          label="invoices this month"
          exceeded={!usage.allowed}
        />
      ) : null}
      <InvoiceList
        invoices={data.invoices}
        canManageInvoices={data.canManageInvoices}
      />
    </PageShell>
  );
}
