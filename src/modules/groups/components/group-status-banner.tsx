type GroupStatusBannerProps = {
  status?: {
    kind: "error" | "message";
    text: string;
  } | null;
};

export function GroupStatusBanner({ status }: GroupStatusBannerProps) {
  if (!status) {
    return null;
  }

  return (
    <p className={status.kind === "error" ? "status status-error" : "status status-message"}>
      {status.text}
    </p>
  );
}
