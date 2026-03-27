import Link from "next/link";

import { PageShell } from "@/components/shell/page-shell";

type BillingSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function BillingSuccessPage({
  searchParams,
}: BillingSuccessPageProps) {
  const params = await searchParams;

  return (
    <PageShell
      eyebrow="Billing"
      title="Checkout received"
      description="Stripe checkout completed. Billing sync may still be processing."
    >
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Pending sync</p>
          <h2 className="section-title">Plan update is being confirmed</h2>
          <p className="muted">
            Your workspace plan will update after the Stripe webhook finishes syncing
            subscription state.
          </p>
          {params.session_id ? (
            <p className="muted">Checkout session: {params.session_id}</p>
          ) : null}
        </div>

        <div className="cost-link-row">
          <Link className="link-pill" href="/billing">
            Back to billing
          </Link>
          <Link className="link-pill" href="/dashboard">
            Open dashboard
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
