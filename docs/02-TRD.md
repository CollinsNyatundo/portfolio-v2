# 02 — Technical Requirements Document (TRD)

**Version:** 0.3 · **Date:** 2026-11-03 · Depends on: [01-PRD](01-PRD.md)

## 1. Platforms

Web only. Responsive from 320 px to 1920 px. Supported browsers: last 2 versions of Chrome, Edge, Firefox, Safari
(incl. iOS Safari), Samsung Internet. Works without JavaScript for all content pages; demos need JavaScript and say so
in a `<noscript>` message.

## 2. Frontend and hosting

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.x, App Router**, TypeScript strict | Same stack as the owner's other Next.js 16 projects, so patterns and lint rules carry over. Confirm current stable with `ctx7` at M1. |
| Rendering | **Per-request server rendering** of content that is still compiled from MDX at build time (D-28): the root layout awaits `connection()` so every response carries a fresh CSP nonce. No runtime data fetching on content pages, so nothing breaks when a backend sleeps (the root cause of the old site's "Error loading projects"). Cache Components / Partial Prerendering are off: a prerendered shell can't carry a nonce | M1 measured Lighthouse mobile 100/100/100/100, LCP 0.8 s locally with this setup |
| Content | MDX files in `content/`, compiled at build time by `@next/mdx` (remark-frontmatter, remark-gfm); frontmatter and data files validated with Zod by `scripts/build-content.ts`, which writes `content/.generated/index.json` (D-29) | See [05](05-CONTENT-SCHEMA.md). Invalid content fails `npm run content`, which runs before dev, build, typecheck and tests. |
| Styling | Tailwind CSS v4 + CSS variables for tokens | Tokens defined in [04](04-UI-UX-BRIEF.md). |
| Components | Hand-built primitives; shadcn/ui only where it saves real work (dialog, tabs, toast) | Keep JS small. |
| Motion / scroll | **scroll-craft engine** (`scrollcraft.js` ~19 KB gz + `scrollcraft.css` ~7 KB gz, MIT), vendored **unmodified** under `vendor/scrollcraft/`, loaded on the home page only as a client script after hydration. Page-specific behaviour (evidence ledger, title-page planes) is our own code reading `--sc-p`. No other animation library | Native scroll, CSS sticky pins; see 04 §7 and the scroll-craft [BRIEF](../design/scrollcraft/builds/portfolio-home/BRIEF.md) |
| Fonts | `next/font` self-hosted: Newsreader (variable, OFL) + Geist Sans/Mono (OFL). No Google Fonts runtime request | CSP stays strict. Subset to Latin; preload the two main weights |
| Images | `next/image`, AVIF/WebP, explicit sizes | |
| Hosting | **Vercel** (Hobby to start; Pro only if demo traffic needs it) | Node.js 24 runtime (current default). Owner already uses Vercel. |
| Domain / DNS | Domain registered at **Porkbun** (D-15: `collinsnyagaka.com`); apex + `www` pointed at Vercel; `www` → apex 308 redirect | DNSSEC on. CAA record limiting issuers to Let's Encrypt (Vercel's issuer). |
| Analytics | Vercel Web Analytics + Speed Insights (cookieless) | No consent banner needed; no PII collected. |

## 3. Backend (demo functions only)

There is no application backend and no database in v1 (D-03). Server code exists only for demos and the optional
contact form. Each is an isolated Vercel Function.

| Function | Runtime | Purpose | Data it touches |
|---|---|---|---|
| `POST /api/demos/fraud/score` | **Python 3.13** Vercel Function | Score one transaction with the LightGBM fraud model, return probability, decision, top SHAP contributions, latency | Model artifact bundled read-only in the function. No storage. |
| `GET /api/demos/fraud/samples` | Same function (or static JSON) | Return 20 pre-selected test-split transactions (10 legit, 10 fraud), **each with its preceding window of 10 transactions** (`Time`, `Amount`) | Static JSON built from the public ULB dataset (already PCA-anonymised; CC BY-NC-SA 4.0 per the repo's `DATA_LICENSE`) |
| `GET /api/demos/mlsys/search?q=` | **Python 3.13** Vercel Function | BM25 search over the adapted *ML Systems* corpus using SQLite FTS5 (same index builder as `machine-learning-systems-plugin`) | Read-only SQLite file bundled in the function |
| `POST /api/contact` (P1) | Node.js 24 | Verify Turnstile, rate-limit, send one email via Resend | Nothing stored. Message goes to owner's inbox only. |

**Fraud model packaging (important):** the repo ships `models/optimized_lightgbm.pkl` and `preprocessor.pkl`.
Pickle files execute code when loaded (framework item 58, Insecure Deserialization). The demo **must not load
pickles**. Use the native LightGBM text model (`models/optimized_lightgbm.txt`, ~735 KB) with
`lightgbm.Booster(model_file=...)`, and export the preprocessor's parameters (scaler means/scales, feature order,
threshold, `init_score` and focal-loss flag from `optimal_threshold_v2.json`, amount-bin edges, and cluster
centroids for `cluster_0–2`) to a JSON file. SHAP values come from `booster.predict(X, pred_contrib=True)`, so the
`shap` package is not needed (smaller bundle, faster cold start).

**Fraud model scoring details:**
- The model uses 79 features, including **history features** (`amt_mean/std/min/max_{3,5,10}`, `amt_zscore_*`,
  `amt_cumsum`, `time_since_last`, `avg_time_diff`, `tx_count_10`, …). A single transaction can't produce them, so each
  demo sample carries its preceding window. The visitor edits only the target transaction, and the server recomputes
  window features from window + target.
- The model was trained with **focal loss**, a custom objective, so the booster returns raw margins.
  Probability = `sigmoid(raw_margin + init_score)`. `pred_contrib` gives per-feature contributions plus a bias column,
  in margin space, excluding `init_score`. The UI shows contributions in margin (log-odds) units and says so.
- The active threshold (`optimal_threshold_v2.json`, `active: "recall_target"`) is 0.03 at `HEAD`. Task 0.9 confirms
  which threshold produced the reported metrics before the site quotes them.

**Fraud data licence:** the repo's `DATA_LICENSE` states CC BY-NC-SA 4.0. The demo page credits the dataset (ULB
Machine Learning Group, via Kaggle), links the licence, and notes the rows were selected and reformatted.

**ML Systems corpus licence:** CC BY-NC-SA 4.0. The demo page shows attribution to V. J. Reddi, the licence, and a
link to the original; the site has no ads or paid features, so non-commercial terms hold. Re-check if that changes.

**Function region:** `fra1` (Frankfurt) for all functions: reasonable latency to Europe, Africa and the US East
coast. Content pages are served from Vercel's global CDN regardless.

## 4. Authentication and roles

None. The site has no sign-in. All pages are public. The only "privileged" actor is the owner, who publishes by
pushing to `main` on GitHub (GitHub account with 2FA and a passkey; branch protection on `main`).

## 5. External services and APIs

| Provider | Purpose | Limits / cost | Credentials owner | Env var |
|---|---|---|---|---|
| Vercel | Hosting, functions, analytics | Hobby free tier; set a **spend limit** if upgraded to Pro | Owner | — |
| Porkbun | Domain + DNS | ~US$12/yr | Owner | — (no API use from the site) |
| Upstash Redis (via Vercel Marketplace) | Rate limiting demos and contact form | Free tier 10k commands/day is ample | Owner | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (server only) |
| Cloudflare Turnstile (P1) | Bot check on contact form | Free | Owner | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (server only) |
| Resend (P1) | Send contact-form email to owner | Free tier 100/day | Owner | `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` (verified sender; server only) |
| GitHub | Source, CI, evidence links | Free | Owner | `GITHUB_TOKEN` in CI only (link checker), read-only |

No LLM provider is called in v1 (D-07, D-14). No secret is ever prefixed `NEXT_PUBLIC_` except the Turnstile site key,
which is public by design.

## 6. Architecture

```text
                      ┌─────────────────────────── Vercel ────────────────────────────┐
Visitor ── HTTPS ──►  │  CDN (static HTML/CSS/JS, images, CV PDF, OG images)          │
                      │      ▲ built at deploy from content/*.mdx + app/              │
                      │                                                               │
                      │  /api/demos/fraud/*  ──► Python fn (LightGBM .txt + JSON prep)│
                      │  /api/demos/mlsys/*  ──► Python fn (SQLite FTS5, read-only)   │
                      │  /api/contact (P1)   ──► Node fn ──► Turnstile, Resend        │
                      │        │                                                      │
                      │        └── rate limit ──► Upstash Redis (counters only)       │
                      └───────────────────────────────────────────────────────────────┘
GitHub (main) ── push ──► Vercel build (CI checks must pass first)
Live app links (outbound only): legalai-kenya.vercel.app, cropland-mapping.streamlit.app, tundotechsystems.com
```

Data moves one way: build-time content → static pages. Demo requests carry only the visitor's sample input; nothing
is persisted except rate-limit counters keyed by a salted hash of the IP (expire after 1 hour).

## 7. Security and privacy

Full detail in [07-SECURITY.md](07-SECURITY.md). Summary of the non-negotiables:

- Strict CSP with nonces or hashes; no `unsafe-inline` scripts; `frame-ancestors 'none'`.
- HSTS (2 years, `includeSubDomains`, `preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geolocation.
- Demo inputs validated against a strict schema (types, ranges, max body 4 KB); unknown fields rejected.
- Rate limits: fraud demo 30 requests / 10 min / IP; search 60 / 10 min / IP; contact 3 / hour / IP. Global daily cap per function as a cost backstop.
- No PII stored. Contact form content is emailed, not saved. Analytics are cookieless.
- Production source maps not public; no `.env*`, `.git`, or build artifacts served.
- Dependencies: lockfile committed, `npm audit` + `pip-audit` + gitleaks + CodeQL in CI; Dependabot weekly.
- Personal data shown on the site is limited to what the owner chooses (the phone number is **not** shown on the site; email is shown with light obfuscation).

## 8. Performance and reliability targets

| Target | Value |
|---|---|
| Lighthouse mobile (Home, case study) | Perf ≥ 95, A11y 100, BP 100, SEO 100 |
| Field LCP / INP / CLS (p75, real users; lab targets are in 01 AC-8) | ≤ 2.0 s / ≤ 200 ms / ≤ 0.05 |
| JS shipped on Home | ≤ 90 KB gzipped |
| Fraud demo latency | Model inference ≤ 10 ms (the repo measures 1.4 ms p95 in-process, single row, precomputed features; it is not end-to-end API latency); end-to-end ≤ 2 s p95 warm, ≤ 5 s cold |
| Search demo latency | ≤ 500 ms p95 warm |
| Availability | Static pages inherit Vercel CDN availability; demos may degrade — page shows a friendly fallback with a recorded result, never a blank or a stack trace |
| Backups | Git is the backup. CV PDF and media are in the repo (or Vercel Blob if > 10 MB total) |

## 9. Environments and delivery

| Env | URL | Trigger |
|---|---|---|
| Local | `http://localhost:3000` | `npm run dev` (Python functions via `vercel dev`) |
| Preview | Vercel preview URL per PR | Every PR; protected by Vercel Deployment Protection |
| Production | `https://collinsnyagaka.com` | Merge to `main` after CI passes |

Scroll verification (scroll-craft Step 5) runs on every PR touching the home page: `serve.mjs` + `shoot.mjs` at 1440 × 900, 390 × 844 and `--reduced-motion`, failing on dead scroll, cues that never reach full opacity, or contrast failures; contact sheets are uploaded as CI artifacts for human review.

CI (GitHub Actions) on every PR: typecheck, ESLint, Prettier check, unit tests (Vitest), Python tests (pytest) for
demo functions, content schema validation, internal + evidence link check, Playwright smoke tests, axe-core,
Lighthouse CI budgets, gitleaks, `npm audit --audit-level=high`, `pip-audit`. Branch protection requires all green.

Rollback: Vercel "Instant Rollback" to the previous production deployment.

## 10. Key technical decisions and trade-offs

| Decision | Reason | Alternative considered |
|---|---|---|
| Next.js over Astro | Owner already ships Next.js 16 (TundoTech, LegalAI front ends); hiring signal for full-stack AI roles; route handlers for demos in the same repo | Astro: lighter by default and excellent for static content, but a second framework to maintain |
| MDX in Git over a CMS/Supabase | Nothing to break or pay for; diffs are reviewable; old site failed because its backend did | Supabase CMS (old site), Sanity |
| Python functions on Vercel over a separate API host | One platform, one deploy; LightGBM model is < 1 MB; Vercel functions allow up to 5 GB packages | Hugging Face Space (owner has an account; free CPU, but cold starts of 30 s+ and a second deploy pipeline) |
| Native LightGBM `pred_contrib` over `shap` | No pickle, smaller bundle, same additive explanations for tree models | `shap.TreeExplainer` |
| No LLM demo in v1 | Cost exposure, prompt-injection surface, and hallucination on a hiring page | Retrieval-only LegalAI demo (revisit in v2 if LegalAI exposes a public, read-only, quota'd search API) |
| Vercel Web Analytics over PostHog/GA | Cookieless, no banner, enough for the PRD metrics | PostHog (richer funnels, needs consent handling) |
