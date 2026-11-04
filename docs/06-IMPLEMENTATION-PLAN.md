# 06 — Implementation Plan

**Version:** 0.3 · **Date:** 2026-11-03 · Depends on: 01–05, 07, 08

Rule for every milestone: **before moving on, run the site, verify that milestone's acceptance criteria, and record
any unresolved issue** in the private review notes (`private/planning/reviews/`, git-ignored) and in the shared agent memory (`agent-memory/projects/portfolio/`).
Also at every checkpoint: walk the trigger table in `AGENTS.md` ("How these files evolve") and update `AGENTS.md`
and `CLAUDE.md` (Current state, Stack, Commands, Layout, Hard rules, Conventions) in the same PR.

Owners: **O** = Collins (owner), **A** = coding agent (Claude Code / Codex), **O+A** = agent drafts, owner approves.

## Milestone 0 — Decisions and evidence fixes (before code)

| # | Task | Owner | Inputs | Output | Definition of done | Depends on |
|---|---|---|---|---|---|---|
| 0.1 | **Done 2026-11-03** Answer the planning questions (D-12, D-15–D-24) | O | 00-README | Decision log updated | Every question has an answer or accepted default | — |
| 0.2 | **Done 2026-11-03** Run all docs through a contradiction review | A | docs/ | Private review notes (20 findings, all fixed or scheduled) | Every finding fixed or logged as accepted | 0.1 |
| 0.3 | **Done 2026-11-03 (0 findings)** Secret scan `creditcard-fraud` full history (gitleaks) before making it public | A | repo | Report in the private review notes | 0 findings, or findings rotated + history cleaned | — |
| 0.4 | **Done 2026-11-04** Make `creditcard-fraud` public (D-17) | O | 0.3 | Public repo | CV link returns 200 when logged out | 0.3 |
| 0.5 | **CV done 2026-11-04** (roles added, latency and feature-count lines corrected; LinkedIn edits still the owner's) Reconcile CV ↔ LinkedIn titles and roles | O | D-16 | Updated CV PDF + LinkedIn | Same title, same roles, same dates on both | 0.1 |
| 0.6 | Draft LinkedIn recommendation requests (2–3 people) for the owner to send (D-23). **Private drafts ready** | O+A | Owner's list of people | Drafts | Owner has sent them | — |
| 0.7 | **Done 2026-11-04** Owner supplies headshot (D-21); re-encoded to 1200 px with no metadata | O | — | `public/images/collins.jpg` (square, ≥ 800 px) | File in repo | — |
| 0.8 | Owner account hardening (private checklist, see 07 §6) | O | 07 §6 | Checked list | Every box ticked | — |
| 0.9 | **Done 2026-11-03** Confirm which threshold produced the fraud repo's reported metrics, and the F1 target that `f1_target_met: false` refers to | A | `creditcard-fraud` repo | Private review notes | Threshold, target and script named | 0.3 |

## Milestone 1 — Project setup

| # | Task | Owner | Output | Definition of done |
|---|---|---|---|---|
| 1.1 | **Done 2026-11-03** `git init` in `D:\portfolio`; create public repo `CollinsNyatundo/portfolio-v2` (D-12); branch protection on `main` | O+A | Repo | Push works; direct pushes to `main` blocked |
| 1.2 | **Done 2026-11-03** Scaffold Next.js 16 (App Router, TS strict, ESLint, Prettier, Tailwind v4) — confirm versions with `ctx7` first | A | App skeleton | `npm run build` passes; Node 24 pinned in `engines` and `.nvmrc` |
| 1.3 | **Done 2026-11-03** Tooling: Vitest, Playwright, axe, Lighthouse CI, gitleaks pre-commit (husky), `.gitignore` incl. `.env*`, `.remember/`, `.vercel/` | A | Configs | Each script runs locally and in CI |
| 1.4 | **Done 2026-11-03** GitHub Actions CI (all checks listed in 02 §9) | A | `.github/workflows/ci.yml` | Green on an empty app |
| 1.5 | Vercel project linked; preview deploys on PR; Deployment Protection on previews | O+A | Vercel project | PR shows preview URL |
| 1.6 | **Done 2026-11-03** Security headers in `next.config.ts` + per-request nonce CSP in `proxy.ts` (07 §4, D-28) | A | Config + test | `curl -I` shows all headers; Playwright test asserts them |
| 1.7 | **Done 2026-11-03** Design tokens (04 §4, `--sc-*` aliases), Newsreader + Geist fonts, base layout (folio, colophon, skip link, theme toggle); vendor the scroll-craft engine unmodified | A | Layout | Renders at 320/768/1280 px; axe 0 violations; engine files byte-identical to the plugin's |

**Checkpoint M1:** empty but production-shaped site deploys to a preview URL with headers, CI and a11y green.

## Milestone 2 — Content layer

| # | Task | Owner | Output | Definition of done |
|---|---|---|---|---|
| 2.1 | **Done 2026-11-04** Content schemas (05 §2) with Zod + content loader | A | `content/schema.ts` | Invalid fixture fails build with readable error |
| 2.2 | **Done 2026-11-04** Seed `site`, `experience`, `certifications`, `projects`, `demos` | A | `content/*.ts` | Matches 05 tables + D-16, D-20 |
| 2.3 | **Done 2026-11-04** Evidence + link checker script (unauthenticated HEAD/GET, allow-list) | A | `scripts/check-links.ts` | Fails on any 404; runs in CI nightly and on PR |
| 2.4 | **Done 2026-11-04** Section-heading lint for case studies | A | Script | Missing `## Limits` fails build |

## Milestone 3 — Core journey (J1, J2)

Order follows dependencies: pages that others link to first.

| # | Task | Owner | Output | Definition of done |
|---|---|---|---|---|
| 3.1 | **Done 2026-11-04 (Act IV and the intertitle appear when the demo ships, M4)** Home, chaptered editorial per the scroll-craft BRIEF score (title page with depth planes, Problem, Method, Work spreads, intertitle, Demo stage placeholder, Colophon) | A | `/` | PRD AC-1, AC-2, AC-11 pass |
| 3.1b | **Done 2026-11-04** **Evidence ledger** (signature move): `data-ledger` figures register as they pass the reading line; mobile strip; colophon table with totals; reduced-motion and screen-reader versions | A | Component + tests | PRD AC-12 passes; unit tests prove no figure outside the evidence data can render |
| 3.2 | **Done 2026-11-04** Case-study template + MDX components (metric table, evidence pill, callouts, diagram) | A | `/work/[slug]` | Renders a fixture with every component |
| 3.3 | Write case study: **LegalAI Kenya** | O+A | MDX | Owner approves wording; every metric has dataset + caveat; evidence links pass |
| 3.4 | **Done 2026-11-04 (owner approved wording)** Write case study: **Real-time credit-card fraud** | O+A | MDX | Same; metrics quoted from a clean-clone re-run; latency described as in-process model inference; the F1 > 0.85 target stated as missed |
| 3.5 | Write case study: **ComplianceGuard AML/KYC** | O+A | MDX | Same; "pre-pilot, not run on real infrastructure" stated |
| 3.6 | Work index with filters | A | `/work` | `?tag=` works with back button |
| 3.7 | About + experience timeline + certifications | O+A | `/about` | Owner approves narrative |
| 3.8 | Contact page (no form yet) | A | `/contact` | Copy-email works; freelance link to TundoTech |
| 3.9 | CV PDF in `public/cv/` + download event | O+A | PDF | AC-2 |
| 3.10 | SEO: metadata, `next/og` images, JSON-LD, sitemap, robots | A | — | Rich-results test passes; LinkedIn Post Inspector preview correct |

**Checkpoint M3:** J1 and J2 (without demo) work end to end on preview.

## Milestone 4 — Demos and secondary features

| # | Task | Owner | Output | Definition of done |
|---|---|---|---|---|
| 4.1 | Export fraud preprocessor params, amount-bin edges, cluster centroids, threshold and `init_score` to JSON; reimplement window features; verify probabilities equal the repo pipeline on 1 000 test rows (max abs diff < 1e-9) | A | `demos/fraud/prep.json`, parity test | pytest green |
| 4.2 | Python function `/api/demos/fraud/score` (no pickle; `pred_contrib`), Pydantic validation, rate limit | A | Function | Contract tests for 200/400/413/415/429; p95 warm < 2 s on preview |
| 4.3 | Samples endpoint (each with its 10-transaction window) + recorded example JSON + dataset attribution | A | Static JSON | 20 samples, label-balanced; licence credit shown |
| 4.4 | Fraud demo UI (03 §5 states), also mounted as the pinned Act IV peak on the home page; writes the visitor's run to the ledger | A | `/demos/fraud` + home Act IV | Keyboard-only run works; axe 0; Act IV has the largest span on the contact sheet |
| 4.5 | ML Systems search function (FTS5, bound params) + UI + attribution | A | `/demos/ml-systems-search` | Injection test strings return 200/empty, never 500 |
| 4.6 | Case studies 4–5: **Production AI Reference Template**, **GEO-AI Cropland Mapping** | O+A | MDX | Same rules as 3.3 |
| 4.7 | LegalAI walkthrough video (demo tenant only — no client data on screen) + captions | O | MP4 + VTT | Captions accurate; no PII visible |
| 4.8 | Contact form (Turnstile, honeypot, rate limit, Resend) — P1 | A | `/api/contact` | 07 checks for items 15, 17, 45, 50 pass |
| 4.9 | Notes (2) — P0 (D-22) | O+A | MDX | Both published at launch |
| 4.10 | `/cv` HTML page — P1 | A | Page | Print preview fits 2 pages |

## Milestone 5 — Quality

| # | Task | Owner | Definition of done |
|---|---|---|---|
| 5.1 | Run the 07 checklist end to end; record evidence per applicable item | A | Every "Applies" row has a passing test or a written verification |
| 5.2 | DAST scan of preview (HawkScan / OWASP ZAP baseline) | A | No High/Critical findings |
| 5.3 | Lighthouse CI budgets + real-device check (mid-range Android on 4G and an iPhone over `serve.mjs --lan`, stopped afterwards) | A | 02 §8 targets met |
| 5.3b | Scroll-craft Step 5: harness at desktop, 390 × 844 and reduced motion; read `sheet.png`; **feel check** (scroll cold, one word per act, diff against the BRIEF curve; fix the page, not the brief) | A + O | Report in the build folder; peak reads as the peak; ending resolves |
| 5.4 | Accessibility: axe on all routes + manual keyboard + NVDA pass on Home, case study, fraud demo | O+A | 0 violations; manual issues fixed |
| 5.5 | Copy edit (plain English, numbers with context, no banned words from 04 §1) | O+A | Owner sign-off |
| 5.6 | Cross-check CV, LinkedIn, site, GitHub README for consistency | O | Same title, roles, metrics everywhere |

## Milestone 6 — Release

| # | Task | Owner | Definition of done |
|---|---|---|---|
| 6.1 | Buy domain `collinsnyagaka.com` (D-15) at Porkbun — **owner approves the purchase** | O | Domain registered, auto-renew on, WHOIS privacy on |
| 6.2 | DNS → Vercel, DNSSEC, CAA; HTTPS issued; `www` → apex | O+A | SSL Labs A+; HSTS header present |
| 6.3 | Production deploy; smoke tests against prod | A | Playwright smoke green on prod URL |
| 6.4 | Redirect old deployments (`collins-nyagaka-portfolio.vercel.app`, `portfolio-collins-nyagakas-projects.vercel.app`, `v9-theta`, `v11-two`) via `vercel.ts` redirects in those projects, or retire them | O+A | Each returns 308 to the new domain (or 404 if retired) |
| 6.5 | Update LinkedIn website + Featured, GitHub profile `websiteUrl` + README, CV header link | O | All point to the new domain |
| 6.6 | Search Console + Bing Webmaster verification, submit sitemap | O | Sitemap accepted |
| 6.7 | Monitoring: Vercel uptime check on `/` and demo health routes; spend limit / alerts; weekly link-check cron | O+A | Alert reaches owner email in a test |
| 6.8 | Rollback rehearsal: promote previous deployment and back | A | Done in < 2 min |
| 6.8b | Append the build's row to `design/scrollcraft/FINGERPRINTS.md` (all six dimensions + world) | A | Row present |
| 6.9 | Retro + update docs, `AGENTS.md` and `CLAUDE.md` to "as built"; vault handoff | A | `log.md` entry; docs version 1.0; AGENTS.md Commands table has no _TBD_ |

## Indicative timeline (part-time, ~10 h/week)

| Week | Milestones |
|---|---|
| 1 | M0, M1 |
| 2 | M2, M3.1–3.4 |
| 3 | M3.5–3.10 |
| 4 | M4.1–4.5 |
| 5 | M4.6–4.10, M5 |
| 6 | M6 launch |
