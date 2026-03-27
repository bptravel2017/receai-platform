import type { CustomerChoice } from "@/modules/customers/types";
import type { GroupChoice } from "@/modules/groups/types";
import type { ProfitFilters } from "@/modules/profit/types";

type ProfitFilterFormProps = {
  filters: ProfitFilters;
  customers: CustomerChoice[];
  groups: GroupChoice[];
};

export function ProfitFilterForm({
  filters,
  customers,
  groups,
}: ProfitFilterFormProps) {
  return (
    <form className="surface section stack form-stack" method="get">
      <div className="stack stack-tight">
        <p className="eyebrow">Filters</p>
        <h2 className="section-title">Refine profit views</h2>
        <p className="muted">
          Revenue uses Daytime service date and costs use cost date. Customer and group
          filters apply to both summary sections.
        </p>
      </div>

      <div className="grid grid-2 profit-filter-grid">
        <label className="field">
          <span>Start date</span>
          <input name="start" type="date" defaultValue={filters.startDate} />
        </label>

        <label className="field">
          <span>End date</span>
          <input name="end" type="date" defaultValue={filters.endDate} />
        </label>

        <label className="field">
          <span>Customer</span>
          <select name="customerId" defaultValue={filters.customerId}>
            <option value="">All customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Group</span>
          <select name="groupId" defaultValue={filters.groupId}>
            <option value="">All groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Billing state</span>
          <select name="billingState" defaultValue={filters.billingState}>
            <option value="all">All</option>
            <option value="not_needed">Not needed</option>
            <option value="unbilled">Unbilled</option>
            <option value="billed">Billed</option>
          </select>
        </label>

        <label className="field">
          <span>Payment status</span>
          <select name="paymentStatus" defaultValue={filters.paymentStatus}>
            <option value="all">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </label>

        <label className="field">
          <span>Sort by</span>
          <select name="sortBy" defaultValue={filters.sortBy}>
            <option value="profit">Profit</option>
            <option value="revenue">Revenue</option>
            <option value="cost">Cost</option>
          </select>
        </label>

        <label className="field">
          <span>Direction</span>
          <select name="sortDirection" defaultValue={filters.sortDirection}>
            <option value="desc">Highest first</option>
            <option value="asc">Lowest first</option>
          </select>
        </label>
      </div>

      <div className="cost-link-row">
        <button className="button-primary" type="submit">
          Update report
        </button>
      </div>
    </form>
  );
}
