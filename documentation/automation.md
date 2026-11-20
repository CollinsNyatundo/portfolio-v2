# Embedded AI and Automation Controls

Captures the v2 portfolio assistant (`D-33`, `docs/07-SECURITY.md` items 74-75) so the boundary between what the LLM proposes and what the application enforces stays auditable.

## Overview

- **Trigger & Owner:** Explicit visitor submit inside the Portfolio Index drawer (`POST /api/assistant`). Never runs on page load, cron, webhook, or background queue.
- **Inputs Read:** Strictly the build-time public AST projection `content/.generated/assistant-corpus.json` (`published` case studies, `!draft` notes, `!archived` projects, `visible` experience, projected `site` without phone numbers, private repo URLs forced to `null`).
- **Tool / API Surface:** Zero external tools, zero database writes, zero email triggers, zero side-effect functions. Retrieval is read-only in-memory BM25F over precomputed corpus chunks (`lib/assistant/retriever.ts`).

## Steering vs. Non-Prompt Hard Guardrails

| Concern | Steering (Soft Prompt, `lib/assistant/prompt.ts`) | Non-Prompt Hard Guardrail (App-Enforced) |
|---|---|---|
| Scope & off-topic | Instructs model to stick to portfolio evidence and admit missing facts | Pre-LLM deterministic scope gate (`classifyScope`) refuses off-topic/injection probes and serves phone/private-code boundaries at `$0` cost; `assistantRequestSchema` rejects extra fields (`strictObject`) |
| Private content protection | Tells model not to invent links or private code | `scripts/build-assistant-corpus.ts` excludes unpublished/draft/hidden/archived items and strips private `repoUrl`/evidence `url` at build time |
| Spend & abuse prevention | `max_tokens: 800`, `reasoning: { effort: "none" }` | Per-IP burst (`12/10m`) + UTC day (`30/day`); Redis atomic `INCR` concurrency (`<= 5`) + conservative pre-attempt micro-USD reservation (`5,000` micro-USD) failing closed to `retrieval_only` |
| Hallucination & URL safety | Instructs model to cite chunk IDs, list fact IDs, and avoid em dashes/URLs | `verifyAndHydrate()` checks every `chunkId` & `factId` against current-request packed context only, rejects em dashes/banned words/HTML/URLs/secrets to `retrieval_only`, and server constructs all `evidence[]` routes and verbatim `facts[]` cards |
| Outbound network & privacy | OpenRouter payload sets `provider: { data_collection: "deny" }` | `validateProviderUrl` allows only `https://openrouter.ai/api/v1/chat/completions` (`redirect: "error"`), 64 KB response stream cap, `18s` unified `AbortController` deadline |

## Output Contract & Ownership Boundary

- **Model proposes:** `inPortfolio` boolean, plain text `blocks[].text` referencing `chunkIds[]`, `factIds[]`, and up to 3 plain `followUps[]`.
- **Application owns:** Final `mode` (`"generated"` vs `"retrieval_only"`), `verdict`, `reason`, sequential `[N]` citation indices, all navigable internal routes (`routeRegistry`), external URLs (`null` for private work), verbatim `PublicFactCard` objects (with datasets and caveats), and safe fallback rendering.

## Kill Switches and Telemetry

- **Instant cross-deployment kill switch:** Set Redis key `kill:assistant:generation = "1"` -> stops all billable generation across production and preview in `< 1s` while serving `retrieval_only`.
- **Full feature shutoff:** Set `ASSISTANT_MODE=off` in Vercel and redeploy (UI mounts `null`, route returns `503`).
- **Telemetry:** Single privacy-safe JSON log line per turn (`corpusVersion`, `corpusHash`, `promptVersion`, `modelId`, `operationalMode`, `responseMode`, `verdict`, `fallbackReason`, `attemptCount`, token counts, reserved micro-USD, `latencyMs`). Zero questions, answers, IPs, or headers logged.
