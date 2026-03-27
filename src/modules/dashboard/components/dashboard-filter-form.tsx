import Link from "next/link";

import type { DashboardFilters } from "@/modules/dashboard/types";

type DashboardFilterFormProps = {
  filters: DashboardFilters;
};

export function DashboardFilterForm({ filters }: DashboardFilterFormProps) {
  return (
    <form className="surface section stack form-stack dashboard-filter-card" method="get">
      <div className="stack stack-tight">
        <p className="eyebrow">Date Filter</p>
        <h2 className="section-title dashboard-section-heading">Operational window</h2>
      </div>

      <div className="grid grid-2">
        <label className="field">
          <span>Range</span>
          <select name="range" defaultValue={filters.range}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label className="field">
          <span>Start date</span>
          <input name="start" type="date" defaultValue={filters.startDate} />
        </label>

        <label className="field">
          <span>End date</span>
          <input name="end" type="date" defaultValue={filters.endDate} />
        </label>
      </div>

      <div className="cost-link-row">
        <button className="button-primary" type="submit">
          Update view
        </button>
        <Link className="link-pill" href="/dashboard">
          Reset
        </Link>
      </div>
    </form>
  );
}
