import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assistantProviderConfig,
  assistantRuntimeMode,
  PINNED_ASSISTANT_MODEL,
} from "@/lib/assistant/config";
import { handleAssistantTurn } from "@/lib/assistant/service";

// Codex review P1 on PR #36: only the single pinned model (AGENTS.md hard
// rule 3, D-33) may ever reach OpenRouter.
const LIVE_ENV = {
  ASSISTANT_MODE: "live",
  ASSISTANT_LLM_BASE_URL: "https://openrouter.ai/api/v1/chat/completions",
  ASSISTANT_LLM_MODEL: "google/gemini-2.5-flash",
  ASSISTANT_LLM_API_KEY: "test-key",
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  UPSTASH_REDIS_REST_TOKEN: "redis-tok",
};

const NOT_PINNED = [
  "openai/gpt-5",
  "anthropic/claude-opus-5.5",
  "Google/Gemini-2.5-Flash",
  "google/gemini-2.5-flash:thinking",
  "google/gemini-2.5-pro",
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("pinned assistant model", () => {
  it("pins google/gemini-2.5-flash", () => {
    expect(PINNED_ASSISTANT_MODEL).toBe("google/gemini-2.5-flash");
  });

  it("enables generation only for the pinned model (whitespace trimmed)", () => {
    expect(assistantRuntimeMode(LIVE_ENV)).toBe("generation_enabled");
    expect(
      assistantRuntimeMode({
        ...LIVE_ENV,
        ASSISTANT_LLM_MODEL: "  google/gemini-2.5-flash  ",
      }),
    ).toBe("generation_enabled");
    expect(assistantProviderConfig(LIVE_ENV)?.model).toBe(
      "google/gemini-2.5-flash",
    );
  });

  it.each(NOT_PINNED)(
    "degrades %s to retrieval_only and returns no provider config",
    (model) => {
      const env = { ...LIVE_ENV, ASSISTANT_LLM_MODEL: model };
      expect(assistantRuntimeMode(env)).toBe("retrieval_only");
      expect(assistantProviderConfig(env)).toBeNull();
      // The manual eval path skips Redis but must still honour the pin.
      expect(
        assistantProviderConfig(env, { allowWithoutRedis: true }),
      ).toBeNull();
    },
  );

  it("never calls OpenRouter for a non-pinned model and logs model_not_pinned", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("no outbound fetch expected");
    });
    vi.stubGlobal("fetch", fetchMock);

    const turn = await handleAssistantTurn(
      { question: "What hit@10 did LegalAI Kenya get on held-out questions?" },
      { env: { ...LIVE_ENV, ASSISTANT_LLM_MODEL: "openai/gpt-5" } },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(turn.response.mode).toBe("retrieval_only");
    // Public contract (docs/05) is unchanged; the reason is server-side only.
    expect(turn.response).toMatchObject({ reason: "configured_retrieval" });
    expect(turn.telemetry.fallbackReason).toBe("model_not_pinned");
  });
});
