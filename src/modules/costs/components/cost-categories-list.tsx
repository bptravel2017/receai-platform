import { updateCostCategoryAction } from "@/modules/costs/actions";
import type { CostCategoryRecord } from "@/modules/costs/types";

type CostCategoriesListProps = {
  categories: CostCategoryRecord[];
  canManageCosts: boolean;
};

export function CostCategoriesList({
  categories,
  canManageCosts,
}: CostCategoriesListProps) {
  if (categories.length === 0) {
    return (
      <p className="status status-message">
        No company cost categories yet. Add the first category before assigning company
        costs.
      </p>
    );
  }

  return (
    <div className="stack cost-category-list">
      {categories.map((category) => (
        <section className="surface section stack" key={category.id}>
          <div className="stack stack-tight">
            <p className="eyebrow">Category</p>
            <h2 className="section-title">{category.name}</h2>
            <p className="muted">
              {category.description?.trim() || "No category description yet."}
            </p>
          </div>

          {canManageCosts ? (
            <form className="stack form-stack" action={updateCostCategoryAction}>
              <input type="hidden" name="categoryId" value={category.id} />

              <label className="field">
                <span>Name</span>
                <input name="name" type="text" defaultValue={category.name} required />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  className="textarea"
                  name="description"
                  defaultValue={category.description ?? ""}
                  rows={3}
                />
              </label>

              <button className="button-secondary" type="submit">
                Save category
              </button>
            </form>
          ) : null}
        </section>
      ))}
    </div>
  );
}
