/**
 * JavaScript mirrors of ASSISTANT_ADMIT_SCRIPT and ASSISTANT_RELEASE_SCRIPT
 * (lib/rate-limit.ts) for Upstash test doubles. Keep them in step with the
 * Lua: change both together, and re-run the Lua against a real Redis 7
 * (`scripts/check-admission-lua.ts`) whenever the script changes.
 */
export type MiniRedis = {
  get(key: string): string | null;
  incrBy(key: string, by: number): number;
  /** nx: set only when the key has no TTL. */
  expire(key: string, seconds: number, nx?: boolean): void;
  del(key: string): void;
};

/** EVAL argv layout: script, numkeys, kill, conc, budget, max, attempt, cap, concTtl, budgetTtl. */
export function runAdmissionEval(redis: MiniRedis, cmd: string[]): number[] {
  const [, , numKeys, killKey, concKey, budgetKey, ...argv] = cmd;
  if (numKeys !== "3") throw new Error("admission EVAL expects 3 keys");
  const [maxConcurrent, attempt, cap, concTtl, budgetTtl] = argv.map(Number);

  if (redis.get(killKey) === "1") return [1, 0];
  let conc = Number(redis.get(concKey) ?? 0);
  if (conc < 0) {
    redis.del(concKey);
    conc = 0;
  }
  if (conc >= maxConcurrent) return [2, conc];
  const spent = Number(redis.get(budgetKey) ?? 0);
  if (spent + attempt > cap) return [3, spent];

  const newSpent = redis.incrBy(budgetKey, attempt);
  redis.expire(budgetKey, budgetTtl, true);
  redis.incrBy(concKey, 1);
  redis.expire(concKey, concTtl);
  return [0, newSpent];
}

/** True when a pipeline command is the assistant admission EVAL. */
export function isAdmissionEval(cmd: string[]): boolean {
  return cmd[0] === "EVAL" && String(cmd[1]).includes("assistant-admit");
}

/** Mirror of ASSISTANT_RELEASE_SCRIPT. */
export function runReleaseEval(redis: MiniRedis, cmd: string[]): number {
  const key = cmd[3];
  const n = redis.incrBy(key, -1);
  if (n <= 0) redis.del(key);
  return n;
}

export function isReleaseEval(cmd: string[]): boolean {
  return cmd[0] === "EVAL" && String(cmd[1]).includes("assistant-release");
}
