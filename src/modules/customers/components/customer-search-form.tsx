type CustomerSearchFormProps = {
  initialQuery: string;
};

export function CustomerSearchForm({
  initialQuery,
}: CustomerSearchFormProps) {
  return (
    <form className="surface section customer-toolbar" method="get">
      <label className="field">
        <span>Search customers</span>
        <input
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder="Search by name, company, email, or phone"
        />
      </label>

      <div className="customer-toolbar-actions">
        <button className="button-secondary" type="submit">
          Search
        </button>
      </div>
    </form>
  );
}
