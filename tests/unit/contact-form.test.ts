import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";
import { contactFormEnabled, contactMessage } from "@/lib/contact-form";
import { hashIp, rateLimited, resetLocalRateLimits } from "@/lib/rate-limit";

const ORIGIN = "https://collinsnyagaka.com";
const KEYS = {
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key",
  TURNSTILE_SECRET_KEY: "secret",
  RESEND_API_KEY: "re_test",
  CONTACT_FROM_EMAIL: "Portfolio <hello@example.com>",
};
const valid = {
  name: "Ada",
  email: "ada@example.com",
  topic: "role",
  message: "Hello, I'd like to talk about a remote ML role.",
  turnstileToken: "token",
};

function post(
  body: unknown,
  {
    origin = ORIGIN,
    type = "application/json",
    ip = "203.0.113.5",
  }: { origin?: string | null; type?: string; ip?: string } = {},
) {
  const headers: Record<string, string> = {
    "content-type": type,
    "x-forwarded-for": ip,
  };
  if (origin) headers.origin = origin;
  return POST(
    new Request(`${ORIGIN}/api/contact`, {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetLocalRateLimits();
  for (const [k, v] of Object.entries(KEYS)) vi.stubEnv(k, v);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  fetchMock = vi.fn(async (url: string) => {
    if (url.includes("siteverify")) return Response.json({ success: true });
    if (url.includes("resend.com")) return Response.json({ id: "1" });
    throw new Error("unexpected fetch " + url);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("contact form switch", () => {
  it("is off unless every key is set", () => {
    expect(contactFormEnabled({})).toBe(false);
    expect(contactFormEnabled({ ...KEYS, RESEND_API_KEY: "" })).toBe(false);
    expect(contactFormEnabled(KEYS)).toBe(true);
  });

  it("returns 503 when off", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await post(valid)).status).toBe(503);
  });
});

describe("POST /api/contact", () => {
  it("verifies Turnstile, emails the owner and returns ok", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const [, emailCall] = fetchMock.mock.calls;
    const sent = JSON.parse(emailCall[1].body);
    expect(sent.reply_to).toBe("ada@example.com");
    expect(sent.subject).toBe("Portfolio contact: A role or interview");
    expect(sent.text).toContain("remote ML role");
  });

  it("rejects cross-origin and missing-origin posts (07 item 15)", async () => {
    expect((await post(valid, { origin: "https://evil.example" })).status).toBe(
      403,
    );
    expect((await post(valid, { origin: null })).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects the wrong content type and oversized bodies", async () => {
    expect((await post(valid, { type: "text/plain" })).status).toBe(415);
    const big = { ...valid, message: "x".repeat(9000) };
    expect((await post(big)).status).toBe(413);
  });

  it("returns field errors for invalid input", async () => {
    const res = await post({
      ...valid,
      name: "",
      email: "not-an-email",
      topic: "crypto",
      message: "too short",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Object.keys(body.fields).sort()).toEqual(
      ["email", "message", "name", "topic"].sort(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unknown fields and bad JSON", async () => {
    expect((await post({ ...valid, admin: true })).status).toBe(400);
    expect((await post("{not json")).status).toBe(400);
  });

  it("pretends success for a filled honeypot and sends nothing", async () => {
    const res = await post({ ...valid, website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a failed Turnstile check without emailing", async () => {
    fetchMock.mockImplementationOnce(async () =>
      Response.json({ success: false }),
    );
    const res = await post(valid);
    expect(res.status).toBe(400);
    expect((await res.json()).fields.turnstileToken).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("hides upstream failures behind 502", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("siteverify")
        ? Response.json({ success: true })
        : new Response("internal detail", { status: 500 }),
    );
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "send_failed" });
  });

  it("allows 3 messages per hour per IP, then 429 with Retry-After", async () => {
    for (let i = 0; i < 3; i++)
      expect((await post(valid, { ip: "198.51.100.1" })).status).toBe(200);
    const res = await post(valid, { ip: "198.51.100.1" });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(res.headers.get("Retry-After")).toBe(String(body.retryAfterSeconds));
    expect((await post(valid, { ip: "198.51.100.2" })).status).toBe(200);
  });
});

describe("rate limit privacy", () => {
  it("sends Redis only a hash of the IP", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    const bodies: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = String(init.body);
        bodies.push(body);
        return Response.json(
          body.includes('"SET"')
            ? [{ result: "OK" }, { result: "salt-today" }]
            : [{ result: 1 }, { result: 1 }],
        );
      }),
    );
    expect(await rateLimited("contact", "203.0.113.99", 3, 3600)).toBe(0);
    const all = bodies.join("\n");
    expect(all).not.toContain("203.0.113.99");
    expect(all).toContain(await hashIp("203.0.113.99", "salt-today"));
  });
});

describe("validation and rate limit units", () => {
  it("trims and bounds fields", () => {
    expect(
      contactMessage.safeParse({
        ...valid,
        message: "   " + "a".repeat(19) + "   ",
      }).success,
    ).toBe(false);
    expect(
      contactMessage.safeParse({ ...valid, email: `${"a".repeat(250)}@x.io` })
        .success,
    ).toBe(false);
  });

  it("windows reset after the period", async () => {
    const t = 1_000_000_000_000;
    for (let i = 0; i < 3; i++) await rateLimited("t", "ip", 3, 60, t);
    expect(await rateLimited("t", "ip", 3, 60, t)).toBeGreaterThan(0);
    expect(await rateLimited("t", "ip", 3, 60, t + 61_000)).toBe(0);
  });
});
