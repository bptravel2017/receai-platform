import Stripe from "stripe";

import { getStripeServerClient } from "@/lib/stripe/config";
import { requireStripeServerEnv } from "@/lib/env";

export class StripeWebhookError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "StripeWebhookError";
    this.status = status;
    this.code = code;
  }
}

export async function verifyStripeWebhookRequest(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    throw new StripeWebhookError(
      400,
      "missing_signature",
      "Stripe signature header is required.",
    );
  }

  const payload = await request.text();
  const stripe = getStripeServerClient();
  const { webhookSecret } = requireStripeServerEnv();

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      throw new StripeWebhookError(
        400,
        "invalid_signature",
        "Stripe webhook signature verification failed.",
      );
    }

    throw error;
  }
}
