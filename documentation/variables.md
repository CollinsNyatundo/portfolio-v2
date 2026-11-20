# Environment Variables and Secrets

All secrets are strictly server-only (`NEXT_PUBLIC_` is allowed only for `NEXT_PUBLIC_TURNSTILE_SITE_KEY`). Never commit `.env*` files.

## Variable Inventory

| Name | Used By | Scope | Source | Rotation | Risk if Leaked / Misconfigured |
|---|---|---|---|---|---|
| `ASSISTANT_MODE` | `lib/assistant/config.ts`, `app/layout.tsx`, `app/api/assistant/route.ts` | Server only | Vercel env (`off` \| `retrieval` \| `live`) | Change + redeploy (use Redis kill key for instant stop) | Accidental exposure of `"live"` without Redis falls back cleanly to `retrieval_only` |
| `ASSISTANT_LLM_BASE_URL` | `lib/assistant/config.ts`, `lib/assistant/provider.ts` | Server only | Vercel env (`https://openrouter.ai/api/v1/chat/completions`) | Config edit | SSRF guard (`validateProviderUrl`) rejects any non-allowlisted host |
| `ASSISTANT_LLM_MODEL` | `lib/assistant/config.ts`, `lib/assistant/provider.ts` | Server only | Vercel env (`google/gemini-2.5-flash`) | Config edit | Wrong model alters JSON schema reliability or cost; pin tested model only |
| `ASSISTANT_LLM_API_KEY` | `lib/assistant/config.ts`, `lib/assistant/provider.ts` | Server only | OpenRouter dashboard | Rotate immediately at OpenRouter + Vercel redeploy | Billing abuse up to provider's hard $5/month dashboard ceiling |
| `ASSISTANT_DAILY_BUDGET_MICRO_USD` | `lib/assistant/config.ts`, `lib/assistant/service.ts` | Server only | Vercel env (`500000` prod, `100000` preview) | Config edit | High value increases daily spend risk; hard-capped in code at `5000000` ($5/day) |
| `ASSISTANT_MAX_ATTEMPT_MICRO_USD` | `lib/assistant/config.ts`, `lib/assistant/service.ts` | Server only | Vercel env (`5000` = $0.005/attempt) | Config edit | Under-sizing undercounts token cost; over-sizing reduces allowed daily turns |
| `ASSISTANT_ALLOW_LOOPBACK_TEST_PROVIDER` | `lib/assistant/config.ts` | Server test only | Local E2E runner (`scripts/run-assistant-e2e.ts`) | Never set on Vercel | Ignored whenever `process.env.VERCEL` is truthy |
| `UPSTASH_REDIS_REST_URL` | `lib/rate-limit.ts`, `api/_lib/http.py` | Server only | Upstash / Vercel Marketplace | Rotate DB endpoint/token | Missing/unavailable causes assistant generation to fail closed to `retrieval_only` |
| `UPSTASH_REDIS_REST_TOKEN` | `lib/rate-limit.ts`, `api/_lib/http.py` | Server only | Upstash / Vercel Marketplace | Rotate token in Upstash + Vercel | Allows tampering with rate/budget/kill counters if leaked |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | `lib/upstash-env.ts`, `api/_lib/http.py` | Server only | Vercel Marketplace Upstash integration (auto-provisioned) | Rotate in Upstash; Vercel re-syncs | Used when the `UPSTASH_REDIS_REST_*` pair is absent; `KV_REST_API_READ_ONLY_TOKEN` is never read |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `app/contact/page.tsx`, `lib/contact-form.ts` | Public client (by design) | Cloudflare Turnstile | Rotate widget key | Low (site key is public; requires matching secret server-side) |
| `TURNSTILE_SECRET_KEY` | `app/api/contact/route.ts`, `lib/contact-form.ts` | Server only | Cloudflare Turnstile | Rotate secret in Cloudflare + Vercel | Contact form bot checks bypassed |
| `RESEND_API_KEY` | `app/api/contact/route.ts`, `lib/contact-form.ts` | Server only | Resend | Revoke + reissue at Resend | Unauthorized mail sending from `CONTACT_FROM_EMAIL` |
| `CONTACT_FROM_EMAIL` | `app/api/contact/route.ts`, `lib/contact-form.ts` | Server only | Verified Resend sender | Config edit | Contact form disabled (`503`) if omitted |
| `GITHUB_TOKEN` | `.github/workflows/ci.yml` (`npm run links`) | CI runner only | GitHub Actions built-in read token | Ephemeral per job | Read-only repo API rate quota only |

## Zero-Client-Secret Proof & Pre-Go-Live Checklist

- **Automated check:** `npm run check:bundle` scans every built chunk in `.next/static/` for secret patterns (`sk-or-`, `gsk_`, `AIza`, `sk-proj-`, `re_`, `UPSTASH_REDIS_REST_TOKEN`, `TURNSTILE_SECRET`, `ASSISTANT_LLM_API_KEY`) and verifies server-only corpus/prompt strings never appear in client JS. `tests/smoke/security.spec.ts` checks live chunks.
- **Pre-go-live:**
  1. Confirm Upstash credentials are provisioned on `portfolio-v2`: either `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or the Marketplace `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
  2. Set hard monthly spend ceiling (`$5/month`) in OpenRouter before setting `ASSISTANT_LLM_API_KEY`.
  3. Set Preview `ASSISTANT_DAILY_BUDGET_MICRO_USD=100000` ($0.10/day) and Production `500000` ($0.50/day).
  4. Never set `ASSISTANT_ALLOW_LOOPBACK_TEST_PROVIDER` in Vercel.
  5. Rehearse `kill:assistant:generation = "1"` in Upstash Redis before production cut-over.
