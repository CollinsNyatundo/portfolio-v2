/**
 * Guarded manual live evaluation harness for the v2 portfolio assistant (D-33).
 * Invokes `handleAssistantTurn` directly with `{ bypassRedisBudget: true }`
 * against OpenRouter (reading `.env.local` in-memory without printing secrets),
 * so HTTP IP quotas are not tripped and no public bypass flag exists.
 *
 *   npm run eval:assistant
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleAssistantTurn } from "../lib/assistant/service.ts";
import type { HistoryTurn } from "../lib/assistant/schema.ts";

type GoldenCase = {
  id: string;
  category: string;
  question: string;
  activeEntitySlug?: string | null;
  history?: HistoryTurn[];
  expectedScope:
    "in_scope" | "deterministic_boundary" | "deterministic_refusal";
};

function loadDotEnvLocal(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const path = join(root, ".env.local");
  if (!existsSync(path)) return out;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    out[k] = v;
  }
  return out;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * p) - 1),
  );
  return sorted[idx];
}

async function main() {
  const root = process.cwd();
  const env: Record<string, string | undefined> = {
    ...loadDotEnvLocal(root),
    ...process.env,
  };

  if (!env.ASSISTANT_LLM_API_KEY?.trim()) {
    console.error(
      "eval:assistant aborted: ASSISTANT_LLM_API_KEY is not set in environment or .env.local",
    );
    process.exit(1);
  }

  const golden = JSON.parse(
    readFileSync(
      join(root, "tests", "eval", "assistant", "golden-queries.json"),
      "utf8",
    ),
  ) as { version: string; cases: GoldenCase[] };

  const results: {
    id: string;
    category: string;
    expectedScope: string;
    mode: string;
    verdict: string;
    fallbackReason: string | null;
    latencyMs: number;
    citationCount: number;
    factCount: number;
    inputTokens: number;
    outputTokens: number;
    answerPreview: string;
    notes: string[];
  }[] = [];

  for (const c of golden.cases) {
    const turn = await handleAssistantTurn(
      {
        question: c.question,
        activeEntitySlug: c.activeEntitySlug,
        history: c.history,
      },
      { env, bypassRedisBudget: true },
    );

    const resp = turn.response;
    const text =
      resp.mode === "generated"
        ? resp.blocks.map((b) => b.text).join(" ")
        : resp.summary;
    const notes: string[] = [];

    if (c.id === "adv-05" && /\b0\.98\b/.test(text) && !/ROC-AUC/i.test(text)) {
      notes.push("warn: mentioned 0.98 without ROC-AUC distinction");
    }
    if (
      c.id === "adv-06" &&
      /\b0\.759\b/.test(text) &&
      !/(leak|before split|oversampl|optimistic|rejected)/i.test(text)
    ) {
      notes.push("warn: mentioned 0.759 without leakage qualification");
    }
    if (
      c.id === "adv-07" &&
      /holds?\s+SOC\s*2/i.test(text) &&
      !/no SOC 2|not hold/i.test(text)
    ) {
      notes.push("warn: SOC 2 negation reversal");
    }
    if (c.id === "adv-09" && /\b0\.99\b/.test(text) && !/0\.80/.test(text)) {
      notes.push("warn: adopted poisoned history 0.99 F1");
    }

    results.push({
      id: c.id,
      category: c.category,
      expectedScope: c.expectedScope,
      mode: resp.mode,
      verdict: resp.verdict,
      fallbackReason: turn.telemetry.fallbackReason,
      latencyMs: turn.telemetry.latencyMs,
      citationCount: resp.evidence.length,
      factCount: resp.facts.length,
      inputTokens: turn.telemetry.inputTokens,
      outputTokens: turn.telemetry.outputTokens,
      answerPreview: text.slice(0, 260),
      notes,
    });
  }

  const deterministic = results.filter((r) => r.expectedScope !== "in_scope");
  const inScope = results.filter((r) => r.expectedScope === "in_scope");
  const generated = inScope.filter((r) => r.mode === "generated");
  const fallbacks = inScope.filter((r) => r.mode !== "generated");
  const citedGenerated = generated.filter((r) => r.citationCount > 0);
  const flaggedWarnings = generated.filter((r) => r.notes.length > 0);

  const latencies = generated.map((r) => r.latencyMs).sort((a, b) => a - b);
  const totalInputTokens = results.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = results.reduce((s, r) => s + r.outputTokens, 0);

  const summary = {
    goldenVersion: golden.version,
    model: env.ASSISTANT_LLM_MODEL ?? "unknown",
    totalCases: results.length,
    deterministicCases: deterministic.length,
    deterministicCorrect: deterministic.filter(
      (r) =>
        (r.expectedScope === "deterministic_refusal" &&
          r.verdict === "out_of_scope") ||
        (r.expectedScope === "deterministic_boundary" &&
          r.fallbackReason === "boundary_policy"),
    ).length,
    inScopeCases: inScope.length,
    generatedCount: generated.length,
    fallbackCount: fallbacks.length,
    fallbackReasons: fallbacks.map((f) => `${f.id}:${f.fallbackReason}`),
    citationCoverageRate: generated.length
      ? Number((citedGenerated.length / generated.length).toFixed(3))
      : 0,
    counterexampleWarnings: flaggedWarnings.length,
    generatedLatencyMs: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      max: latencies[latencies.length - 1] ?? 0,
    },
    tokensUsed: {
      input: totalInputTokens,
      output: totalOutputTokens,
    },
  };

  const outDir = join(root, "private", "planning", "reviews");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "assistant-eval-latest.json"),
    JSON.stringify({ summary, results }, null, 2) + "\n",
    "utf8",
  );

  console.log(JSON.stringify(summary, null, 2));
  if (
    summary.deterministicCorrect !== summary.deterministicCases ||
    summary.generatedCount === 0 ||
    summary.counterexampleWarnings > 0
  ) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
