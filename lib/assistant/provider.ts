import type { ProviderConfig } from "./config.ts";
import type { ChatMessage } from "./prompt.ts";
import { OPENROUTER_RESPONSE_SCHEMA } from "./schema.ts";

const MAX_RESPONSE_BYTES = 64 * 1024;

export type ProviderCallResult =
  | {
      ok: true;
      content: string;
      inputTokens: number;
      outputTokens: number;
      model: string;
    }
  | {
      ok: false;
      reason: string;
    };

async function readBoundedResponseText(
  res: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<string | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let out = "";

  const onAbort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      if (signal.aborted) return null;
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
    return out;
  } catch {
    return null;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

/**
 * Single bounded attempt against the pinned OpenRouter endpoint (D-33).
 * Never follows redirects and caps response buffering to 64 KB.
 */
export async function callOpenRouter(params: {
  config: ProviderConfig;
  messages: ChatMessage[];
  signal: AbortSignal;
}): Promise<ProviderCallResult> {
  try {
    const res = await fetch(params.config.url, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: params.signal,
      headers: {
        Authorization: `Bearer ${params.config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://collinsnyagaka.com",
        "X-Title": "Collins Nyagaka Portfolio",
      },
      body: JSON.stringify({
        model: params.config.model,
        temperature: 0.1,
        max_tokens: 800,
        reasoning: { effort: "none" },
        provider: { data_collection: "deny" },
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "portfolio_assistant_reply",
            strict: true,
            schema: OPENROUTER_RESPONSE_SCHEMA,
          },
        },
        messages: params.messages,
      }),
    });

    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }

    const raw = await readBoundedResponseText(
      res,
      MAX_RESPONSE_BYTES,
      params.signal,
    );
    if (!raw) {
      return { ok: false, reason: "response_too_large_or_aborted" };
    }

    const body = JSON.parse(raw) as {
      model?: unknown;
      choices?: {
        finish_reason?: unknown;
        message?: { content?: unknown };
      }[];
      usage?: {
        prompt_tokens?: unknown;
        completion_tokens?: unknown;
      };
    };

    const choice = body.choices?.[0];
    if (choice?.finish_reason === "length") {
      return { ok: false, reason: "truncated_length" };
    }
    const msgContent = choice?.message?.content;
    let textContent: string | null = null;
    if (typeof msgContent === "string") {
      textContent = msgContent;
    } else if (Array.isArray(msgContent)) {
      textContent = msgContent
        .map((part) =>
          typeof part === "object" &&
          part !== null &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
            ? (part as { text: string }).text
            : "",
        )
        .join("");
    }

    if (!textContent || textContent.trim().length === 0) {
      return { ok: false, reason: "empty_content" };
    }

    return {
      ok: true,
      content: textContent,
      inputTokens:
        typeof body.usage?.prompt_tokens === "number"
          ? body.usage.prompt_tokens
          : 0,
      outputTokens:
        typeof body.usage?.completion_tokens === "number"
          ? body.usage.completion_tokens
          : 0,
      model: typeof body.model === "string" ? body.model : params.config.model,
    };
  } catch (err) {
    if (params.signal.aborted) {
      return { ok: false, reason: "timeout_or_aborted" };
    }
    void err;
    return { ok: false, reason: "network_or_parse_error" };
  }
}
