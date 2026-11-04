/**
 * Fixed-window rate limit (02 §5). Uses Upstash Redis REST when
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set; otherwise an
 * in-process window, which only limits one warm instance. INCR + EXPIRE run
 * in one MULTI so two requests can't both see the first slot (07 item 44).
 */

const local = new Map<string, { count: number; at: number }>();
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

async function upstash(commands: string[][]): Promise<unknown[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
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
    const body = (await res.json()) as { result: unknown }[];
    return body.map((r) => r.result);
  } catch {
    return null; // fall back to the in-process window, never to no limit
  }
}

/** A random salt per UTC day, shared by all instances through Redis. */
async function dailySalt(now: number): Promise<string | null> {
  const key = `salt:${new Date(now).toISOString().slice(0, 10)}`;
  const out = await upstash([
    ["SET", key, crypto.randomUUID(), "NX", "EX", "90000"],
    ["GET", key],
  ]);
  return out ? String(out[1]) : null;
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
    const out = await upstash([
      ["INCR", key],
      ["EXPIRE", key, String(window), "NX"],
    ]);
    count = out ? Number(out[0]) : null;
  }
  if (count === null) {
    const key = `rl:${name}:${await hashIp(ip, processSalt)}:${bucket}`;
    const prev = local.get(key)?.count ?? 0;
    count = prev + 1;
    local.set(key, { count, at: seconds });
    for (const [k, v] of local)
      if (seconds - v.at > window * 2) local.delete(k);
  }
  return count > limit ? Math.floor(window - (seconds % window)) + 1 : 0;
}

/** For tests. */
export function resetLocalRateLimits(): void {
  local.clear();
}
