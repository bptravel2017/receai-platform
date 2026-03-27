import Stripe from "stripe";

import { requireStripeServerEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripeServerClient() {
  if (!stripeClient) {
    const config = requireStripeServerEnv();

    stripeClient = new Stripe(config.secretKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }

  return stripeClient;
}
