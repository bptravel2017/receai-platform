import { requirePlatformEmailEnv } from "@/lib/env";

export class PlatformEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformEmailError";
  }
}

type SendPlatformEmailInput = {
  to: string;
  replyToEmail?: string | null;
  subject: string;
  html: string;
  text: string;
};

export async function sendPlatformEmail(input: SendPlatformEmailInput) {
  let config;

  try {
    config = requirePlatformEmailEnv();
  } catch (error) {
    throw new PlatformEmailError(
      error instanceof Error ? error.message : "Platform email is not configured.",
    );
  }

  const from = `${config.fromName} <${config.fromEmail}>`;
  const response = await fetch(`${config.apiBaseUrl}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: input.replyToEmail?.trim() ? input.replyToEmail : undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new PlatformEmailError(
      payload?.message ||
        payload?.error?.message ||
        "The platform email provider rejected this invoice send request.",
    );
  }

  return {
    providerMessageId: payload?.id ?? null,
  };
}
