/**
 * Fixed-window rate limit and assistant spend/kill-switch accounting (02 §5,
 * D-33). Uses Upstash Redis REST when credentials are set
 * (UPSTASH_REDIS_REST_* or the Marketplace KV_REST_API_*; lib/upstash-env.ts).
 *
 * - `rateLimited`: falls back to an in-process window when Redis is unavailable
 *   or returns a malformed/errored command result (never fails open).
 * - `reserveAssistantBudget` / `isAssistantGenerationKilled`: fail closed when
 *   Redis is unavailable or errors, so paid LLM calls never run uncounted.
 */
import { upstashCredentials } from "./upstash-env.ts";

type LocalEntry = { count: number; expiresAt: number };

const local = new Map<string, LocalEntry>();
// Used only when Redis is unavailable; never leaves the process.
const processSalt = crypto.randomUUID();

/** SHA-256 of salt + IP: Redis never holds a raw address (02 §6, 07 item 55). */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${ip}`),
  );
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

type UpstashCommandReply = {
  result?: unknown;
  error?: unknown;
};

/**
 * Execute an Upstash Redis `/multi-exec` pipeline. Validates the full array
 * response and rejects if ANY command inside the transaction carries an
 * `error` or omits `result` (07 item 44, S1 fix).
 */
export async function upstashPipeline(
  commands: string[][],
): Promise<unknown[] | null> {
  const creds = upstashCredentials();
  if (!creds) return null;
  const { url, token } = creds;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/multi-exec`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as unknown;
    if (!Array.isArray(body) || body.length !== commands.length) return null;
    const results: unknown[] = [];
    for (const item of body) {
      if (typeof item !== "object" || item === null) return null;
      const entry = item as UpstashCommandReply;
      if ("error" in entry && entry.error != null) return null;
      if (!("result" in entry)) return null;
      results.push(entry.result);
    }
    return results;
  } catch {
    return null;
  }
}

/** A random salt per UTC day, shared by all instances through Redis. */
async function dailySalt(now: number): Promise<string | null> {
  const key = `salt:${new Date(now).toISOString().slice(0, 10)}`;
  const out = await upstashPipeline([
    ["SET", key, crypto.randomUUID(), "NX", "EX", "90000"],
    ["GET", key],
  ]);
  if (!out || typeof out[1] !== "string" || out[1].length === 0) return null;
  return out[1];
}

function isPositiveSafeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

/** Seconds to wait when over the limit, else 0. */
export async function rateLimited(
  name: string,
  ip: string,
  limit: number,
  window: number,
  now = Date.now(),
): Promise<number> {
  const seconds = now / 1000;
  const bucket = Math.floor(seconds / window);
  let count: number | null = null;
  const salt = await dailySalt(now);
  if (salt) {
    const key = `rl:${name}:${await hashIp(ip, salt)}:${bucket}`;
    const out = await upstashPipeline([
      ["INCR", key],
      ["EXPIRE", key, String(window), "NX"],
    ]);
    if (out && isPositiveSafeInt(out[0])) {
      count = out[0];
    }
  }
  if (count === null) {
    const key = `rl:${name}:${await hashIp(ip, processSalt)}:${bucket}`;
    const prev = local.get(key);
    const activeCount = prev && seconds < prev.expiresAt ? prev.count : 0;
    count = activeCount + 1;
    const expiresAt = (bucket + 1) * window;
    local.set(key, { count, expiresAt });
    // Evict using each entry's own expiration so short windows never wipe
    // longer (e.g. daily) local counters (S2 fix).
    for (const [k, v] of local) {
      if (seconds >= v.expiresAt) local.delete(k);
    }
  }
  return count > limit ? Math.floor(window - (seconds % window)) + 1 : 0;
}

/** Combined burst (12 / 10 min) and UTC-day (30 / day) per-IP limit for /api/assistant. */
export async function assistantIpRateLimited(
  ip: string,
  envName: string,
  now = Date.now(),
): Promise<number> {
  const burstWait = await rateLimited(
    `assistant-burst:${envName}`,
    ip,
    12,
    600,
    now,
  );
  if (burstWait > 0) return burstWait;
  return rateLimited(`assistant-day:${envName}`, ip, 30, 86400, now);
}

export type KillSwitchCheck =
  | { killed: false }
  | { killed: true; reason: "kill_switch" | "redis_unavailable" };

/**
 * Fail-closed check for `kill:assistant:generation`. Any Redis outage or
 * error degrades billable generation to `retrieval_only`.
 */
export async function isAssistantGenerationKilled(): Promise<KillSwitchCheck> {
  const out = await upstashPipeline([["GET", "kill:assistant:generation"]]);
  if (!out) return { killed: true, reason: "redis_unavailable" };
  if (out[0] === "1") return { killed: true, reason: "kill_switch" };
  return { killed: false };
}

export async function releaseAssistantConcurrency(
  envName: string,
): Promise<void> {
  const concKey = `conc:assistant:${envName}`;
  // Atomic: decrement, and delete the counter at zero or below so a stale
  // zero can't linger. No TTL renewal: only admission extends it.
  await upstashPipeline([["EVAL", ASSISTANT_RELEASE_SCRIPT, "1", concKey]]);
}

export type AssistantBudgetReservation =
  | {
      allowed: true;
      spentMicroUsd: number;
      releaseConcurrency: () => Promise<void>;
    }
  | {
      allowed: false;
      reason:
        | "kill_switch"
        | "accounting_unavailable"
        | "concurrency_limit"
        | "budget_reached";
    };

const ASSISTANT_KILL_KEY = "kill:assistant:generation";
const CONCURRENCY_TTL_SECONDS = 30;
const BUDGET_TTL_SECONDS = 172_800;

/**
 * Admission script (Lua, runs atomically in Redis). KEYS: kill switch,
 * concurrency counter, daily budget. ARGV: max concurrent, attempt
 * micro-USD, daily cap micro-USD, counter TTL, budget TTL. Returns
 * {code, value}: 0 admitted (value = spent today), 1 kill switch,
 * 2 concurrency limit, 3 budget reached. A rejected attempt writes nothing.
 * Mirrored for test doubles in scripts/lib/upstash-admission.ts.
 */
export const ASSISTANT_ADMIT_SCRIPT = `-- assistant-admit v1
if redis.call('GET', KEYS[1]) == '1' then return {1, 0} end
local conc = tonumber(redis.call('GET', KEYS[2]) or '0')
if conc < 0 then redis.call('DEL', KEYS[2]); conc = 0 end
if conc >= tonumber(ARGV[1]) then return {2, conc} end
local spent = tonumber(redis.call('GET', KEYS[3]) or '0')
if spent + tonumber(ARGV[2]) > tonumber(ARGV[3]) then return {3, spent} end
spent = redis.call('INCRBY', KEYS[3], ARGV[2])
if redis.call('TTL', KEYS[3]) < 0 then redis.call('EXPIRE', KEYS[3], ARGV[5]) end
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], ARGV[4])
return {0, spent}`;

/** Release script: decrement the slot counter, deleting it at zero or below. */
export const ASSISTANT_RELEASE_SCRIPT = `-- assistant-release v1
local n = redis.call('DECR', KEYS[1])
if n <= 0 then redis.call('DEL', KEYS[1]) end
return n`;

/**
 * Atomically check the instant kill switch, acquire a short-TTL concurrency
 * slot, and reserve the worst-case attempt micro-USD against the UTC daily cap.
 * Always fails closed when Redis is unconfigured or errors.
 */
export async function reserveAssistantBudget({
  envName,
  maxAttemptMicroUsd,
  dailyCapMicroUsd,
  maxConcurrent = 5,
  now = Date.now(),
}: {
  envName: string;
  maxAttemptMicroUsd: number;
  dailyCapMicroUsd: number;
  maxConcurrent?: number;
  now?: number;
}): Promise<AssistantBudgetReservation> {
  if (
    !Number.isSafeInteger(maxAttemptMicroUsd) ||
    maxAttemptMicroUsd <= 0 ||
    !Number.isSafeInteger(dailyCapMicroUsd) ||
    dailyCapMicroUsd < maxAttemptMicroUsd ||
    !Number.isSafeInteger(maxConcurrent) ||
    maxConcurrent < 1
  ) {
    return { allowed: false, reason: "budget_reached" };
  }

  const concKey = `conc:assistant:${envName}`;
  const day = new Date(now).toISOString().slice(0, 10);
  const budgetKey = `budget:assistant:${envName}:${day}`;

  // One atomic script: kill switch, concurrency cap, daily budget, then the
  // budget reservation and the slot with its TTL. Nothing can expire or
  // interleave between the checks and the writes (Devin review, PR #36).
  const out = await upstashPipeline([
    [
      "EVAL",
      ASSISTANT_ADMIT_SCRIPT,
      "3",
      ASSISTANT_KILL_KEY,
      concKey,
      budgetKey,
      String(maxConcurrent),
      String(maxAttemptMicroUsd),
      String(dailyCapMicroUsd),
      String(CONCURRENCY_TTL_SECONDS),
      String(BUDGET_TTL_SECONDS),
    ],
  ]);
  const reply = out?.[0];
  if (
    !Array.isArray(reply) ||
    reply.length !== 2 ||
    !reply.every((v) => Number.isSafeInteger(v))
  ) {
    return { allowed: false, reason: "accounting_unavailable" };
  }
  const [code, value] = reply as [number, number];
  if (code === 1) return { allowed: false, reason: "kill_switch" };
  if (code === 2) return { allowed: false, reason: "concurrency_limit" };
  if (code === 3) return { allowed: false, reason: "budget_reached" };
  if (code !== 0 || !isPositiveSafeInt(value)) {
    return { allowed: false, reason: "accounting_unavailable" };
  }
  const spent = value;

  let released = false;
  return {
    allowed: true,
    spentMicroUsd: spent,
    releaseConcurrency: async () => {
      if (released) return;
      released = true;
      await releaseAssistantConcurrency(envName);
    },
  };
}

/** For tests. */
export function resetLocalRateLimits(): void {
  local.clear();
}
