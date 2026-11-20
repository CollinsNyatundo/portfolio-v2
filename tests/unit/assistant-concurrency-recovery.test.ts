import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reserveAssistantBudget } from "@/lib/rate-limit";
import {
  isAdmissionEval,
  isReleaseEval,
  runAdmissionEval,
  runReleaseEval,
} from "../../scripts/lib/upstash-admission";

// Devin review on PR #36: slots leaked during a Redis outage must expire.
// Rejected attempts and releases must not keep renewing the counter's TTL.

type Entry = { value: string; expiresAt: number | null };

function fakeRedis() {
  let clock = 0;
  let outage = false;
  const store = new Map<string, Entry>();
  const live = (key: string) => {
    const e = store.get(key);
    if (e && e.expiresAt !== null && e.expiresAt <= clock) {
      store.delete(key);
      return undefined;
    }
    return e;
  };
  const incrBy = (key: string, by: number) => {
    const e = live(key);
    const next = Number(e?.value ?? 0) + by;
    store.set(key, { value: String(next), expiresAt: e?.expiresAt ?? null });
    return next;
  };
  const mini = {
    get: (key: string) => live(key)?.value ?? null,
    incrBy,
    expire: (key: string, seconds: number, nx = false) => {
      const e = live(key);
      if (!e || (nx && e.expiresAt !== null)) return;
      e.expiresAt = clock + seconds * 1000;
    },
    del: (key: string) => void store.delete(key),
  };
  const commands: string[][] = [];
  const run = (cmd: string[]): unknown => {
    commands.push(cmd);
    if (isAdmissionEval(cmd)) return runAdmissionEval(mini, cmd);
    if (isReleaseEval(cmd)) return runReleaseEval(mini, cmd);
    const [op, key, ...args] = cmd;
    switch (op) {
      case "GET":
        return live(key)?.value ?? null;
      case "INCR":
        return incrBy(key, 1);
      case "DECR":
        return incrBy(key, -1);
      case "INCRBY":
        return incrBy(key, Number(args[0]));
      case "EXPIRE": {
        const e = live(key);
        if (!e) return 0;
        if (args[1] === "NX" && e.expiresAt !== null) return 0;
        e.expiresAt = clock + Number(args[0]) * 1000;
        return 1;
      }
      case "DEL":
        return store.delete(key) ? 1 : 0;
      case "SET": {
        const ex = args.indexOf("EX");
        store.set(key, {
          value: args[0],
          expiresAt: ex >= 0 ? clock + Number(args[ex + 1]) * 1000 : null,
        });
        return "OK";
      }
      default:
        throw new Error(`unsupported ${op}`);
    }
  };
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    if (outage) return new Response("unavailable", { status: 503 });
    const cmds = JSON.parse(String(init.body)) as string[][];
    return Response.json(cmds.map((c) => ({ result: run(c) })));
  });
  return {
    fetchMock,
    commands,
    advance: (ms: number) => (clock += ms),
    setOutage: (v: boolean) => (outage = v),
    peek: (key: string) => {
      const e = live(key);
      return e
        ? {
            value: e.value,
            ttlMs: e.expiresAt === null ? null : e.expiresAt - clock,
          }
        : null;
    },
    seed: (key: string, value: string, ttlMs: number) =>
      store.set(key, { value, expiresAt: clock + ttlMs }),
  };
}

const reserve = () =>
  reserveAssistantBudget({
    envName: "test",
    maxAttemptMicroUsd: 5_000,
    dailyCapMicroUsd: 10_000_000,
    maxConcurrent: 5,
  });

beforeEach(() => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-tok");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("assistant concurrency slots after a Redis outage", () => {
  it("recovers once leaked slots expire, even under steady rejected traffic", async () => {
    const redis = fakeRedis();
    vi.stubGlobal("fetch", redis.fetchMock);

    const held = [];
    for (let i = 0; i < 5; i++) {
      const r = await reserve();
      expect(r.allowed).toBe(true);
      held.push(r);
    }

    // Redis drops out: every release is lost, leaving 5 phantom slots.
    redis.setOutage(true);
    for (const r of held) if (r.allowed) await r.releaseConcurrency();
    redis.setOutage(false);

    // One attempt every 20 s. Before the fix each rejection renewed the
    // 30 s TTL, so the phantom slots never expired.
    const outcomes: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      redis.advance(20_000);
      const r = await reserve();
      outcomes.push(r.allowed);
      if (r.allowed) await r.releaseConcurrency();
    }
    expect(outcomes[0]).toBe(false); // still inside the first 30 s
    expect(outcomes).toContain(true);
  });

  it("admits in one atomic Redis call: kill switch, cap, budget and slot together", async () => {
    const redis = fakeRedis();
    vi.stubGlobal("fetch", redis.fetchMock);
    redis.commands.length = 0;
    const r = await reserve();
    expect(r.allowed).toBe(true);
    expect(redis.fetchMock).toHaveBeenCalledTimes(1);
    expect(redis.commands).toHaveLength(1);
    expect(isAdmissionEval(redis.commands[0])).toBe(true);
  });

  it("never admits a request whose slot is lost to a counter expiring mid-admission", async () => {
    // Devin review on PR #36: a zero counter about to expire.
    const redis = fakeRedis();
    vi.stubGlobal("fetch", redis.fetchMock);
    redis.seed("conc:assistant:test", "0", 100);
    const r = await reserve();
    expect(r.allowed).toBe(true);
    redis.advance(200); // the old counter's expiry time passes
    expect(redis.peek("conc:assistant:test")).toEqual({
      value: "1",
      ttlMs: 29_800,
    });
  });

  it("deletes the counter when the last slot is released", async () => {
    const redis = fakeRedis();
    vi.stubGlobal("fetch", redis.fetchMock);
    const r = await reserve();
    if (r.allowed) await r.releaseConcurrency();
    expect(redis.peek("conc:assistant:test")).toBeNull();
  });

  it("does not burn budget on a rejected attempt", async () => {
    const redis = fakeRedis();
    vi.stubGlobal("fetch", redis.fetchMock);
    for (let i = 0; i < 5; i++) await reserve();
    const spentBefore = redis.peek(
      `budget:assistant:test:${new Date().toISOString().slice(0, 10)}`,
    )?.value;
    expect((await reserve()).allowed).toBe(false);
    expect(
      redis.peek(
        `budget:assistant:test:${new Date().toISOString().slice(0, 10)}`,
      )?.value,
    ).toBe(spentBefore);
  });

  it("still enforces the cap while slots are genuinely held", async () => {
    const redis = fakeRedis();
    vi.stubGlobal("fetch", redis.fetchMock);
    for (let i = 0; i < 5; i++) expect((await reserve()).allowed).toBe(true);
    redis.advance(5_000);
    const sixth = await reserve();
    expect(sixth).toMatchObject({
      allowed: false,
      reason: "concurrency_limit",
    });
  });
});
