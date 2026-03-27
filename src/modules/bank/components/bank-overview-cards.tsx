import Link from "next/link";

import type { BankImportRecord, BankTransactionRecord } from "@/modules/bank/types";

type BankOverviewCardsProps = {
  importCount: number;
  transactionCount: number;
  matchedCount: number;
  unmatchedCount: number;
  latestImports: BankImportRecord[];
  latestTransactions: BankTransactionRecord[];
};

export function BankOverviewCards({
  importCount,
  transactionCount,
  matchedCount,
  unmatchedCount,
  latestImports,
  latestTransactions,
}: BankOverviewCardsProps) {
  return (
    <>
      <section className="grid grid-2 profit-summary-grid">
        <article className="surface section stack profit-summary-card">
          <p className="eyebrow">Imports</p>
          <h2 className="section-title">{importCount}</h2>
          <p className="muted">Bank statement import batches saved in this workspace.</p>
        </article>

        <article className="surface section stack profit-summary-card">
          <p className="eyebrow">Transactions</p>
          <h2 className="section-title">{transactionCount}</h2>
          <p className="muted">Imported bank transactions kept separate from invoices.</p>
        </article>

        <article className="surface section stack profit-summary-card">
          <p className="eyebrow">Matched</p>
          <h2 className="section-title">{matchedCount}</h2>
          <p className="muted">Transactions manually reconciled against finalized invoices.</p>
        </article>

        <article className="surface section stack profit-summary-card">
          <p className="eyebrow">Unmatched</p>
          <h2 className="section-title">{unmatchedCount}</h2>
          <p className="muted">Transactions still waiting for manual review and match.</p>
        </article>
      </section>

      <section className="grid grid-2 profit-breakdown-grid">
        <article className="surface section stack">
          <div className="stack stack-tight">
            <div className="cost-link-row">
              <p className="eyebrow">Recent imports</p>
              <Link className="link-pill" href="/bank/imports">
                Open imports
              </Link>
            </div>
            <h2 className="section-title">Latest import batches</h2>
          </div>

          <div className="stack customer-list">
            {latestImports.length > 0 ? (
              latestImports.map((item) => (
                <article className="customer-card" key={item.id}>
                  <div className="customer-card-header">
                    <div className="stack stack-tight">
                      <strong>{item.sourceName}</strong>
                      <span className="muted">
                        {item.importedTransactionCount} transaction
                        {item.importedTransactionCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="muted">No bank imports yet.</p>
            )}
          </div>
        </article>

        <article className="surface section stack">
          <div className="stack stack-tight">
            <div className="cost-link-row">
              <p className="eyebrow">Recent transactions</p>
              <Link className="link-pill" href="/bank/transactions">
                Open transactions
              </Link>
            </div>
            <h2 className="section-title">Latest reconciliation queue</h2>
          </div>

          <div className="stack customer-list">
            {latestTransactions.length > 0 ? (
              latestTransactions.map((transaction) => (
                <Link
                  className="customer-card"
                  href={`/bank/transactions/${transaction.id}`}
                  key={transaction.id}
                >
                  <div className="customer-card-header">
                    <div className="stack stack-tight">
                      <strong>{transaction.description}</strong>
                      <span className="muted">{transaction.importSourceName}</span>
                    </div>
                    <span className="role-badge">{transaction.reconciliationStatus}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="muted">No bank transactions yet.</p>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
