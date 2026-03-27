"use client";

export function InvoicePrintActions() {
  return (
    <div className="invoice-render-actions print-hide">
      <button
        className="button-primary"
        type="button"
        onClick={() => window.print()}
      >
        Print or save PDF
      </button>
    </div>
  );
}
