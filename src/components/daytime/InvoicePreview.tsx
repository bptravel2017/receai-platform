import { ReceiptText } from "lucide-react";
import type { ReactNode } from "react";
import type { RevenueRecordDraft } from "./types";

type InvoicePreviewProps = {
  record: RevenueRecordDraft;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function InvoicePreview({ record }: InvoicePreviewProps) {
  const daytimeItems = record.items.filter((item) => item.type === "daytime");
  const transferItems = record.items.filter((item) => item.type === "transfer");
  const otherItems = record.items.filter((item) => item.type === "other");

  return (
    <section className="rounded-[2rem] border border-border bg-surface/85 p-5 shadow-[0_20px_40px_rgba(16,35,31,0.08)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ReceiptText className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Invoice preview</p>
          <h3 className="text-lg font-semibold text-foreground">What gets invoiced</h3>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {daytimeItems.length > 0 ? (
          <Section title="Daytime revenue">
            {daytimeItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted">
                    Qty {item.quantity} • {formatCurrency(item.unitPrice)} each
                  </div>
                </div>
                <div className="font-semibold text-foreground">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </Section>
        ) : null}

        {transferItems.length > 0 ? (
          <Section title="Transfer services">
            {transferItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted">
                    Qty {item.quantity} • {formatCurrency(item.unitPrice)} each
                  </div>
                </div>
                <div className="font-semibold text-foreground">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </Section>
        ) : null}

        {otherItems.length > 0 ? (
          <Section title="Other charges">
            {otherItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted">
                    Qty {item.quantity} • {formatCurrency(item.unitPrice)} each
                  </div>
                </div>
                <div className="font-semibold text-foreground">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </Section>
        ) : null}

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Accounts receivable</span>
            <span className="text-xl font-bold text-foreground">{formatCurrency(record.total_amount)}</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Only populated sections appear here. Mixed services stay in one invoice.
          </p>
        </div>
      </div>
    </section>
  );
}
