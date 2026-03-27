import Stripe from "stripe";

import type { AuthenticatedAppContext } from "@/lib/auth/types";
import {
  RuntimeConfigError,
  requirePublicAppUrl,
  requireStripeServerEnv,
} from "@/lib/env";
import { ensureStripeCustomer } from "@/lib/stripe/customers";
import { getStripeServerClient } from "@/lib/stripe/config";
import {
  createBillingEvent,
  getWorkspaceBillingAccountByStripeCustomerId,
  getWorkspaceBillingSummaryByWorkspaceId,
  getWorkspaceSubscriptionByStripeSubscriptionId,
  upsertWorkspaceBillingAccount,
  upsertWorkspaceSubscription,
} from "@/modules/billing/accounts";
import type {
  BillingPlan,
  BillingStatus,
} from "@/modules/billing/types";

type BillingCheckoutPayload = {
  plan: string;
};

type CheckoutPlan = "pro" | "business";
type StripeKeyMode = "live" | "test" | "unknown";

const CHECKOUT_PAYMENT_METHOD_TYPES: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
  "card",
];
const GENERIC_CHECKOUT_ERROR_MESSAGE =
  "Payment setup error. Please try again in a moment or contact support.";

export class BillingError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "BillingError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function assertCanManageBilling(context: AuthenticatedAppContext) {
  if (context.workspace.role !== "owner" && context.workspace.role !== "admin") {
    throw new BillingError(
      403,
      "forbidden",
      "Only workspace owners and admins can manage billing.",
    );
  }
}

function parseBillingCheckoutPayload(payload: unknown): BillingCheckoutPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BillingError(400, "invalid_body", "Request body must be a JSON object.");
  }

  const plan = typeof (payload as Record<string, unknown>).plan === "string"
    ? (payload as Record<string, string>).plan.trim()
    : "";

  if (!plan) {
    throw new BillingError(422, "validation_error", "plan is required.");
  }

  return { plan };
}

function getStripePriceIds() {
  const config = requireStripeServerEnv();

  return {
    pro: config.proMonthlyPriceId,
    business: config.businessMonthlyPriceId,
  };
}

function isStripePriceId(value: string) {
  return /^price_[A-Za-z0-9]+$/.test(value);
}

function getStripeKeyMode(secretKey: string): StripeKeyMode {
  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  return "unknown";
}

function assertValidStripePriceId(priceId: string, plan: CheckoutPlan) {
  const normalizedPriceId = priceId.trim();

  if (isStripePriceId(normalizedPriceId)) {
    return normalizedPriceId;
  }

  throw new BillingError(
    500,
    "invalid_stripe_price_id",
    `Stripe checkout is misconfigured for the ${plan} plan. Expected a Stripe price ID starting with "price_", received "${normalizedPriceId || "(empty)"}".`,
    {
      plan,
      priceId: normalizedPriceId,
    },
  );
}

function resolvePlan(plan: string): CheckoutPlan {
  if (plan === "pro" || plan === "business") {
    return plan;
  }

  throw new BillingError(
    422,
    "validation_error",
    "plan must be either pro or business.",
  );
}

function safeErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return error;
}

function logBillingCheckoutFailure(args: {
  step: string;
  plan?: CheckoutPlan;
  priceId?: string | null;
  appUrl?: string | null;
  stripeKeyMode?: StripeKeyMode;
  error: unknown;
}) {
  console.error("[billing.checkout] failure", {
    step: args.step,
    plan: args.plan ?? null,
    priceId: args.priceId ?? null,
    appUrl: args.appUrl ?? null,
    stripeKeyMode: args.stripeKeyMode ?? "unknown",
    error: safeErrorDetails(args.error),
  });
}

async function validateCheckoutPrice(args: {
  stripe: Stripe;
  plan: CheckoutPlan;
  priceId: string;
  stripeKeyMode: StripeKeyMode;
  appUrl: string;
}) {
  try {
    const price = await args.stripe.prices.retrieve(args.priceId);

    console.log("[billing.checkout] resolved Stripe price", {
      plan: args.plan,
      priceId: args.priceId,
      currency: price.currency,
      active: price.active,
      type: price.type,
      recurringInterval: price.recurring?.interval ?? null,
      priceLivemode: price.livemode,
      stripeKeyMode: args.stripeKeyMode,
      appUrl: args.appUrl,
    });

    if (!price.active || price.type !== "recurring" || !price.currency) {
      throw new BillingError(
        500,
        "checkout_configuration_error",
        GENERIC_CHECKOUT_ERROR_MESSAGE,
        {
          plan: args.plan,
          priceId: args.priceId,
          active: price.active,
          type: price.type,
          currency: price.currency,
        },
      );
    }

    if (price.recurring?.interval !== "month") {
      throw new BillingError(
        500,
        "checkout_configuration_error",
        GENERIC_CHECKOUT_ERROR_MESSAGE,
        {
          plan: args.plan,
          priceId: args.priceId,
          recurringInterval: price.recurring?.interval ?? null,
        },
      );
    }

    return price;
  } catch (error) {
    if (error instanceof BillingError) {
      throw error;
    }

    logBillingCheckoutFailure({
      step: "validate_price",
      plan: args.plan,
      priceId: args.priceId,
      appUrl: args.appUrl,
      stripeKeyMode: args.stripeKeyMode,
      error,
    });

    throw new BillingError(
      500,
      "checkout_configuration_error",
      GENERIC_CHECKOUT_ERROR_MESSAGE,
      {
        plan: args.plan,
        priceId: args.priceId,
      },
    );
  }
}

function planFromPriceId(priceId: string | null): BillingPlan | null {
  if (!priceId) {
    return null;
  }

  const prices = getStripePriceIds();

  if (priceId === prices.pro) {
    return "pro";
  }

  if (priceId === prices.business) {
    return "business";
  }

  return "custom";
}

function normalizeStripeStatus(status: string | null | undefined): BillingStatus {
  switch (status) {
    case "incomplete":
    case "incomplete_expired":
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "paused":
      return status;
    default:
      return "not_started";
  }
}

function toIsoTimestamp(unixSeconds: number | null | undefined) {
  return typeof unixSeconds === "number"
    ? new Date(unixSeconds * 1000).toISOString()
    : null;
}

async function syncSubscriptionState(args: {
  workspaceId: string;
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
}) {
  const item = args.subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const currentPeriodStart = item?.current_period_start ?? null;
  const currentPeriodEnd = item?.current_period_end ?? null;
  const plan = planFromPriceId(priceId);
  const status = normalizeStripeStatus(args.subscription.status);

  const billingAccount = await upsertWorkspaceBillingAccount(
    {
      workspaceId: args.workspaceId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.subscription.id,
      plan,
      priceId,
      status,
      currentPeriodStart: toIsoTimestamp(currentPeriodStart),
      currentPeriodEnd: toIsoTimestamp(currentPeriodEnd),
    },
    { admin: true },
  );

  await upsertWorkspaceSubscription({
    workspaceId: args.workspaceId,
    stripeCustomerId: args.stripeCustomerId,
    stripeSubscriptionId: args.subscription.id,
    stripePriceId: priceId,
    plan,
    status,
    currentPeriodStart: toIsoTimestamp(currentPeriodStart),
    currentPeriodEnd: toIsoTimestamp(currentPeriodEnd),
  });

  return billingAccount;
}

async function getStripeSubscriptionFromCheckoutSession(
  session: Stripe.Checkout.Session,
) {
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    return null;
  }

  const stripe = getStripeServerClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function getWorkspaceBillingSummary(
  context: AuthenticatedAppContext,
) {
  return getWorkspaceBillingSummaryByWorkspaceId(context.workspace.id);
}

export async function createBillingCheckoutSession(
  context: AuthenticatedAppContext,
  payload: unknown,
) {
  assertCanManageBilling(context);

  const parsed = parseBillingCheckoutPayload(payload);
  const plan = resolvePlan(parsed.plan);
  let stripeConfig;
  let appUrl;

  try {
    stripeConfig = requireStripeServerEnv();
    appUrl = requirePublicAppUrl();
  } catch (error) {
    logBillingCheckoutFailure({
      step: "load_config",
      plan,
      error,
    });

    throw new BillingError(
      500,
      "missing_stripe_config",
      GENERIC_CHECKOUT_ERROR_MESSAGE,
      {
        plan,
        cause: error instanceof RuntimeConfigError ? error.keys : undefined,
      },
    );
  }

  const stripeKeyMode = getStripeKeyMode(stripeConfig.secretKey);
  const prices = {
    pro: stripeConfig.proMonthlyPriceId,
    business: stripeConfig.businessMonthlyPriceId,
  };
  const priceId = assertValidStripePriceId(prices[plan], plan);
  const existing = await getWorkspaceBillingSummaryByWorkspaceId(context.workspace.id);
  const stripeCustomerId = await ensureStripeCustomer({
    existingStripeCustomerId: existing?.stripeCustomerId ?? null,
    workspaceId: context.workspace.id,
    workspaceName: context.workspace.name,
    workspaceSlug: context.workspace.slug,
    userEmail: context.user.email,
    billingEmail: context.workspace.replyToEmail,
  });
  const stripe = getStripeServerClient();
  const validatedPrice = await validateCheckoutPrice({
    stripe,
    plan,
    priceId,
    stripeKeyMode,
    appUrl,
  });

  if (
    existing?.stripeSubscriptionId &&
    (existing.status === "active" ||
      existing.status === "trialing" ||
      existing.status === "past_due" ||
      existing.status === "unpaid" ||
      existing.status === "paused")
  ) {
    if (existing.priceId === priceId) {
      return {
        url: `${appUrl}/billing/success?subscription_id=${encodeURIComponent(existing.stripeSubscriptionId)}`,
        customerId: stripeCustomerId,
        plan,
      };
    }

    let subscription: Stripe.Subscription;

    try {
      subscription = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
    } catch (error) {
      logBillingCheckoutFailure({
        step: "retrieve_subscription",
        plan,
        priceId,
        appUrl,
        stripeKeyMode,
        error,
      });

      throw new BillingError(
        500,
        "checkout_configuration_error",
        GENERIC_CHECKOUT_ERROR_MESSAGE,
        {
          plan,
          priceId,
          subscriptionId: existing.stripeSubscriptionId,
        },
      );
    }

    const item = subscription.items.data[0];

    if (!item) {
      throw new BillingError(
        500,
        "subscription_item_missing",
        GENERIC_CHECKOUT_ERROR_MESSAGE,
      );
    }

    console.log("[billing.checkout] updating existing Stripe subscription", {
      workspaceId: context.workspace.id,
      plan,
      priceId,
      subscriptionId: existing.stripeSubscriptionId,
    });

    try {
      await stripe.subscriptions.update(existing.stripeSubscriptionId, {
        items: [
          {
            id: item.id,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
        metadata: {
          workspace_id: context.workspace.id,
          workspace_slug: context.workspace.slug,
          plan,
        },
      });
    } catch (error) {
      logBillingCheckoutFailure({
        step: "update_subscription",
        plan,
        priceId,
        appUrl,
        stripeKeyMode,
        error,
      });

      throw new BillingError(
        500,
        "checkout_configuration_error",
        GENERIC_CHECKOUT_ERROR_MESSAGE,
        {
          plan,
          priceId,
          subscriptionId: existing.stripeSubscriptionId,
        },
      );
    }

    return {
      url: `${appUrl}/billing/success?subscription_id=${encodeURIComponent(existing.stripeSubscriptionId)}`,
      customerId: stripeCustomerId,
      plan,
    };
  }

  await upsertWorkspaceBillingAccount({
    workspaceId: context.workspace.id,
    stripeCustomerId,
    status: existing?.status ?? "not_started",
    plan: existing?.plan ?? null,
    priceId: existing?.priceId ?? null,
    currentPeriodStart: existing?.currentPeriodStart ?? null,
    currentPeriodEnd: existing?.currentPeriodEnd ?? null,
    stripeSubscriptionId: existing?.stripeSubscriptionId ?? null,
  });

  console.log("[billing.checkout] creating Stripe checkout session", {
    workspaceId: context.workspace.id,
    plan,
    priceId,
    customerId: stripeCustomerId,
    stripeMode: "subscription",
    paymentMethodTypes: CHECKOUT_PAYMENT_METHOD_TYPES,
    paymentMethodTypesConfigured: true,
    successUrl: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/pricing?error=${encodeURIComponent("Subscription checkout was canceled.")}`,
    appUrl,
    stripeKeyMode,
    priceCurrency: validatedPrice.currency,
    priceLivemode: validatedPrice.livemode,
  });

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: context.workspace.id,
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?error=${encodeURIComponent("Subscription checkout was canceled.")}`,
      payment_method_types: CHECKOUT_PAYMENT_METHOD_TYPES,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        workspace_id: context.workspace.id,
        workspace_slug: context.workspace.slug,
        plan,
      },
      subscription_data: {
        metadata: {
          workspace_id: context.workspace.id,
          workspace_slug: context.workspace.slug,
          plan,
        },
      },
    });
  } catch (error) {
    logBillingCheckoutFailure({
      step: "create_session",
      plan,
      priceId,
      appUrl,
      stripeKeyMode,
      error,
    });

    throw new BillingError(
      500,
      "checkout_configuration_error",
      GENERIC_CHECKOUT_ERROR_MESSAGE,
      {
        plan,
        priceId,
      },
    );
  }

  if (!session.url) {
    throw new BillingError(
      500,
      "checkout_session_missing_url",
      GENERIC_CHECKOUT_ERROR_MESSAGE,
    );
  }

  return {
    url: session.url,
    customerId: stripeCustomerId,
    plan,
  };
}

export async function createBillingUpgradeSession(
  context: AuthenticatedAppContext,
  payload: unknown,
) {
  return createBillingCheckoutSession(context, payload);
}

export async function createBillingPortalSession(
  context: AuthenticatedAppContext,
) {
  assertCanManageBilling(context);

  const billingAccount = await getWorkspaceBillingSummaryByWorkspaceId(context.workspace.id);

  if (!billingAccount?.stripeCustomerId) {
    throw new BillingError(
      409,
      "billing_customer_missing",
      "This workspace does not have a Stripe billing customer yet.",
    );
  }

  const stripe = getStripeServerClient();
  const appUrl = requirePublicAppUrl();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: billingAccount.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });

  return {
    url: portalSession.url,
  };
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode !== "subscription" || !session.customer) {
        return { ignored: true };
      }

      const workspaceId =
        session.metadata?.workspace_id ??
        session.client_reference_id ??
        null;

      if (!workspaceId) {
        throw new BillingError(
          400,
          "workspace_metadata_missing",
          "Stripe checkout session did not include workspace metadata.",
        );
      }

      const stripeCustomerId =
        typeof session.customer === "string" ? session.customer : session.customer.id;
      const subscription = await getStripeSubscriptionFromCheckoutSession(session);

      if (!subscription) {
        await upsertWorkspaceBillingAccount(
          {
            workspaceId,
            stripeCustomerId,
          },
          { admin: true },
        );

        return { ignored: false };
      }

      await syncSubscriptionState({
        workspaceId,
        stripeCustomerId,
        subscription,
      });

      await createBillingEvent({
        workspaceId,
        eventType: "upgrade",
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripeEventId: event.id,
        stripeEventType: event.type,
        plan: planFromPriceId(subscription.items.data[0]?.price.id ?? null),
        status: normalizeStripeStatus(subscription.status),
        detail: {
          checkoutSessionId: session.id,
        },
      });

      return { ignored: false };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const workspaceId =
        subscription.metadata?.workspace_id ??
        (await getWorkspaceBillingAccountByStripeCustomerId(stripeCustomerId))
          ?.workspaceId ??
        null;

      if (!workspaceId) {
        throw new BillingError(
          400,
          "workspace_not_found",
          "Stripe subscription could not be matched to a workspace.",
        );
      }

      const previousSubscription = await getWorkspaceSubscriptionByStripeSubscriptionId(
        subscription.id,
      );
      const nextPlan = planFromPriceId(subscription.items.data[0]?.price.id ?? null);
      const nextStatus = normalizeStripeStatus(subscription.status);

      await syncSubscriptionState({
        workspaceId,
        stripeCustomerId,
        subscription,
      });

      if (event.type === "customer.subscription.deleted") {
        await createBillingEvent({
          workspaceId,
          eventType: "cancellation",
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          stripeEventType: event.type,
          plan: nextPlan,
          status: nextStatus,
        });
      } else if (previousSubscription?.plan && previousSubscription.plan !== nextPlan) {
        await createBillingEvent({
          workspaceId,
          eventType:
            previousSubscription.plan === "pro" && nextPlan === "business"
              ? "upgrade"
              : "downgrade",
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          stripeEventType: event.type,
          plan: nextPlan,
          status: nextStatus,
          detail: {
            previousPlan: previousSubscription.plan,
          },
        });
      }

      return { ignored: false };
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : invoice.parent?.subscription_details?.subscription?.id ?? null;

      if (!subscriptionId) {
        return { ignored: true };
      }

      const existingSubscription = await getWorkspaceSubscriptionByStripeSubscriptionId(
        subscriptionId,
      );

      if (!existingSubscription) {
        return { ignored: true };
      }

      const stripe = getStripeServerClient();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await syncSubscriptionState({
        workspaceId: existingSubscription.workspaceId,
        stripeCustomerId,
        subscription,
      });

      await createBillingEvent({
        workspaceId: existingSubscription.workspaceId,
        eventType: event.type === "invoice.paid" ? "renewal" : "payment_failed",
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripeEventId: event.id,
        stripeEventType: event.type,
        plan: planFromPriceId(subscription.items.data[0]?.price.id ?? null),
        status: normalizeStripeStatus(subscription.status),
        detail: {
          stripeInvoiceId: invoice.id,
          billingReason: invoice.billing_reason ?? null,
        },
      });

      return { ignored: false };
    }

    default:
      return { ignored: true };
  }
}

export function toRouteErrorResponse(error: unknown) {
  if (error instanceof BillingError) {
    const safeMessage =
      error.status >= 500 ? GENERIC_CHECKOUT_ERROR_MESSAGE : error.message;

    if (error.status >= 500) {
      console.error("[billing.route] handled billing error", {
        code: error.code,
        status: error.status,
        details: error.details,
        message: error.message,
      });
    }

    return {
      status: error.status,
      code: error.code,
      message: safeMessage,
      details: undefined,
    };
  }

  if (error instanceof RuntimeConfigError) {
    console.error("[billing.route] runtime config error", {
      keys: error.keys,
      message: error.message,
    });

    return {
      status: 500,
      code: "missing_stripe_config",
      message: GENERIC_CHECKOUT_ERROR_MESSAGE,
      details: undefined,
    };
  }

  if (error instanceof Stripe.errors.StripeError) {
    console.error("[billing.route] stripe error", {
      type: error.type,
      code: error.code,
      message: error.message,
      requestId: error.requestId,
    });

    return {
      status: 500,
      code: "checkout_configuration_error",
      message: GENERIC_CHECKOUT_ERROR_MESSAGE,
      details: undefined,
    };
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "code" in error &&
    "message" in error &&
    typeof error.status === "number" &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  ) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details:
        "details" in error
          ? (error as { details?: unknown }).details
          : undefined,
    };
  }

  return {
    status: 500,
    code: "billing_error",
    message: GENERIC_CHECKOUT_ERROR_MESSAGE,
    details: undefined,
  };
}
