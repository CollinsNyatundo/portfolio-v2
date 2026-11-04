/**
 * Contact form (task 4.8, P1; docs/03 §5, docs/05 §5, 07 items 15, 17, 44,
 * 45, 50). It is off until every key below is set, so the site ships safely
 * before the owner signs up for Turnstile and Resend.
 */
import { z } from "zod";

export const CONTACT_TOPICS = [
  { value: "general", label: "General" },
  { value: "role", label: "A role or interview" },
  { value: "walkthrough", label: "A walkthrough of private work" },
  { value: "freelance", label: "Freelance or company work" },
] as const;

export const contactMessage = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "is required")
    .max(100, "must be at most 100 characters"),
  email: z
    .email("must be a valid email address")
    .max(254, "must be at most 254 characters"),
  topic: z.enum(
    CONTACT_TOPICS.map((t) => t.value) as [string, ...string[]],
    "must be one of the listed topics",
  ),
  message: z
    .string()
    .trim()
    .min(20, "must be at least 20 characters")
    .max(2000, "must be at most 2000 characters"),
  /** Honeypot: hidden from people, filled by naive bots (07 item 45). */
  website: z.string().max(200).optional(),
  turnstileToken: z.string().min(1, "is required").max(2048),
});

export type ContactMessage = z.infer<typeof contactMessage>;

/** The form is on only when all its services are configured. */
export function contactFormEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    env.TURNSTILE_SECRET_KEY &&
    env.RESEND_API_KEY &&
    env.CONTACT_FROM_EMAIL,
  );
}

/** Field errors keyed by field name, for inline display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function verifyTurnstile(
  token: string,
  ip: string,
  secret: string,
): Promise<boolean> {
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    },
  );
  if (!res.ok) return false;
  const body = (await res.json()) as { success?: boolean };
  return body.success === true;
}

/** Plain-text email to the owner only; nothing is stored (02 §5). */
export async function sendContactEmail(
  msg: ContactMessage,
  opts: { apiKey: string; from: string; to: string },
): Promise<boolean> {
  const topic =
    CONTACT_TOPICS.find((t) => t.value === msg.topic)?.label ?? "General";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      reply_to: msg.email,
      subject: `Portfolio contact: ${topic}`,
      text: `From: ${msg.name} <${msg.email}>\nTopic: ${topic}\n\n${msg.message}\n`,
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  return res.ok;
}
