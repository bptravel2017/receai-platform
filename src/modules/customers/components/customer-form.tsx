import { SubmitButton } from "@/components/auth/submit-button";
import type { AuthenticatedAppContext } from "@/lib/auth/types";
import type { CustomerFormValues, CustomerRecord } from "@/modules/customers/types";
import { createCustomerAction, updateCustomerAction } from "@/modules/customers/actions";

type CustomerFormProps = {
  mode: "create" | "edit";
  context: AuthenticatedAppContext;
  values: CustomerFormValues;
  customer?: CustomerRecord | null;
};

export function CustomerForm({
  mode,
  context,
  values,
  customer,
}: CustomerFormProps) {
  const canManageCustomers =
    context.workspace.role === "owner" || context.workspace.role === "admin";
  const action = mode === "create" ? createCustomerAction : updateCustomerAction;

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">{mode === "create" ? "New customer" : "Customer profile"}</p>
        <h2 className="section-title">
          {mode === "create" ? "Create customer" : "Edit customer details"}
        </h2>
        <p className="muted">
          Build clean customer identity records now so later financial workflows can
          reuse them safely.
        </p>
      </div>

      {!canManageCustomers ? (
        <p className="status status-error">
          Only workspace owners and admins can create or edit customers.
        </p>
      ) : null}

      <form className="stack form-stack" action={action}>
        {customer ? <input type="hidden" name="customerId" value={customer.id} /> : null}

        <div className="grid grid-2">
          <label className="field">
            <span>Name</span>
            <input
              name="name"
              type="text"
              defaultValue={values.name}
              placeholder="Jordan Lee"
              required
              disabled={!canManageCustomers}
            />
          </label>

          <label className="field">
            <span>Company</span>
            <input
              name="company"
              type="text"
              defaultValue={values.company}
              placeholder="Northwind Studio"
              disabled={!canManageCustomers}
            />
          </label>
        </div>

        <div className="grid grid-2">
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              defaultValue={values.email}
              placeholder="jordan@northwind.com"
              disabled={!canManageCustomers}
            />
          </label>

          <label className="field">
            <span>Phone</span>
            <input
              name="phone"
              type="tel"
              defaultValue={values.phone}
              placeholder="+1 (555) 123-4567"
              disabled={!canManageCustomers}
            />
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea
            className="textarea"
            name="notes"
            defaultValue={values.notes}
            placeholder="Key context, relationships, or billing notes for future workflows."
            rows={7}
            disabled={!canManageCustomers}
          />
        </label>

        {canManageCustomers ? (
          <SubmitButton
            idleLabel={mode === "create" ? "Create customer" : "Save customer"}
            pendingLabel={
              mode === "create" ? "Creating customer..." : "Saving customer..."
            }
          />
        ) : null}
      </form>
    </section>
  );
}
