/**
 * Fixed-window rate limit (02 §5). Uses Upstash Redis REST when
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set; otherwise an
 * in-process window, which only limits one warm instance. INCR + EXPIRE run
 * in one MULTI so two requests can't both see the first slot (07 item 44).
 */

const local = new Map<string, { count: number; at: number }>();

async function upstashIncr(
  key: string,
  window: number,
): Promise<number | null> {
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
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(window), "NX"],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result: number }[];
    return Number(body[0].result);
  } catch {
    return null; // fall back to the in-process window, never to no limit
  }
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
  const key = `rl:${name}:${ip}:${Math.floor(seconds / window)}`;
  let count = await upstashIncr(key, window);
  if (count === null) {
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
