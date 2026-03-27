import Link from "next/link";

import type { AuthenticatedAppContext } from "@/lib/auth/types";
import type { CustomerChoice } from "@/modules/customers/types";
import type { FulfillmentPartyChoice } from "@/modules/fulfillment/types";
import type { GroupChoice } from "@/modules/groups/types";
import { createRevenueAction, updateRevenueAction } from "@/modules/revenue/actions";
import { DaytimeEntryFlow } from "@/modules/revenue/components/daytime-entry-flow";
import type { RevenueFormValues, RevenueRecord } from "@/modules/revenue/types";

type RevenueFormProps = {
  mode: "create" | "edit";
  context: AuthenticatedAppContext;
  customers: CustomerChoice[];
  groups: GroupChoice[];
  fulfillmentParties: FulfillmentPartyChoice[];
  values: RevenueFormValues;
  revenue?: RevenueRecord | null;
  linkedInvoiceId?: string | null;
};

export function RevenueForm({
  mode,
  context,
  customers,
  groups,
  fulfillmentParties,
  values,
  revenue,
  linkedInvoiceId,
}: RevenueFormProps) {
  const canManageRevenue =
    context.workspace.role === "owner" || context.workspace.role === "admin";
  const action = mode === "create" ? createRevenueAction : updateRevenueAction;
  const hasCustomers = customers.length > 0;
  const formEnabled = canManageRevenue && hasCustomers;
  const showInvoiceAction = !linkedInvoiceId;

  return (
    <section className="daytime-page-shell">
      {!canManageRevenue ? (
        <p className="daytime-inline-status is-error">
          Only workspace owners and admins can create or edit Daytime entries.
        </p>
      ) : null}

      {!hasCustomers ? (
        <div className="daytime-inline-status">
          Daytime entries require a real customer record first.{" "}
          <Link href="/customers/new">Create a customer</Link>.
        </div>
      ) : null}

      <form className="daytime-form" action={action}>
        {revenue ? <input type="hidden" name="revenueId" value={revenue.id} /> : null}

        <DaytimeEntryFlow
          mode={mode}
          customers={customers}
          groups={groups}
          fulfillmentParties={fulfillmentParties}
          values={values}
          disabled={!formEnabled}
          linkedInvoiceId={linkedInvoiceId}
        />
      </form>

      {formEnabled && !showInvoiceAction && linkedInvoiceId ? (
        <div className="daytime-linked-invoice-row">
          <Link className="link-pill" href={`/invoices/${linkedInvoiceId}`}>
            Open linked invoice
          </Link>
        </div>
      ) : null}
    </section>
  );
}
