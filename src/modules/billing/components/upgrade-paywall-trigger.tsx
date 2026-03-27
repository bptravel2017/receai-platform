"use client";

import { useState } from "react";

import { UpgradePaywallModal } from "@/modules/billing/components/upgrade-paywall-modal";

type UpgradePaywallTriggerProps = {
  label: string;
  className?: string;
  requiredPlan?: "pro" | "business";
  title?: string;
  message?: string;
};

export function UpgradePaywallTrigger({
  label,
  className,
  requiredPlan = "pro",
  title,
  message,
}: UpgradePaywallTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <UpgradePaywallModal
        onClose={() => setOpen(false)}
        open={open}
        requiredPlan={requiredPlan}
        title={title}
        message={message}
      />
    </>
  );
}
