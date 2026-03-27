import type { BankImportRecord } from "@/modules/bank/types";

type BankImportListProps = {
  imports: BankImportRecord[];
};

export function BankImportList({ imports }: BankImportListProps) {
  if (imports.length === 0) {
    return (
      <section className="surface section stack">
        <p className="eyebrow">Imports</p>
        <h2 className="section-title">No bank imports yet</h2>
        <p className="muted">
          Start by uploading a CSV file or creating a manual fallback batch. Imported
          transactions will appear in the reconciliation queue after the batch is saved.
        </p>
      </section>
    );
  }

  return (
    <section className="surface section stack">
      <div className="stack stack-tight">
        <p className="eyebrow">Import batches</p>
        <h2 className="section-title">Bank statement imports</h2>
      </div>

      <div className="stack customer-list">
        {imports.map((item) => (
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
            {item.note?.trim() ? (
              <p className="muted customer-notes-preview">{item.note}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
