import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assistantIpRateLimited,
  isAssistantGenerationKilled,
  rateLimited,
  reserveAssistantBudget,
  resetLocalRateLimits,
} from "@/lib/rate-limit";
import {
  isAdmissionEval,
  isReleaseEval,
  runAdmissionEval,
  runReleaseEval,
} from "../support/upstash-admission";

/** Upstash double without TTLs, running the admission and release mirrors. */
function memoryRedis(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
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
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const cmds = JSON.parse(String(init.body)) as string[][];
    return Response.json(
      cmds.map((c) => {
        if (isAdmissionEval(c)) return { result: runAdmissionEval(mini, c) };
        if (isReleaseEval(c)) return { result: runReleaseEval(mini, c) };
        throw new Error(`unexpected command ${c[0]}`);
      }),
    );
  });
  return { data, fetchMock };
}

beforeEach(() => {
  resetLocalRateLimits();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("rateLimited security fixes (S1 & S2)", () => {
  it("S1: never fails open when Upstash HTTP 200 multi-exec returns per-command errors", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = String(init.body);
        if (body.includes('"SET"')) {
          return Response.json([{ result: "OK" }, { result: "daily-salt" }]);
        }
        // Upstash can return HTTP 200 with per-command error objects.
        return Response.json([
          { error: "NOPERM this user has no permissions to run INCR" },
          { result: 1 },
        ]);
      }),
    );

    const t = 1_700_000_000_000;
    // Limit is 1: request 1 passes (using safe local fallback), requests 2-5 MUST be denied.
    expect(await rateLimited("contact", "203.0.113.10", 1, 60, t)).toBe(0);
    for (let i = 0; i < 4; i++) {
      expect(
        await rateLimited("contact", "203.0.113.10", 1, 60, t),
      ).toBeGreaterThan(0);
    }
  });

  it("S1: rejects malformed non-integer Upstash counts without turning NaN into allow", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = String(init.body);
        if (body.includes('"SET"')) {
          return Response.json([{ result: "OK" }, { result: "daily-salt" }]);
        }
        return Response.json([{ result: "not-a-number" }, { result: 1 }]);
      }),
    );

    const t = 1_700_000_000_000;
    expect(await rateLimited("probe", "203.0.113.11", 1, 60, t)).toBe(0);
    expect(
      await rateLimited("probe", "203.0.113.11", 1, 60, t),
    ).toBeGreaterThan(0);
  });

  it("S2: short-window calls do not evict active local daily counters", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 30; i++) {
      expect(
        await rateLimited("assistant-day:test", "203.0.113.20", 30, 86400, t0),
      ).toBe(0);
    }
    // Daily limit is now exhausted.
    expect(
      await rateLimited("assistant-day:test", "203.0.113.20", 30, 86400, t0),
    ).toBeGreaterThan(0);

    // 25 minutes later, a 10-minute burst limiter runs and triggers map cleanup.
    const t25m = t0 + 25 * 60 * 1000;
    expect(
      await rateLimited("assistant-burst:test", "203.0.113.21", 12, 600, t25m),
    ).toBe(0);

    // Daily counter for original IP must still be preserved and enforce 429.
    expect(
      await rateLimited("assistant-day:test", "203.0.113.20", 30, 86400, t25m),
    ).toBeGreaterThan(0);
  });

  it("assistantIpRateLimited enforces both 12/10m burst and 30/day caps", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const dayStart = Date.UTC(2026, 10, 20, 0, 1, 0);
    for (let i = 0; i < 12; i++) {
      expect(
        await assistantIpRateLimited("198.51.100.5", "test", dayStart),
      ).toBe(0);
    }
    expect(
      await assistantIpRateLimited("198.51.100.5", "test", dayStart),
    ).toBeGreaterThan(0);

    // Advance 11 min + 11 min + 11 min across 3 buckets: hits 30/day limit (12 + 12 + 6 = 30).
    for (let i = 0; i < 12; i++) {
      expect(
        await assistantIpRateLimited(
          "198.51.100.5",
          "test",
          dayStart + 11 * 60_000,
        ),
      ).toBe(0);
    }
    for (let i = 0; i < 6; i++) {
      expect(
        await assistantIpRateLimited(
          "198.51.100.5",
          "test",
          dayStart + 22 * 60_000,
        ),
      ).toBe(0);
    }
    // 31st request on the same UTC day must be blocked even inside a fresh 10-min bucket.
    expect(
      await assistantIpRateLimited(
        "198.51.100.5",
        "test",
        dayStart + 33 * 60_000,
      ),
    ).toBeGreaterThan(0);
  });
});

describe("assistant fail-closed kill switch and spend reservation", () => {
  it("fails closed when Redis env vars are missing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(await isAssistantGenerationKilled()).toEqual({
      killed: true,
      reason: "redis_unavailable",
    });
    expect(
      await reserveAssistantBudget({
        envName: "test",
        maxAttemptMicroUsd: 5000,
        dailyCapMicroUsd: 100000,
      }),
    ).toEqual({ allowed: false, reason: "accounting_unavailable" });
  });

  it("fails closed when Redis command errors occur on budget reservation", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([{ error: "ERR oom" }])),
    );
    expect(
      await reserveAssistantBudget({
        envName: "test",
        maxAttemptMicroUsd: 5000,
        dailyCapMicroUsd: 100000,
      }),
    ).toEqual({ allowed: false, reason: "accounting_unavailable" });
  });

  it("fails closed on a malformed admission reply", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    for (const result of [null, "OK", [0], [0, "5000"], [9, 1], [0, 0]]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json([{ result }])),
      );
      expect(
        await reserveAssistantBudget({
          envName: "test",
          maxAttemptMicroUsd: 5000,
          dailyCapMicroUsd: 100000,
        }),
        JSON.stringify(result),
      ).toEqual({ allowed: false, reason: "accounting_unavailable" });
    }
  });

  it("blocks immediately when kill:assistant:generation is 1 without burning daily budget", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const redis = memoryRedis({ "kill:assistant:generation": "1" });
    vi.stubGlobal("fetch", redis.fetchMock);

    const res = await reserveAssistantBudget({
      envName: "preview",
      maxAttemptMicroUsd: 5000,
      dailyCapMicroUsd: 100000,
    });
    expect(res).toEqual({ allowed: false, reason: "kill_switch" });
    expect(redis.data.size).toBe(1); // no budget or slot written
  });

  it("enforces concurrency cap, daily budget cap, and releases concurrency once", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const redis = memoryRedis();
    vi.stubGlobal("fetch", redis.fetchMock);
    const conc = () => Number(redis.data.get("conc:assistant:prod") ?? 0);
    const spent = () =>
      [...redis.data.entries()]
        .filter(([k]) => k.startsWith("budget:assistant:prod:"))
        .reduce((sum, [, v]) => sum + Number(v), 0);
    const reserve = () =>
      reserveAssistantBudget({
        envName: "prod",
        maxAttemptMicroUsd: 5000,
        dailyCapMicroUsd: 10000,
        maxConcurrent: 2,
      });

    const ok = await reserve();
    expect(ok.allowed).toBe(true);
    if (ok.allowed) {
      expect(ok.spentMicroUsd).toBe(5000);
      // Idempotent release even if called twice.
      await ok.releaseConcurrency();
      await ok.releaseConcurrency();
      expect(conc()).toBe(0);
    }

    // Simulate saturated concurrency: rejected without spending.
    redis.data.set("conc:assistant:prod", "2");
    expect(await reserve()).toEqual({
      allowed: false,
      reason: "concurrency_limit",
    });
    expect(conc()).toBe(2);
    expect(spent()).toBe(5000);

    // Simulate budget exhaustion.
    redis.data.delete("conc:assistant:prod");
    const r2 = await reserve();
    expect(r2.allowed).toBe(true);
    if (r2.allowed) await r2.releaseConcurrency();

    expect(await reserve()).toEqual({
      allowed: false,
      reason: "budget_reached",
    });
    expect(conc()).toBe(0);
    expect(spent()).toBe(10000);
  });
});
