import type { AuthenticatedAppContext } from "@/lib/auth/types";
import { createGroupAction, updateGroupAction } from "@/modules/groups/actions";
import type { GroupFormValues, GroupRecord } from "@/modules/groups/types";
import type { CustomerChoice } from "@/modules/customers/types";

type GroupFormProps = {
  mode: "create" | "edit";
  context: AuthenticatedAppContext;
  customers: CustomerChoice[];
  values: GroupFormValues;
  group?: GroupRecord | null;
};

export function GroupForm({
  mode,
  context,
  customers,
  values,
  group,
}: GroupFormProps) {
  const canManageGroups =
    context.workspace.role === "owner" || context.workspace.role === "admin";
  const action = mode === "create" ? createGroupAction : updateGroupAction;

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">{mode === "create" ? "New group" : "Group"}</p>
        <h2 className="section-title">
          {mode === "create" ? "Create group" : "Edit group"}
        </h2>
        <p className="muted">
          Groups provide stable linkage for Daytime, costs, and multi-entry invoicing.
        </p>
      </div>

      {!canManageGroups ? (
        <p className="status status-error">
          Only workspace owners and admins can create or edit groups.
        </p>
      ) : null}

      <form className="stack form-stack" action={action}>
        {group ? <input type="hidden" name="groupId" value={group.id} /> : null}

        <label className="field">
          <span>Name</span>
          <input
            name="name"
            type="text"
            defaultValue={values.name}
            placeholder="Morning Route"
            required
            disabled={!canManageGroups}
          />
        </label>

        <div className="grid grid-2">
          <label className="field">
            <span>Customer</span>
            <select
              name="customerId"
              defaultValue={values.customerId}
              disabled={!canManageGroups}
            >
              <option value="">No customer assigned</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.company?.trim() ? ` • ${customer.company}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue={values.status} disabled={!canManageGroups}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Internal notes</span>
          <textarea
            className="textarea"
            name="notesInternal"
            defaultValue={values.notesInternal}
            rows={5}
            placeholder="Internal context for operations and billing."
            disabled={!canManageGroups}
          />
        </label>

        {canManageGroups ? (
          <button className="button-primary" type="submit">
            {mode === "create" ? "Create group" : "Save group"}
          </button>
        ) : null}
      </form>
    </section>
  );
}
