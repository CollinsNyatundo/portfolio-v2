import type { AssistantOperationalMode } from "./types.ts";

export const DEFAULT_PROD_DAILY_BUDGET_MICRO_USD = 500_000; // $0.50/day
export const DEFAULT_PREVIEW_DAILY_BUDGET_MICRO_USD = 100_000; // $0.10/day
export const DEFAULT_MAX_ATTEMPT_MICRO_USD = 5_000; // $0.005 worst-case attempt
export const OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";

export function deploymentNamespace(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = env.VERCEL_ENV || env.NODE_ENV || "development";
  return raw.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "development";
}

/**
 * Validate the configured LLM endpoint URL against strict HTTPS allow-list
 * rules (docs/07 item 35). Only non-Vercel local E2E test mode permits
 * `http://127.0.0.1:<port>/v1/chat/completions`.
 */
export function validateProviderUrl(
  rawUrl: string | undefined,
  env: Record<string, string | undefined> = process.env,
): URL | null {
  if (!rawUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return null;
  }

  const allowLoopback =
    !env.VERCEL && env.ASSISTANT_ALLOW_LOOPBACK_TEST_PROVIDER === "1";

  if (
    allowLoopback &&
    parsed.protocol === "http:" &&
    parsed.hostname === "127.0.0.1" &&
    parsed.pathname === "/v1/chat/completions"
  ) {
    return parsed;
  }

  if (
    parsed.protocol === "https:" &&
    parsed.hostname === "openrouter.ai" &&
    (parsed.port === "" || parsed.port === "443") &&
    parsed.pathname === "/api/v1/chat/completions"
  ) {
    return parsed;
  }
  return null;
}

export function upstashConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    env.UPSTASH_REDIS_REST_URL?.trim() && env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

/**
 * Three explicit operational states (D-33):
 * - disabled: ASSISTANT_MODE is unset or not "retrieval"/"live"
 * - retrieval_only: ASSISTANT_MODE="retrieval", or live requested without valid provider/Redis
 * - generation_enabled: ASSISTANT_MODE="live" + valid OpenRouter config + Upstash Redis
 */
export function assistantRuntimeMode(
  env: Record<string, string | undefined> = process.env,
): AssistantOperationalMode {
  const rawMode = env.ASSISTANT_MODE?.trim().toLowerCase();
  if (rawMode !== "retrieval" && rawMode !== "live") {
    return "disabled";
  }
  if (rawMode === "retrieval") {
    return "retrieval_only";
  }

  const validUrl = validateProviderUrl(env.ASSISTANT_LLM_BASE_URL, env);
  const hasModel = Boolean(env.ASSISTANT_LLM_MODEL?.trim());
  const hasKey = Boolean(env.ASSISTANT_LLM_API_KEY?.trim());
  const hasAccounting = upstashConfigured(env);

  if (validUrl && hasModel && hasKey && hasAccounting) {
    return "generation_enabled";
  }
  return "retrieval_only";
}

export type ProviderConfig = {
  url: URL;
  model: string;
  apiKey: string;
};

export function assistantProviderConfig(
  env: Record<string, string | undefined> = process.env,
  opts: { allowWithoutRedis?: boolean } = {},
): ProviderConfig | null {
  if (
    !opts.allowWithoutRedis &&
    assistantRuntimeMode(env) !== "generation_enabled"
  ) {
    return null;
  }
  const url = validateProviderUrl(env.ASSISTANT_LLM_BASE_URL, env);
  const model = env.ASSISTANT_LLM_MODEL?.trim();
  const apiKey = env.ASSISTANT_LLM_API_KEY?.trim();
  if (!url || !model || !apiKey) return null;
  return { url, model, apiKey };
}

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  maxAllowed: number,
): number {
  if (!raw) return fallback;
  const n = Number(raw.trim());
  if (!Number.isSafeInteger(n) || n <= 0 || n > maxAllowed) return fallback;
  return n;
}

export function dailyBudgetMicroUsd(
  env: Record<string, string | undefined> = process.env,
): number {
  const fallback =
    env.VERCEL_ENV === "production"
      ? DEFAULT_PROD_DAILY_BUDGET_MICRO_USD
      : DEFAULT_PREVIEW_DAILY_BUDGET_MICRO_USD;
  return parsePositiveInt(
    env.ASSISTANT_DAILY_BUDGET_MICRO_USD,
    fallback,
    5_000_000, // hard safety ceiling $5.00/day
  );
}

export function maxAttemptMicroUsd(
  env: Record<string, string | undefined> = process.env,
): number {
  return parsePositiveInt(
    env.ASSISTANT_MAX_ATTEMPT_MICRO_USD,
    DEFAULT_MAX_ATTEMPT_MICRO_USD,
    50_000,
  );
}
