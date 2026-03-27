import Link from "next/link";

import type { BankTransactionRecord } from "@/modules/bank/types";

type BankTransactionListProps = {
  transactions: BankTransactionRecord[];
};

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export function BankTransactionList({ transactions }: BankTransactionListProps) {
  if (transactions.length === 0) {
    return (
      <section className="surface section stack">
        <p className="eyebrow">Transactions</p>
        <h2 className="section-title">No imported transactions yet</h2>
        <p className="muted">
          Import a bank batch first, then open transactions here for manual invoice
          reconciliation.
        </p>
      </section>
    );
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Reconciliation queue</p>
        <h2 className="section-title">Bank transactions</h2>
      </div>

      <div className="stack customer-list">
        {transactions.map((transaction) => (
          <Link
            className="customer-card"
            href={`/bank/transactions/${transaction.id}`}
            key={transaction.id}
          >
            <div className="customer-card-header">
              <div className="stack stack-tight">
                <strong>{transaction.description}</strong>
                <span className="muted">
                  {transaction.transactionDate} • {transaction.importSourceName}
                </span>
              </div>
              <span className="role-badge">{transaction.reconciliationStatus}</span>
            </div>

            <div className="revenue-card-meta">
              <p className="muted">
                <strong>Amount:</strong>{" "}
                {formatAmount(transaction.amountCents, transaction.currency)}
              </p>
              <p className="muted">
                <strong>Reference:</strong>{" "}
                {transaction.reference?.trim() || "No reference"}
              </p>
              <p className="muted">
                <strong>Invoice:</strong>{" "}
                {transaction.linkedInvoiceNumber || "Not matched"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
