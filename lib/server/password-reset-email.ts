import { getAppUrl } from "@/lib/server/app-url";

type PasswordResetEmailConfig = {
  apiKey: string;
  from: string;
  appUrl: URL;
};

export function getPasswordResetEmailConfig(): PasswordResetEmailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error("Set RESEND_API_KEY and EMAIL_FROM to enable account emails.");
  }

  return { apiKey, from, appUrl: getAppUrl() };
}

async function sendEmail(
  email: string,
  subject: string,
  text: string,
  html: string,
  config: PasswordResetEmailConfig,
): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status} while sending an account email.`);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  config: PasswordResetEmailConfig,
): Promise<void> {
  const link = new URL("/reset-password", config.appUrl.origin);
  link.searchParams.set("token", token);
  const resetUrl = link.toString();
  await sendEmail(
    email,
    "Reset your SpendWise password",
    `We received a request to reset your SpendWise password. Use this link within 60 minutes: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    `<p>We received a request to reset your SpendWise password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>`,
    config,
  );
}

export async function sendEmailChangeConfirmation(
  email: string,
  token: string,
  config: PasswordResetEmailConfig,
): Promise<void> {
  const link = new URL("/verify-email-change", config.appUrl.origin);
  link.searchParams.set("token", token);
  const confirmationUrl = link.toString();
  await sendEmail(
    email,
    "Confirm your SpendWise email change",
    `Use this link within 60 minutes to confirm your new SpendWise email address: ${confirmationUrl}\n\nIf you did not request this, you can ignore this email.`,
    `<p>Confirm your new SpendWise email address.</p><p><a href="${confirmationUrl}">Confirm email address</a></p><p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>`,
    config,
  );
}
