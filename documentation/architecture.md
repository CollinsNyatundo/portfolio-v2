# Architecture

Operational review map for `collinsnyagaka.com` (`portfolio-v2`). Authoritative product, design, schema and security specs live in `docs/00-README.md` through `docs/07-SECURITY.md`; this document summarizes the runtime topology and trust boundaries for reviewers.

## Overview and Stack

- **Public site:** Next.js 16.4.5 App Router on Vercel (`fra1`), TypeScript strict, Tailwind CSS v4, build-time compiled MDX (`@next/mdx`, D-29), cookieless `@vercel/analytics`, per-request nonce CSP in `proxy.ts` (D-28).
- **Interactive ML demos:** Python 3.13 Vercel Functions in `api/` (`fraud/score.py` reading LightGBM text format in pure Python `api/_lib/gbdt.py` per D-31; `mlsys/search.py` using read-only SQLite FTS5). Zero LLM calls in demos (D-07).
- **Contact form:** `POST /api/contact` (Node.js 24) behind Cloudflare Turnstile, origin check, honeypot and Resend plain-text delivery (enabled only when all four env vars are present).
- **Grounded portfolio assistant (v2, D-33):** `POST /api/assistant` (Node.js 24, `maxDuration = 25`), reading build-time projected `content/.generated/assistant-corpus.json` and calling pinned OpenRouter (`google/gemini-2.5-flash`) server-side when `generation_enabled`.
- **Shared state:** Upstash Redis REST for fixed-window rate limits, daily IP hashing salt, assistant micro-USD spend budget, concurrency slot and instant kill switch (`kill:assistant:generation`). No primary database, CMS, user accounts or session auth (D-03).

## Three Assistant Operational States (D-33)

| State | Trigger | UI | `/api/assistant` |
|---|---|---|---|
| `disabled` | `ASSISTANT_MODE` unset or `"off"` | `<AssistantRoot />` returns `null` (0 bytes client JS) | `503 { error: "disabled" }` |
| `retrieval_only` | `ASSISTANT_MODE="retrieval"`, missing Redis/OpenRouter config, Redis error, `kill:assistant:generation="1"`, budget exhausted, or upstream/verifier failure | Launcher + drawer show direct matching excerpts and verbatim Fact Cards | `200` (`mode: "retrieval_only"`, $0 LLM spend) |
| `generation_enabled` | `ASSISTANT_MODE="live"` + valid OpenRouter URL/key/model + healthy Upstash Redis | Grounded prose blocks + `[N]` inline citations + Fact Cards + Evidence links | `200` (`mode: "generated"` or clean fallback to `retrieval_only`) |

## Trust Boundaries

1. **Browser <-> Vercel CDN / SSR:** Public content only; nonce-strict CSP (`script-src 'self' 'nonce-{n}' 'strict-dynamic'`, `connect-src 'self'`).
2. **Browser <-> Serverless APIs (`/api/contact`, `/api/demos/*`, `/api/assistant`):** Untrusted input boundary; enforced by same-origin/`Sec-Fetch-Site`, exact media type, streaming byte caps, rate limits and strict Zod/Pydantic schemas.
3. **Server Functions <-> Upstash / Turnstile / Resend:** Server-only secrets; raw visitor IPs are hashed with daily random Redis salts before storage (`lib/rate-limit.ts`).
4. **Server Functions <-> OpenRouter (`lib/assistant/provider.ts`):** Server-only `ASSISTANT_LLM_API_KEY`; pinned `https://openrouter.ai/api/v1/chat/completions` (`redirect: "error"`, `provider.data_collection: "deny"`, single bounded attempt).
5. **GitHub <-> Build / CI:** Build-time AST projection (`scripts/build-assistant-corpus.ts`) isolates `content/` from `private/`; gitleaks + `check:bundle` guard client outputs.

## Known Risks and Assumptions

- **Shared workplace NATs & distributed bursts (`app/api/contact/route.ts`, `app/api/assistant/route.ts`):** Per-IP limits rely on Vercel's overwritten `x-forwarded-for`. Distributed callers are bounded globally by the daily micro-USD budget (`budget:assistant:<env>:<YYYY-MM-DD>`) and concurrency cap (`conc:assistant:<env>`).
- **Upstash Redis availability on Vercel (`lib/rate-limit.ts`):** If Upstash env vars are unset or Redis errors, `/api/contact` and retrieval endpoints safely use an in-process fallback window, while assistant paid generation fails closed to `retrieval_only`.
- **Environment variable scope on Vercel (`lib/assistant/config.ts`):** Changing `ASSISTANT_MODE` requires a redeploy for running deployments; emergency shutdown across all active deployments uses Upstash key `kill:assistant:generation = "1"`.
- **Home-page scroll & overlay geometry (`components/home/evidence-ledger.tsx`, `components/assistant/assistant-launcher.tsx`):** On narrow viewports (`< 1280px`), `ResizeObserver` writes `--evidence-strip-h` to `:root` so the launcher stays clear of the mobile Evidence strip.
- **No scheduled background jobs in application code:** Only `.github/workflows/links.yml` and `.github/workflows/smoke.yml` run on GitHub Actions schedules, so there is no `cron.md`.

## Related Documents

- [flows.md](flows.md) - Runtime security and degradation flows
- [permissions.md](permissions.md) - Trust levels and resource matrix
- [variables.md](variables.md) - Environment variables, scopes and rotation
- [automation.md](automation.md) - Portfolio assistant guardrails, tool surface and kill switch
- [emails.md](emails.md) - Contact email delivery path
- [seo.md](seo.md) - Public route indexability and Open Graph sanitization
- [tests.md](tests.md) - Verification map, gaps and CI merge gates
- Canonical specs: [docs/00-README.md](../docs/00-README.md) through [docs/07-SECURITY.md](../docs/07-SECURITY.md)
