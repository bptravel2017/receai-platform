import Link from "next/link";

import type {
  ProfitCustomerBreakdown,
  ProfitGroupBreakdown,
  ProfitReport,
} from "@/modules/profit/types";

type ProfitBreakdownsProps = {
  report: ProfitReport;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

function getProfitTone(value: number, highest: number, lowest: number) {
  if (value === highest) {
    return "Highest";
  }

  if (value === lowest) {
    return "Lowest";
  }

  return null;
}

function renderCustomerTable(rows: ProfitCustomerBreakdown[]) {
  const highest = Math.max(...rows.map((row) => row.totalProfitCents));
  const lowest = Math.min(...rows.map((row) => row.totalProfitCents));

  return (
    <div className="stack">
      <div className="profit-table-wrap">
        <table className="profit-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              <th>Unbilled Revenue</th>
              <th>Unpaid Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.customerId}>
                <td>
                  <Link href={`/profit/customers/${row.customerId}`}>{row.customerName}</Link>
                  {getProfitTone(row.totalProfitCents, highest, lowest) ? (
                    <>
                      <br />
                      <span className="muted">
                        {getProfitTone(row.totalProfitCents, highest, lowest)}
                      </span>
                    </>
                  ) : null}
                </td>
                <td>{formatAmount(row.totalRevenueCents)}</td>
                <td>{formatAmount(row.totalCostCents)}</td>
                <td>{formatAmount(row.totalProfitCents)}</td>
                <td>{formatAmount(row.unbilledRevenueCents)}</td>
                <td>{formatAmount(row.unpaidCostCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderGroupTable(rows: ProfitGroupBreakdown[]) {
  const highest = Math.max(...rows.map((row) => row.totalProfitCents));
  const lowest = Math.min(...rows.map((row) => row.totalProfitCents));

  return (
    <div className="stack">
      <div className="profit-table-wrap">
        <table className="profit-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              <th>Unbilled Revenue</th>
              <th>Unpaid Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.groupId}>
                <td>
                  <Link href={`/profit/groups/${row.groupId}`}>{row.groupName}</Link>
                  {row.customerName ? (
                    <>
                      <br />
                      <span className="muted">{row.customerName}</span>
                    </>
                  ) : null}
                  {getProfitTone(row.totalProfitCents, highest, lowest) ? (
                    <>
                      <br />
                      <span className="muted">
                        {getProfitTone(row.totalProfitCents, highest, lowest)}
                      </span>
                    </>
                  ) : null}
                </td>
                <td>{formatAmount(row.totalRevenueCents)}</td>
                <td>{formatAmount(row.totalCostCents)}</td>
                <td>{formatAmount(row.totalProfitCents)}</td>
                <td>{formatAmount(row.unbilledRevenueCents)}</td>
                <td>{formatAmount(row.unpaidCostCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProfitBreakdowns({ report }: ProfitBreakdownsProps) {
  const hasAnyRows = report.byCustomer.length > 0 || report.byGroup.length > 0;

  if (!hasAnyRows) {
    return (
      <section className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">Profit</p>
          <h2 className="section-title">No profit rows yet</h2>
          <p className="muted">
            Add Daytime and cost activity before this workspace can show management
            profit views.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid grid-2 profit-breakdown-grid">
      <article className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">By Customer</p>
          <h2 className="section-title">Customer profitability</h2>
          <p className="muted">
            Includes direct customer records and customer-owned group records.
          </p>
        </div>

        {report.byCustomer.length > 0 ? (
          renderCustomerTable(report.byCustomer)
        ) : (
          <p className="muted">No customer rows match the current filters.</p>
        )}
      </article>

      <article className="surface section stack">
        <div className="stack stack-tight">
          <p className="eyebrow">By Group</p>
          <h2 className="section-title">Group profitability</h2>
          <p className="muted">Uses `group_id` only for revenue and cost rollups.</p>
        </div>

        {report.byGroup.length > 0 ? (
          renderGroupTable(report.byGroup)
        ) : (
          <p className="muted">No group rows match the current filters.</p>
        )}
      </article>
    </section>
  );
}
