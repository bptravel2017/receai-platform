import { PricingCheckoutButton } from "@/modules/billing/components/pricing-checkout-button";

type UsageLimitNoticeProps = {
  used: number;
  limit: number;
  label: string;
  exceeded?: boolean;
};

export function UsageLimitNotice({
  used,
  limit,
  label,
  exceeded = false,
}: UsageLimitNoticeProps) {
  return (
    <div className={exceeded ? "status status-error" : "status status-message"}>
      <span>
        {exceeded
          ? "Limit reached. Upgrade to Pro to continue."
          : `You are using ${used}/${limit} ${label}`}
      </span>
      <PricingCheckoutButton
        className="button-accent"
        label="Upgrade to Pro"
        plan="pro"
      />
    </div>
  );
}
