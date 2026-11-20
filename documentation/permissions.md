# Permissions and Access Control

`portfolio-v2` has no user accounts, login flows, roles database, or row-level security (D-03; `docs/07-SECURITY.md` §5 items 01-04, 16-25, 66-67).

## Actors and Trust Levels

| Actor | Trust Source | Capabilities | Enforcement |
|---|---|---|---|
| **Anonymous public visitor** | Browser on `https://collinsnyagaka.com` | Read public static/SSR pages; run ML demos within rate limits; query portfolio assistant over public projected corpus; submit Turnstile-checked contact message | Nonce CSP (`proxy.ts`), same-origin checks, Zod/Pydantic strict validation, Upstash rate limits, AST public-content projection (`scripts/build-assistant-corpus.ts`) |
| **Serverless function runtime** | Vercel server environment | Read bundled read-only artifacts (`assistant-corpus.json`, `model.txt`, `mlsys.db`); invoke Upstash, Turnstile, Resend, OpenRouter using server secrets | Server-only env vars (`NEXT_PUBLIC_` strictly forbidden for secrets), URL allow-lists, `redirect: "error"` |
| **Owner (`CollinsNyatundo`)** | GitHub passkey/TOTP + branch protection on `main`; Vercel/Upstash/OpenRouter dashboards | Modify `content/`, code, and Vercel env vars; trigger `kill:assistant:generation = "1"` in Redis; review PRs | PR CI gates (`gitleaks`, `check`, `test:py`, `links`, `audit`, `build`, `check:bundle`, `e2e`, `e2e:assistant-enabled`, `lhci`) |

## Resource x Operation Matrix

| Resource | Public Visitor | Server Function | Owner |
|---|---|---|---|
| Published pages, case studies, notes, CV PDF | Read (`GET`) | Serve | Edit via PR -> `main` |
| `private/` & `.env*` | None (404 / git-ignored / `.vercelignore`d) | None (excluded from corpus compiler & bundles) | Local machine / Vercel secret store |
| `content/.generated/assistant-corpus.json` | Indirect read-only query (`POST /api/assistant`) | Read-only in-memory lookup | Regenerated at build (`npm run content`) |
| Upstash Redis counters (`rl:*`, `budget:*`, `conc:*`, `kill:*`) | None direct | Atomic increment / check via REST token | Full dashboard control + kill switch |
| OpenRouter completion API | None direct (server-mediated within daily cap) | Single bounded `POST` per verified in-scope request | Dashboard key + $5/month spend limit |
