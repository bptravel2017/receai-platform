type ReceiptStatusBannerProps = {
  status?: {
    kind: "error" | "message";
    text: string;
  } | null;
};

export function ReceiptStatusBanner({ status }: ReceiptStatusBannerProps) {
  if (!status) {
    return null;
  }

  return (
    <p className={status.kind === "error" ? "status status-error" : "status status-message"}>
      {status.text}
    </p>
  );
}
