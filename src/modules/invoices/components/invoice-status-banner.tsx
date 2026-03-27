import Link from "next/link";

type InvoiceStatusBannerProps = {
  status?: {
    kind: "error" | "message";
    text: string;
  } | null;
  actionHref?: string;
  actionLabel?: string;
};

export function InvoiceStatusBanner({
  status,
  actionHref,
  actionLabel,
}: InvoiceStatusBannerProps) {
  if (!status) {
    return null;
  }

  return (
    <div
      className={status.kind === "error" ? "status status-error" : "status status-message"}
    >
      <span>{status.text}</span>
      {actionHref && actionLabel ? (
        <>
          {" "}
          <Link href={actionHref}>{actionLabel}</Link>
        </>
      ) : null}
    </div>
  );
}
