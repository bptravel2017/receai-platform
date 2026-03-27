type SettingsStatusBannerProps = {
  status?: {
    kind: "error" | "message";
    text: string;
  } | null;
};

export function SettingsStatusBanner({
  status,
}: SettingsStatusBannerProps) {
  if (!status) {
    return null;
  }

  return (
    <p className={status.kind === "error" ? "status status-error" : "status status-message"}>
      {status.text}
    </p>
  );
}
