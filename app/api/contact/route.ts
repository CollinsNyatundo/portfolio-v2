import { site } from "@/content/site";
import {
  contactFormEnabled,
  contactMessage,
  fieldErrors,
  sendContactEmail,
  verifyTurnstile,
} from "@/lib/contact-form";
import { rateLimited } from "@/lib/rate-limit";

const MAX_BYTES = 8 * 1024;
const LIMIT = 3; // per hour per IP (02 §5)
const WINDOW = 3600;

function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** POST /api/contact (docs/05 §5). Order: cheap checks first, then the paid calls. */
export async function POST(req: Request) {
  const env = process.env;
  if (!contactFormEnabled(env)) return json(503, { error: "disabled" });

  // CSRF: same-origin only (07 item 15). There are no cookies to ride on.
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    return json(403, { error: "forbidden" });

  if (!req.headers.get("content-type")?.startsWith("application/json"))
    return json(415, { error: "unsupported_media_type" });
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return json(413, { error: "too_large" });

  const ip = clientIp(req);
  const wait = await rateLimited("contact", ip, LIMIT, WINDOW);
  if (wait)
    return json(
      429,
      { error: "rate_limited", retryAfterSeconds: wait },
      { "Retry-After": String(wait) },
    );

  let raw: unknown;
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).length > MAX_BYTES)
      return json(413, { error: "too_large" });
    raw = JSON.parse(text);
  } catch {
    return json(400, {
      error: "validation",
      fields: { form: "is not valid JSON" },
    });
  }

  const parsed = contactMessage.safeParse(raw);
  if (!parsed.success)
    return json(400, {
      error: "validation",
      fields: fieldErrors(parsed.error),
    });

  // Honeypot filled: look successful, send nothing (07 item 45).
  if (parsed.data.website) return json(200, { ok: true });

  try {
    const human = await verifyTurnstile(
      parsed.data.turnstileToken,
      ip,
      env.TURNSTILE_SECRET_KEY!,
    );
    if (!human)
      return json(400, {
        error: "validation",
        fields: { turnstileToken: "couldn't verify you're human; try again" },
      });
    const sent = await sendContactEmail(parsed.data, {
      apiKey: env.RESEND_API_KEY!,
      from: env.CONTACT_FROM_EMAIL!,
      to: site.email,
    });
    if (!sent) return json(502, { error: "send_failed" });
    return json(200, { ok: true });
  } catch {
    // No upstream detail leaves the function (07 item 23).
    return json(502, { error: "send_failed" });
  }
}
