import { SubmitButton } from "@/components/auth/submit-button";
import { createCostCategoryAction } from "@/modules/costs/actions";

type CostCategoryCreateFormProps = {
  disabled: boolean;
};

export function CostCategoryCreateForm({
  disabled,
}: CostCategoryCreateFormProps) {
  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">New category</p>
        <h2 className="section-title">Create company cost category</h2>
        <p className="muted">
          Company costs use editable categories. Group-linked costs do not.
        </p>
      </div>

      <form className="stack form-stack" action={createCostCategoryAction}>
        <label className="field">
          <span>Name</span>
          <input
            name="name"
            type="text"
            placeholder="Software"
            required
            disabled={disabled}
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            className="textarea"
            name="description"
            rows={3}
            placeholder="Workspace-wide software subscriptions and tooling."
            disabled={disabled}
          />
        </label>

        {!disabled ? (
          <SubmitButton
            idleLabel="Create category"
            pendingLabel="Creating category..."
          />
        ) : null}
      </form>
    </section>
  );
}
