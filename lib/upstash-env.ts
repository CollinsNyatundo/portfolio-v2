/**
 * Upstash Redis REST credentials. Two naming schemes are accepted, each only
 * as a complete pair:
 * - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (set by hand), which
 *   win when both are present;
 * - `KV_REST_API_URL` + `KV_REST_API_TOKEN`, which the Vercel Marketplace
 *   Upstash integration provisions.
 * The read-only token is never used: rate limits and the assistant budget
 * write to Redis. Server only.
 */
export function upstashCredentials(
  env: Record<string, string | undefined> = process.env,
): { url: string; token: string } | null {
  const pairs: [string | undefined, string | undefined][] = [
    [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN],
    [env.KV_REST_API_URL, env.KV_REST_API_TOKEN],
  ];
  for (const [rawUrl, rawToken] of pairs) {
    const url = rawUrl?.trim();
    const token = rawToken?.trim();
    if (url && token) return { url, token };
  }
  return null;
}
