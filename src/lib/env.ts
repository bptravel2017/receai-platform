type RuntimeConfigStatus = "ready" | "missing" | "invalid" | "warning";

type RuntimeConfigCheck = {
  key: string;
  label: string;
  value: string;
  status: RuntimeConfigStatus;
  detail: string;
};

type RuntimeConfigSection = {
  id: string;
  title: string;
  summary: string;
  status: RuntimeConfigStatus;
  checks: RuntimeConfigCheck[];
};

type RuntimeConfigReport = {
  sections: RuntimeConfigSection[];
  checkedAt: string;
};

type ServerEnv = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceProMonthly: string;
  stripePriceBusinessMonthly: string;
  platformEmailApiKey: string;
  platformEmailApiBaseUrl: string;
  platformEmailFromEmail: string;
  platformEmailFromName: string;
};

type PublicEnv = {
  appName: string;
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  stripePublishableKey: string;
};

export class RuntimeConfigError extends Error {
  readonly keys: string[];

  constructor(message: string, keys: string[] = []) {
    super(message);
    this.name = "RuntimeConfigError";
    this.keys = keys;
  }
}

const rawServerEnv: ServerEnv = {
  supabaseUrl:
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceProMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  stripePriceBusinessMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? "",
  platformEmailApiKey: process.env.RESEND_API_KEY ?? "",
  platformEmailApiBaseUrl:
    process.env.PLATFORM_EMAIL_API_BASE_URL ?? "https://api.resend.com",
  platformEmailFromEmail: process.env.PLATFORM_EMAIL_FROM_EMAIL ?? "",
  platformEmailFromName: process.env.PLATFORM_EMAIL_FROM_NAME ?? "ReceAI",
};

const rawPublicEnv: PublicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "ReceAI v2",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
};

function normalizeEnvValue(value: string) {
  return value.trim();
}

function isPlaceholderValue(value: string) {
  const normalized = normalizeEnvValue(value).toLowerCase();

  return (
    !normalized ||
    normalized.includes("your-") ||
    normalized.includes("your_") ||
    normalized.includes("changeme") ||
    normalized.includes("example") ||
    normalized.includes("replace-me")
  );
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const parsed = new URL(value);

    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalhostUrl(value: string) {
  try {
    const parsed = new URL(value);

    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isStripePriceId(value: string) {
  return /^price_[A-Za-z0-9]+$/.test(value);
}

function buildCheck(args: {
  key: string;
  label: string;
  value: string;
  requiredMessage: string;
  invalidMessage?: string;
  validate?: (value: string) => boolean;
  warnIf?: (value: string) => boolean;
  warningMessage?: string;
}): RuntimeConfigCheck {
  const value = normalizeEnvValue(args.value);

  if (!value) {
    return {
      key: args.key,
      label: args.label,
      value,
      status: "missing",
      detail: args.requiredMessage,
    };
  }

  if (isPlaceholderValue(value)) {
    return {
      key: args.key,
      label: args.label,
      value,
      status: "invalid",
      detail: args.invalidMessage ?? `${args.label} still uses a placeholder value.`,
    };
  }

  if (args.validate && !args.validate(value)) {
    return {
      key: args.key,
      label: args.label,
      value,
      status: "invalid",
      detail: args.invalidMessage ?? `${args.label} is invalid.`,
    };
  }

  if (args.warnIf?.(value)) {
    return {
      key: args.key,
      label: args.label,
      value,
      status: "warning",
      detail: args.warningMessage ?? `${args.label} needs review before launch.`,
    };
  }

  return {
    key: args.key,
    label: args.label,
    value,
    status: "ready",
    detail: `${args.label} is configured.`,
  };
}

function sectionStatus(checks: RuntimeConfigCheck[]): RuntimeConfigStatus {
  if (checks.some((check) => check.status === "missing")) {
    return "missing";
  }

  if (checks.some((check) => check.status === "invalid")) {
    return "invalid";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "ready";
}

function assertReadyChecks(
  checks: RuntimeConfigCheck[],
  message: string,
  allowedStatuses: RuntimeConfigStatus[] = ["ready"],
) {
  const blocking = checks.filter((check) => !allowedStatuses.includes(check.status));

  if (blocking.length === 0) {
    return;
  }

  throw new RuntimeConfigError(
    `${message} ${blocking
      .map((check) => `${check.key}: ${check.detail}`)
      .join(" ")}`,
    blocking.map((check) => check.key),
  );
}

function getSupabasePublicChecks() {
  return [
    buildCheck({
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "Supabase URL",
      value: rawPublicEnv.supabaseUrl,
      requiredMessage:
        "Set NEXT_PUBLIC_SUPABASE_URL before the app can create Supabase sessions.",
      invalidMessage:
        "NEXT_PUBLIC_SUPABASE_URL must be a real Supabase project URL.",
      validate: isAbsoluteHttpUrl,
    }),
    buildCheck({
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      label: "Supabase anon key",
      value: rawPublicEnv.supabaseAnonKey,
      requiredMessage:
        "Set NEXT_PUBLIC_SUPABASE_ANON_KEY before browser auth and route protection can work.",
    }),
  ];
}

function getSupabaseAdminChecks() {
  return [
    buildCheck({
      key: "SUPABASE_URL",
      label: "Supabase admin URL",
      value: rawServerEnv.supabaseUrl,
      requiredMessage:
        "Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL before server-side admin operations can run.",
      invalidMessage: "SUPABASE_URL must be a real Supabase project URL.",
      validate: isAbsoluteHttpUrl,
    }),
    buildCheck({
      key: "SUPABASE_SERVICE_ROLE_KEY",
      label: "Supabase service role key",
      value: rawServerEnv.supabaseServiceRoleKey,
      requiredMessage:
        "Set SUPABASE_SERVICE_ROLE_KEY before workspace bootstrap, storage uploads, and admin queries can run.",
    }),
  ];
}

function getAppUrlChecks() {
  return [
    buildCheck({
      key: "NEXT_PUBLIC_APP_URL",
      label: "Public app URL",
      value: rawPublicEnv.appUrl,
      requiredMessage:
        "Set NEXT_PUBLIC_APP_URL so auth redirects, invite links, and operator checklists use the correct domain.",
      invalidMessage:
        process.env.NODE_ENV === "production"
          ? "NEXT_PUBLIC_APP_URL must be a real deployed origin and cannot point to localhost in production."
          : "NEXT_PUBLIC_APP_URL must be an absolute http or https URL.",
      validate: (value) =>
        isAbsoluteHttpUrl(value) &&
        !(process.env.NODE_ENV === "production" && isLocalhostUrl(value)),
    }),
  ];
}

function getPlatformEmailChecks() {
  return [
    buildCheck({
      key: "RESEND_API_KEY",
      label: "Platform email API key",
      value: rawServerEnv.platformEmailApiKey,
      requiredMessage:
        "Set RESEND_API_KEY before finalized invoices can be sent by the platform.",
    }),
    buildCheck({
      key: "PLATFORM_EMAIL_FROM_EMAIL",
      label: "Platform sender email",
      value: rawServerEnv.platformEmailFromEmail,
      requiredMessage:
        "Set PLATFORM_EMAIL_FROM_EMAIL before finalized invoice email sending can work.",
      invalidMessage:
        "PLATFORM_EMAIL_FROM_EMAIL must be a valid sender email address.",
      validate: isEmail,
    }),
    buildCheck({
      key: "PLATFORM_EMAIL_API_BASE_URL",
      label: "Platform email API base URL",
      value: rawServerEnv.platformEmailApiBaseUrl,
      requiredMessage:
        "Set PLATFORM_EMAIL_API_BASE_URL if you are not using the default Resend API URL.",
      invalidMessage:
        "PLATFORM_EMAIL_API_BASE_URL must be an absolute http or https URL.",
      validate: isAbsoluteHttpUrl,
    }),
  ];
}

function getStripeChecks() {
  return [
    buildCheck({
      key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      label: "Stripe publishable key",
      value: rawPublicEnv.stripePublishableKey,
      requiredMessage:
        "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY before activating billing UI or Stripe Elements.",
    }),
    buildCheck({
      key: "STRIPE_SECRET_KEY",
      label: "Stripe secret key",
      value: rawServerEnv.stripeSecretKey,
      requiredMessage:
        "Set STRIPE_SECRET_KEY before enabling server-side Stripe checkout or billing portal actions.",
    }),
    buildCheck({
      key: "STRIPE_WEBHOOK_SECRET",
      label: "Stripe webhook secret",
      value: rawServerEnv.stripeWebhookSecret,
      requiredMessage:
        "Set STRIPE_WEBHOOK_SECRET before Stripe webhook processing goes live.",
    }),
    buildCheck({
      key: "STRIPE_PRICE_PRO_MONTHLY",
      label: "Pro price ID",
      value: rawServerEnv.stripePriceProMonthly,
      requiredMessage:
        "Set STRIPE_PRICE_PRO_MONTHLY before you expose real billing plan selection.",
      invalidMessage:
        "STRIPE_PRICE_PRO_MONTHLY must be a Stripe price ID starting with price_, not a product ID.",
      validate: isStripePriceId,
    }),
    buildCheck({
      key: "STRIPE_PRICE_BUSINESS_MONTHLY",
      label: "Business price ID",
      value: rawServerEnv.stripePriceBusinessMonthly,
      requiredMessage:
        "Set STRIPE_PRICE_BUSINESS_MONTHLY before you expose real billing plan selection.",
      invalidMessage:
        "STRIPE_PRICE_BUSINESS_MONTHLY must be a Stripe price ID starting with price_, not a product ID.",
      validate: isStripePriceId,
    }),
  ];
}

export const env = {
  server: rawServerEnv,
  public: rawPublicEnv,
};

export function requirePublicSupabaseEnv() {
  const checks = getSupabasePublicChecks();

  assertReadyChecks(
    checks,
    "ReceAI cannot start the Supabase browser/session boundary.",
  );

  return {
    supabaseUrl: normalizeEnvValue(rawPublicEnv.supabaseUrl),
    supabaseAnonKey: normalizeEnvValue(rawPublicEnv.supabaseAnonKey),
  };
}

export function requireSupabaseAdminEnv() {
  const checks = [...getSupabasePublicChecks(), ...getSupabaseAdminChecks()];

  assertReadyChecks(
    checks,
    "ReceAI cannot start the Supabase admin boundary.",
  );

  return {
    supabaseUrl: normalizeEnvValue(rawServerEnv.supabaseUrl),
    supabaseServiceRoleKey: normalizeEnvValue(rawServerEnv.supabaseServiceRoleKey),
  };
}

export function requirePlatformEmailEnv() {
  const checks = getPlatformEmailChecks();

  assertReadyChecks(
    checks,
    "ReceAI cannot send platform invoice email right now.",
  );

  return {
    apiKey: normalizeEnvValue(rawServerEnv.platformEmailApiKey),
    apiBaseUrl: normalizeEnvValue(rawServerEnv.platformEmailApiBaseUrl),
    fromEmail: normalizeEnvValue(rawServerEnv.platformEmailFromEmail),
    fromName: normalizeEnvValue(rawServerEnv.platformEmailFromName) || "ReceAI",
  };
}

export function requireStripeServerEnv() {
  const checks = getStripeChecks().filter(
    (check) =>
      check.key === "STRIPE_SECRET_KEY" ||
      check.key === "STRIPE_WEBHOOK_SECRET" ||
      check.key === "STRIPE_PRICE_PRO_MONTHLY" ||
      check.key === "STRIPE_PRICE_BUSINESS_MONTHLY",
  );

  assertReadyChecks(
    checks,
    "ReceAI cannot use the Stripe server boundary right now.",
  );

  return {
    secretKey: normalizeEnvValue(rawServerEnv.stripeSecretKey),
    webhookSecret: normalizeEnvValue(rawServerEnv.stripeWebhookSecret),
    proMonthlyPriceId: normalizeEnvValue(rawServerEnv.stripePriceProMonthly),
    businessMonthlyPriceId: normalizeEnvValue(rawServerEnv.stripePriceBusinessMonthly),
  };
}

export function requirePublicAppUrl() {
  const checks = getAppUrlChecks();

  assertReadyChecks(
    checks,
    "ReceAI cannot build safe public URLs right now.",
  );

  return normalizeEnvValue(rawPublicEnv.appUrl);
}

export function getDeploymentReadinessReport(): RuntimeConfigReport {
  const sections: RuntimeConfigSection[] = [
    {
      id: "app",
      title: "App URLs",
      summary:
        "Required for auth callbacks, invite acceptance, and operator-facing deployment assumptions.",
      checks: getAppUrlChecks(),
      status: "ready",
    },
    {
      id: "supabase",
      title: "Supabase",
      summary:
        "Required for auth, workspace bootstrap, storage access, and all business data boundaries.",
      checks: [...getSupabasePublicChecks(), ...getSupabaseAdminChecks()],
      status: "ready",
    },
    {
      id: "email",
      title: "Platform Email",
      summary:
        "Required for platform-side finalized invoice delivery. Workspace reply-to remains a per-workspace setting.",
      checks: getPlatformEmailChecks(),
      status: "ready",
    },
    {
      id: "stripe",
      title: "Stripe",
      summary:
        "Billing remains intentionally shallow, but keys and plan IDs should be ready before production rollout.",
      checks: getStripeChecks(),
      status: "ready",
    },
  ];

  return {
    checkedAt: new Date().toISOString(),
    sections: sections.map((section) => ({
      ...section,
      status: sectionStatus(section.checks),
    })),
  };
}
