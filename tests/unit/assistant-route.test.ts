import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/assistant/route";
import {
  assistantRuntimeMode,
  validateProviderUrl,
} from "@/lib/assistant/config";
import { resetLocalRateLimits } from "@/lib/rate-limit";
import {
  isAdmissionEval,
  isReleaseEval,
  runAdmissionEval,
  runReleaseEval,
} from "../../scripts/lib/upstash-admission";

const ORIGIN = "https://collinsnyagaka.com";

function postAssistant(
  body: unknown,
  {
    origin = ORIGIN,
    fetchSite = "same-origin",
    contentType = "application/json",
    ip = "203.0.113.42",
    contentLength,
  }: {
    origin?: string | null;
    fetchSite?: string | null;
    contentType?: string;
    ip?: string;
    contentLength?: string;
  } = {},
) {
  const headers: Record<string, string> = {
    "content-type": contentType,
    "x-forwarded-for": ip,
  };
  if (origin) headers.origin = origin;
  if (fetchSite) headers["sec-fetch-site"] = fetchSite;
  if (contentLength) headers["content-length"] = contentLength;
  return POST(
    new Request(`${ORIGIN}/api/assistant`, {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function mockHealthyRedisAndOpenRouter(
  openRouterReply: () => Response | Promise<Response>,
  opts: { kill?: string | null; dailySpentOverride?: number } = {},
) {
  // Redis keys the assistant touches; the admission/release EVALs run
  // through the JS mirror of the Lua scripts (scripts/lib/upstash-admission.ts).
  const data = new Map<string, string>();
  if (opts.kill) data.set("kill:assistant:generation", opts.kill);
  const today = new Date().toISOString().slice(0, 10);
  for (const env of ["development", "test", "preview", "production"]) {
    if (opts.dailySpentOverride)
      data.set(
        `budget:assistant:${env}:${today}`,
        String(opts.dailySpentOverride),
      );
  }
  const mini = {
    get: (k: string) => data.get(k) ?? null,
    incrBy: (k: string, by: number) => {
      const n = Number(data.get(k) ?? 0) + by;
      data.set(k, String(n));
      return n;
    },
    expire: () => {},
    del: (k: string) => void data.delete(k),
  };
  const getConc = () =>
    [...data.entries()]
      .filter(([k]) => k.startsWith("conc:"))
      .reduce((sum, [, v]) => sum + Number(v), 0);
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("redis.example")) {
      const cmds = JSON.parse(String(init?.body)) as string[][];
      return Response.json(
        cmds.map((c) => {
          if (isAdmissionEval(c)) return { result: runAdmissionEval(mini, c) };
          if (isReleaseEval(c)) return { result: runReleaseEval(mini, c) };
          const [cmd, key] = c;
          if (cmd === "SET" && key.startsWith("salt:")) return { result: "OK" };
          if (cmd === "GET" && key.startsWith("salt:"))
            return { result: "daily-salt" };
          if (cmd === "GET") return { result: data.get(key) ?? null };
          if (cmd === "INCR") return { result: 1 };
          if (cmd === "SET") return { result: "OK" };
          return { result: 1 };
        }),
      );
    }
    if (url.startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      return openRouterReply();
    }
    throw new Error(`Unexpected outbound fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, getConc };
}

beforeEach(() => {
  resetLocalRateLimits();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("assistant config & SSRF URL guard", () => {
  it("distinguishes disabled, retrieval_only, and generation_enabled", () => {
    expect(assistantRuntimeMode({})).toBe("disabled");
    expect(assistantRuntimeMode({ ASSISTANT_MODE: "off" })).toBe("disabled");
    expect(assistantRuntimeMode({ ASSISTANT_MODE: "retrieval" })).toBe(
      "retrieval_only",
    );
    // Live mode without Redis or LLM keys degrades safely to retrieval_only.
    expect(assistantRuntimeMode({ ASSISTANT_MODE: "live" })).toBe(
      "retrieval_only",
    );
    expect(
      assistantRuntimeMode({
        ASSISTANT_MODE: "live",
        ASSISTANT_LLM_BASE_URL: "https://openrouter.ai/api/v1/chat/completions",
        ASSISTANT_LLM_MODEL: "google/gemini-2.5-flash",
        ASSISTANT_LLM_API_KEY: "test-key",
        UPSTASH_REDIS_REST_URL: "https://redis.example",
        UPSTASH_REDIS_REST_TOKEN: "redis-tok",
      }),
    ).toBe("generation_enabled");
  });

  it("blocks SSRF hosts, credentials, query strings, non-HTTPS, and Vercel loopback", () => {
    expect(
      validateProviderUrl("https://openrouter.ai/api/v1/chat/completions")
        ?.hostname,
    ).toBe("openrouter.ai");
    expect(
      validateProviderUrl("http://openrouter.ai/api/v1/chat/completions"),
    ).toBeNull();
    expect(
      validateProviderUrl("https://169.254.169.254/latest/meta-data"),
    ).toBeNull();
    expect(
      validateProviderUrl(
        "https://user:pass@openrouter.ai/api/v1/chat/completions",
      ),
    ).toBeNull();
    expect(
      validateProviderUrl("https://openrouter.ai:8443/api/v1/chat/completions"),
    ).toBeNull();
    expect(
      validateProviderUrl(
        "https://openrouter.ai/api/v1/chat/completions?next=evil",
      ),
    ).toBeNull();
    // Loopback allowed ONLY outside Vercel when explicitly flagged.
    expect(
      validateProviderUrl("http://127.0.0.1:4100/v1/chat/completions", {
        ASSISTANT_ALLOW_LOOPBACK_TEST_PROVIDER: "1",
      })?.hostname,
    ).toBe("127.0.0.1");
    expect(
      validateProviderUrl("http://127.0.0.1:4100/v1/chat/completions", {
        VERCEL: "1",
        ASSISTANT_ALLOW_LOOPBACK_TEST_PROVIDER: "1",
      }),
    ).toBeNull();
  });
});

describe("POST /api/assistant security & contract checks", () => {
  it("returns 503 when disabled", async () => {
    const res = await postAssistant({ question: "Tell me about LegalAI" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "disabled" });
  });

  it("returns 400 at the deadline when a client stalls mid-body", async () => {
    vi.stubEnv("ASSISTANT_MODE", "retrieval");
    vi.useFakeTimers();
    try {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          // Valid JSON, then the stream never closes.
          controller.enqueue(new TextEncoder().encode('{"question":"x"}'));
        },
      });
      const pending = POST(
        new Request(`${ORIGIN}/api/assistant`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.77",
            origin: ORIGIN,
            "sec-fetch-site": "same-origin",
          },
          body: stream,
          duplex: "half",
        } as RequestInit),
      );
      // Earlier async checks run before the body timer is armed, so step
      // the clock rather than jumping it once.
      let settled = false;
      void pending.then(() => (settled = true));
      for (let i = 0; i < 20 && !settled; i++) {
        await vi.advanceTimersByTimeAsync(500);
      }
      const res = await pending;
      expect(res.status).toBe(400);
    } finally {
      vi.useRealTimers();
    }
  });

  it("enforces same-origin, Fetch Metadata, media type, size limits, and strict schema", async () => {
    vi.stubEnv("ASSISTANT_MODE", "retrieval");

    // 403 origin / Fetch Metadata
    expect(
      (
        await postAssistant(
          { question: "Tell me about LegalAI" },
          { origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await postAssistant(
          { question: "Tell me about LegalAI" },
          { origin: null },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await postAssistant(
          { question: "Tell me about LegalAI" },
          { fetchSite: "cross-site" },
        )
      ).status,
    ).toBe(403);

    // 415 media type (rejects application/json-patch+json too)
    expect(
      (
        await postAssistant(
          { question: "Tell me about LegalAI" },
          { contentType: "text/plain" },
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await postAssistant(
          { question: "Tell me about LegalAI" },
          { contentType: "application/json-patch+json" },
        )
      ).status,
    ).toBe(415);

    // 413 declared Content-Length and streamed > 8 KB body without Content-Length
    expect(
      (
        await postAssistant(
          { question: "Tell me about LegalAI" },
          { contentLength: "9000" },
        )
      ).status,
    ).toBe(413);
    const hugeStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(9000)));
        controller.close();
      },
    });
    const streamRes = await POST(
      new Request(`${ORIGIN}/api/assistant`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: ORIGIN,
          "x-forwarded-for": "203.0.113.99",
        },
        body: hugeStream,
        duplex: "half",
      } as RequestInit),
    );
    expect(streamRes.status).toBe(413);

    // 400 validation errors
    expect((await postAssistant("{not json")).status).toBe(400);
    const badField = await postAssistant({
      question: "Tell me about LegalAI",
      admin: true,
    });
    expect(badField.status).toBe(400);
    expect((await badField.json()).fields.admin).toBe("is not allowed");
    expect((await postAssistant({ question: "a" })).status).toBe(400);
    expect((await postAssistant({ question: "x".repeat(501) })).status).toBe(
      400,
    );
  });

  it("enforces 12/10m burst rate limit with Retry-After and zero CORS/cookie headers", async () => {
    vi.stubEnv("ASSISTANT_MODE", "retrieval");
    for (let i = 0; i < 12; i++) {
      const ok = await postAssistant(
        { question: "What is LegalAI?" },
        { ip: "198.51.100.77" },
      );
      expect(ok.status).toBe(200);
      expect(ok.headers.get("access-control-allow-origin")).toBeNull();
      expect(ok.headers.get("set-cookie")).toBeNull();
      expect(ok.headers.get("cache-control")).toBe("no-store");
    }
    const limited = await postAssistant(
      { question: "What is LegalAI?" },
      { ip: "198.51.100.77" },
    );
    expect(limited.status).toBe(429);
    const body = await limited.json();
    expect(limited.headers.get("retry-after")).toBe(
      String(body.retryAfterSeconds),
    );
  });

  it("answers off-topic & boundary queries at $0 LLM cost even when generation is enabled", async () => {
    vi.stubEnv("ASSISTANT_MODE", "live");
    vi.stubEnv(
      "ASSISTANT_LLM_BASE_URL",
      "https://openrouter.ai/api/v1/chat/completions",
    );
    vi.stubEnv("ASSISTANT_LLM_MODEL", "google/gemini-2.5-flash");
    vi.stubEnv("ASSISTANT_LLM_API_KEY", "secret-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-tok");

    const { fetchMock } = mockHealthyRedisAndOpenRouter(() =>
      Response.json({}),
    );

    const offTopic = await postAssistant({
      question: "What is the weather in Nairobi?",
    });
    expect(offTopic.status).toBe(200);
    const offBody = await offTopic.json();
    expect(offBody.mode).toBe("retrieval_only");
    expect(offBody.verdict).toBe("out_of_scope");

    const phone = await postAssistant({
      question: "What is Collins's phone number?",
    });
    expect(phone.status).toBe(200);
    const phoneBody = await phone.json();
    expect(phoneBody.mode).toBe("retrieval_only");
    expect(phoneBody.reason).toBe("boundary_policy");

    // Zero OpenRouter calls should have happened.
    expect(
      fetchMock.mock.calls.some(([u]) => String(u).includes("openrouter.ai")),
    ).toBe(false);
  });

  it("calls OpenRouter with redirect:error, data_collection:deny, reasoning:none, verifies output, and logs zero PII", async () => {
    vi.stubEnv("ASSISTANT_MODE", "live");
    vi.stubEnv(
      "ASSISTANT_LLM_BASE_URL",
      "https://openrouter.ai/api/v1/chat/completions",
    );
    vi.stubEnv("ASSISTANT_LLM_MODEL", "google/gemini-2.5-flash");
    vi.stubEnv("ASSISTANT_LLM_API_KEY", "secret-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-tok");

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { fetchMock, getConc } = mockHealthyRedisAndOpenRouter(() =>
      Response.json({
        model: "google/gemini-2.5-flash",
        usage: { prompt_tokens: 1800, completion_tokens: 80 },
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                inPortfolio: true,
                blocks: [
                  {
                    text: "LegalAI Kenya achieved 0.960 hit@10 across two held-out slices of 300 litigation questions.",
                    chunkIds: ["case:legalai-kenya:evaluation"],
                  },
                ],
                factIds: ["fact:legalai-kenya:metric:1"],
                followUps: ["What are its main limits?"],
              }),
            },
          },
        ],
      }),
    );

    const uniqueQuestion =
      "UNIQUE_SENTINEL_QUESTION What hit@10 did LegalAI Kenya get?";
    const res = await postAssistant(
      { question: uniqueQuestion },
      { ip: "203.0.113.199" },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe("generated");
    expect(data.verdict).toBe("answered");
    expect(data.blocks[0].evidenceIndices).toEqual([1]);
    expect(data.facts.some((f: { value: string }) => f.value === "0.960")).toBe(
      true,
    );
    expect(getConc()).toBe(0);

    // Check OpenRouter request parameters & redirect policy.
    const orCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes("openrouter.ai"),
    )!;
    expect(orCall[1]?.redirect).toBe("error");
    const sentBody = JSON.parse(String(orCall[1]?.body));
    expect(sentBody.reasoning).toEqual({ effort: "none" });
    expect(sentBody.provider).toEqual({ data_collection: "deny" });
    expect(sentBody.response_format.type).toBe("json_schema");

    // Telemetry must NOT contain question, answer, or IP.
    const logged = infoSpy.mock.calls.flat().join("\n");
    expect(logged).toContain("assistant_turn");
    expect(logged).not.toContain("UNIQUE_SENTINEL_QUESTION");
    expect(logged).not.toContain("203.0.113.199");
    expect(logged).not.toContain("litigation questions");
  });

  it("degrades to retrieval_only on Redis kill switch, budget exhaustion, and oversized upstream response", async () => {
    vi.stubEnv("ASSISTANT_MODE", "live");
    vi.stubEnv(
      "ASSISTANT_LLM_BASE_URL",
      "https://openrouter.ai/api/v1/chat/completions",
    );
    vi.stubEnv("ASSISTANT_LLM_MODEL", "google/gemini-2.5-flash");
    vi.stubEnv("ASSISTANT_LLM_API_KEY", "secret-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-tok");
    vi.stubEnv("ASSISTANT_DAILY_BUDGET_MICRO_USD", "10000");
    vi.stubEnv("ASSISTANT_MAX_ATTEMPT_MICRO_USD", "5000");

    // 1) Kill switch active
    mockHealthyRedisAndOpenRouter(() => Response.json({}), { kill: "1" });
    const killedRes = await (
      await postAssistant({ question: "Tell me about fraud detection." })
    ).json();
    expect(killedRes.mode).toBe("retrieval_only");
    expect(killedRes.reason).toBe("provider_unavailable");

    // 2) Budget reached
    mockHealthyRedisAndOpenRouter(() => Response.json({}), {
      dailySpentOverride: 10000,
    });
    const budgetRes = await (
      await postAssistant({ question: "Tell me about fraud detection." })
    ).json();
    expect(budgetRes.mode).toBe("retrieval_only");
    expect(budgetRes.reason).toBe("budget_reached");

    // 3) Upstream response exceeds 64 KB cap
    const { getConc } = mockHealthyRedisAndOpenRouter(
      () => new Response(" ".repeat(70 * 1024), { status: 200 }),
    );
    const largeRes = await (
      await postAssistant({ question: "Tell me about fraud detection." })
    ).json();
    expect(largeRes.mode).toBe("retrieval_only");
    expect(largeRes.reason).toBe("provider_unavailable");
    expect(getConc()).toBe(0);
  });
});
