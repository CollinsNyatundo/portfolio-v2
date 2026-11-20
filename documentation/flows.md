# Load-Bearing Flows

Security and operational journeys where trust boundaries, quotas, or external side effects execute (excludes pure static reading flows per anti-PRD rules).

## 1. Portfolio Assistant Query (`generation_enabled` & `retrieval_only`)

- **Actor:** Anonymous site visitor (unauthenticated browser).
- **Preconditions:** `ASSISTANT_MODE` is `"retrieval"` or `"live"`; visitor triggers launcher click (loads lazy `<dialog>` drawer chunk).
- **Sequence:**
  1. **Browser -> Next.js SSR (`app/layout.tsx`):** `assistantRuntimeMode()` checks env vars server-side (never exposes keys); mounts `<AssistantRoot />` only when enabled.
  2. **Browser -> `POST /api/assistant` (`app/api/assistant/route.ts`):** Visitor submits `question` (2-500 chars) + optional `pageContext` / `activeEntitySlug` / `history` (<= 4 turns).
  3. **Edge/Route Guards (Trust Boundary 1):**
     - Kill switch (`ASSISTANT_MODE` disabled) -> **deny `503`** `{ error: "disabled" }`.
     - Same-origin (`Origin === reqUrl.origin`) and `Sec-Fetch-Site` check -> **deny `403`**.
     - Exact `application/json` media type -> **deny `415`**.
     - `Content-Length` + streaming UTF-8 byte reader capped at 8 KB -> **deny `413`**.
     - Per-IP burst (`12/10m`) and UTC-day (`30/day`) via `assistantIpRateLimited` -> **deny `429`** with `Retry-After`.
     - `assistantRequestSchema.safeParse` (`.strict()`) -> **deny `400`** naming rejected fields.
  4. **Scope & Boundary Gate (`lib/assistant/retriever.ts`):**
     - Prompt-extraction / override probes or off-topic queries -> **deterministic refusal `200`** (`mode: "retrieval_only"`, `verdict: "out_of_scope"`, `$0` LLM spend).
     - Phone or private-repo-code requests -> **deterministic boundary `200`** (`reason: "boundary_policy"`, `$0` LLM spend).
  5. **BM25F Retrieval & Budget Reservation (`lib/assistant/service.ts`, `lib/rate-limit.ts`):**
     - Packs public `assistant-corpus.json` chunks + coupled `FactUnit` limits (`<= 4,200` tokens).
     - In `generation_enabled`: `reserveAssistantBudget()` atomically checks `kill:assistant:generation`, claims concurrency (`<= 5`), and reserves `5,000` micro-USD against UTC daily cap (`budget:assistant:<env>:<YYYY-MM-DD>`).
     - Any Redis error, kill switch `"1"`, concurrency overflow, or budget exhaustion -> **degrades `200`** (`mode: "retrieval_only"`, `$0` LLM spend).
  6. **OpenRouter Call -> Verifier (Trust Boundary 2):**
     - Single `fetch` POST (`redirect: "error"`, 64 KB response byte cap, `18s` total deadline) with `reasoning: { effort: "none" }` and `provider: { data_collection: "deny" }`.
     - `verifyAndHydrate()` checks Zod schema, current-request `chunkIds`/`factIds`, copy rules, HTML/URI/secret safety; **any failure rejects to `200` `retrieval_only`** (`finally` releases concurrency slot).
- **Side Effects:** Increments hashed-IP rate counters, daily micro-USD budget counter, and privacy-safe `console.info` JSON metric log (zero prompts/answers/IPs stored).

## 2. Contact Form Submission (`POST /api/contact`)

- **Actor:** Anonymous visitor (when all four contact env vars are set).
- **Guards:** `503` when unconfigured -> `403` Origin mismatch -> `415` non-JSON -> `413` > 8 KB -> `429` (`3/hour/IP`) -> `400` strict Zod errors -> honeypot `website` silent `200` -> Cloudflare Turnstile `siteverify` (`400` fail) -> Resend API plain-text send to owner.
- **Side Effects:** One plain-text email to owner; zero DB storage.

## 3. ML Demos (`POST /api/demos/fraud/score`, `GET /api/demos/mlsys/search`)

- **Actor:** Anonymous visitor.
- **Guards:** Body/query bounds (`<= 4 KB` JSON / `3-200` chars), Pydantic `extra="forbid"` / FTS operator stripping + SQLite bound parameters (`mode=ro`), Upstash per-IP rate limits (`30/10m` fraud, `60/10m` search) -> `429` deny. No `.pkl`/`.joblib` deserialization.
- **Side Effects:** Ephemeral hashed-IP Redis counters only; static client fallback JSON on timeout/error.
