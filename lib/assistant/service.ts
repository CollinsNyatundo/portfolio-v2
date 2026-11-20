import { reserveAssistantBudget } from "../rate-limit.ts";
import {
  assistantProviderConfig,
  assistantRuntimeMode,
  dailyBudgetMicroUsd,
  isPinnedAssistantModel,
  deploymentNamespace,
  maxAttemptMicroUsd,
} from "./config.ts";
import { getCorpus } from "./corpus.ts";
import { buildPromptMessages, PROMPT_VERSION } from "./prompt.ts";
import { callOpenRouter } from "./provider.ts";
import {
  buildRetrievalFallbackResponse,
  classifyScope,
  retrieveAndPack,
} from "./retriever.ts";
import type { AssistantRequest } from "./schema.ts";
import type { AssistantResponse } from "./types.ts";
import { verifyAndHydrate } from "./verifier.ts";

const TOTAL_DEADLINE_MS = 18_000;
const RESERVE_SERIALIZE_MS = 4_000;
const MAX_PROVIDER_SLICE_MS = 14_000;

export type ServiceTurnResult = {
  response: AssistantResponse;
  telemetry: {
    event: "assistant_turn";
    corpusVersion: number;
    corpusHash: string;
    promptVersion: string;
    modelId: string;
    operationalMode: string;
    responseMode: AssistantResponse["mode"];
    verdict: AssistantResponse["verdict"];
    fallbackReason: string | null;
    attemptCount: number;
    inputTokens: number;
    outputTokens: number;
    budgetReservedMicroUsd: number;
    retrievedCount: number;
    factCount: number;
    latencyMs: number;
  };
};

export async function handleAssistantTurn(
  reqData: AssistantRequest,
  opts: {
    signal?: AbortSignal;
    env?: Record<string, string | undefined>;
    /** Used ONLY by manual CLI script `scripts/eval-assistant.ts`; never exposed over HTTP. */
    bypassRedisBudget?: boolean;
  } = {},
): Promise<ServiceTurnResult> {
  const startedAt = Date.now();
  const env = opts.env ?? process.env;
  const corpus = getCorpus();
  const opMode = assistantRuntimeMode(env);
  const configuredModel = env.ASSISTANT_LLM_MODEL?.trim() || "none";

  const finish = (
    response: AssistantResponse,
    extra: {
      fallbackReason?: string | null;
      attemptCount?: number;
      inputTokens?: number;
      outputTokens?: number;
      budgetReservedMicroUsd?: number;
      retrievedCount?: number;
      factCount?: number;
      modelId?: string;
    } = {},
  ): ServiceTurnResult => ({
    response,
    telemetry: {
      event: "assistant_turn",
      corpusVersion: corpus.schemaVersion,
      corpusHash: corpus.contentHash.slice(0, 12),
      promptVersion: PROMPT_VERSION,
      modelId: extra.modelId ?? configuredModel,
      operationalMode: opts.bypassRedisBudget ? "direct_eval" : opMode,
      responseMode: response.mode,
      verdict: response.verdict,
      fallbackReason: extra.fallbackReason ?? null,
      attemptCount: extra.attemptCount ?? 0,
      inputTokens: extra.inputTokens ?? 0,
      outputTokens: extra.outputTokens ?? 0,
      budgetReservedMicroUsd: extra.budgetReservedMicroUsd ?? 0,
      retrievedCount: extra.retrievedCount ?? 0,
      factCount: extra.factCount ?? response.facts.length,
      latencyMs: Date.now() - startedAt,
    },
  });

  // 1. Deterministic scope & policy gate ($0 LLM cost).
  const scope = classifyScope({
    question: reqData.question,
    pageContext: reqData.pageContext,
    activeEntitySlug: reqData.activeEntitySlug,
    history: reqData.history,
  });

  if (scope.kind === "deterministic_refusal") {
    return finish(
      {
        mode: "retrieval_only",
        verdict: scope.verdict,
        reason: scope.reason,
        summary: scope.summary,
        excerpts: scope.excerpts,
        facts: scope.facts,
        evidence: scope.evidence,
        followUps: scope.followUps,
        activeEntitySlug: null,
      },
      { fallbackReason: "out_of_scope" },
    );
  }

  if (scope.kind === "deterministic_boundary") {
    return finish(
      {
        mode: "retrieval_only",
        verdict: scope.verdict,
        reason: scope.reason,
        summary: scope.summary,
        excerpts: scope.excerpts,
        facts: scope.facts,
        evidence: scope.evidence,
        followUps: scope.followUps,
        activeEntitySlug: scope.activeEntitySlug,
      },
      { fallbackReason: "boundary_policy" },
    );
  }

  // 2. Deterministic BM25F retrieval + evidence-coupled packing.
  const packed = retrieveAndPack({
    question: reqData.question,
    pageContext: reqData.pageContext,
    activeEntitySlug: reqData.activeEntitySlug,
    history: reqData.history,
  });

  const providerConfig = assistantProviderConfig(env, {
    allowWithoutRedis: Boolean(opts.bypassRedisBudget),
  });

  if (
    !providerConfig ||
    (!opts.bypassRedisBudget && opMode !== "generation_enabled")
  ) {
    // A live deployment with a non-pinned model is a misconfiguration. The
    // visitor sees the normal retrieval answer (public reason unchanged,
    // docs/05); the server log records why generation is off.
    const modelNotPinned =
      env.ASSISTANT_MODE?.trim().toLowerCase() === "live" &&
      Boolean(env.ASSISTANT_LLM_MODEL?.trim()) &&
      !isPinnedAssistantModel(env.ASSISTANT_LLM_MODEL);
    return finish(
      buildRetrievalFallbackResponse({
        packed,
        reason: "configured_retrieval",
        question: reqData.question,
      }),
      {
        fallbackReason: modelNotPinned
          ? "model_not_pinned"
          : "configured_retrieval",
        retrievedCount: packed.chunks.length,
      },
    );
  }

  // 3. Conservative pre-attempt micro-USD reservation + kill-switch check.
  const attemptMicroUsd = maxAttemptMicroUsd(env);
  let reservation: Awaited<ReturnType<typeof reserveAssistantBudget>> | null =
    null;

  if (!opts.bypassRedisBudget) {
    reservation = await reserveAssistantBudget({
      envName: deploymentNamespace(env),
      maxAttemptMicroUsd: attemptMicroUsd,
      dailyCapMicroUsd: dailyBudgetMicroUsd(env),
    });

    if (!reservation.allowed) {
      const fbReason =
        reservation.reason === "budget_reached"
          ? "budget_reached"
          : "provider_unavailable";
      return finish(
        buildRetrievalFallbackResponse({
          packed,
          reason: fbReason,
          question: reqData.question,
        }),
        {
          fallbackReason: reservation.reason,
          retrievedCount: packed.chunks.length,
        },
      );
    }
  }

  // 4. Single bounded provider attempt under unified end-to-end deadline.
  const deadlineController = new AbortController();
  const elapsed = Date.now() - startedAt;
  const remainingTotal = Math.max(0, TOTAL_DEADLINE_MS - elapsed);
  const providerSliceMs = Math.min(
    MAX_PROVIDER_SLICE_MS,
    Math.max(1000, remainingTotal - RESERVE_SERIALIZE_MS),
  );
  const timer = setTimeout(
    () => deadlineController.abort("deadline"),
    providerSliceMs,
  );

  const onCallerAbort = () => deadlineController.abort("caller_aborted");
  if (opts.signal) {
    if (opts.signal.aborted) {
      deadlineController.abort("caller_aborted");
    } else {
      opts.signal.addEventListener("abort", onCallerAbort, { once: true });
    }
  }

  try {
    const messages = buildPromptMessages({
      question: reqData.question,
      pageContext: reqData.pageContext,
      history: reqData.history,
      packed,
    });

    const callResult = await callOpenRouter({
      config: providerConfig,
      messages,
      signal: deadlineController.signal,
    });

    if (!callResult.ok) {
      return finish(
        buildRetrievalFallbackResponse({
          packed,
          reason: "provider_unavailable",
          question: reqData.question,
        }),
        {
          fallbackReason: callResult.reason,
          attemptCount: 1,
          budgetReservedMicroUsd: opts.bypassRedisBudget ? 0 : attemptMicroUsd,
          retrievedCount: packed.chunks.length,
        },
      );
    }

    const verified = verifyAndHydrate(callResult.content, packed);
    if (!verified.ok) {
      return finish(
        buildRetrievalFallbackResponse({
          packed,
          reason: "verification_fallback",
          question: reqData.question,
        }),
        {
          fallbackReason: verified.reason,
          attemptCount: 1,
          inputTokens: callResult.inputTokens,
          outputTokens: callResult.outputTokens,
          budgetReservedMicroUsd: opts.bypassRedisBudget ? 0 : attemptMicroUsd,
          retrievedCount: packed.chunks.length,
          modelId: callResult.model,
        },
      );
    }

    return finish(verified.response, {
      attemptCount: 1,
      inputTokens: callResult.inputTokens,
      outputTokens: callResult.outputTokens,
      budgetReservedMicroUsd: opts.bypassRedisBudget ? 0 : attemptMicroUsd,
      retrievedCount: packed.chunks.length,
      factCount: verified.factCount,
      modelId: callResult.model,
    });
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onCallerAbort);
    if (reservation?.allowed) {
      await reservation.releaseConcurrency();
    }
  }
}
