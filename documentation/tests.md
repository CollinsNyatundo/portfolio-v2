# Verification Coverage Map

Tracks which documented rules are pinned by existing repo tests, which are proposed, and remaining gaps ranked by exposure.

## 1. Existing Coverage (In Repo Today)

| Use-Case / Rule | Expected Behavior (incl. Deny Case) | Evidence Source | Status | CI Merge Gate |
|---|---|---|---|---|
| Rate limiter Upstash error handling (`S1`) | HTTP 200 `/multi-exec` per-command error never fails open (`NaN > limit`); assistant budget fails closed | `lib/rate-limit.ts`, `tests/unit/rate-limit.test.ts` | Existing (`unit`) | Yes (`npm run check`) |
| Assistant admission atomicity | Kill switch, concurrency cap, budget and slot TTL run in one Lua `EVAL`; leaked slots expire after an outage; a counter can't expire mid-admission; the JS test mirror matches the real Lua | `lib/rate-limit.ts`, `tests/unit/assistant-concurrency-recovery.test.ts`, `tests/support/upstash-admission.ts`, `scripts/check-admission-lua.ts` | New (`unit`; Lua parity by hand) | Unit yes; Lua parity `npm run check:admission-lua` with local Redis |
| Rate limiter mixed-window local eviction (`S2`) | 10-min burst check never evicts active 24-h daily counters | `lib/rate-limit.ts`, `tests/unit/rate-limit.test.ts` | Existing (`unit`) | Yes (`npm run check`) |
| Assistant kill switch, concurrency, UTC micro-USD cap | Redis `kill="1"`, `> 5` concurrent, or budget cap returns `allowed: false` without charging budget or calling LLM | `lib/rate-limit.ts`, `tests/unit/rate-limit.test.ts`, `tests/unit/assistant-route.test.ts` | Existing (`unit/integration`) | Yes (`npm run check`) |
| AST public-content projection & private repo/phone isolation | Unpublished studies, draft notes, `visible:false` roles, archived projects, private `repoUrl`/evidence URLs and phone numbers excluded | `scripts/build-assistant-corpus.ts`, `tests/unit/assistant-corpus.test.ts` | Existing (`unit`) | Yes (`npm run check`) |
| Offline scope gate, BM25F Recall >= 0.95 & D-05 limits coupling | 56 golden & counterexample cases pass deterministic scope + packed Recall >= 0.95 + FactUnit caveat coupling | `tests/eval/assistant/golden-queries.json`, `tests/unit/assistant-eval.test.ts` | Existing (`unit/eval`) | Yes (`npm run check`) |
| Deterministic verifier anti-XSS/em-dash/hallucination | Unpacked IDs, HTML/XSS, `javascript:`, URLs, em dashes, banned buzzwords, secrets and phone patterns reject to `retrieval_only` | `lib/assistant/verifier.ts`, `tests/unit/assistant-eval.test.ts` | Existing (`unit`) | Yes (`npm run check`) |
| `/api/assistant` HTTP boundary, SSRF & zero-PII logging | `503` disabled, `403` Origin/`Sec-Fetch-Site`, `415`, `413` streaming body, `400` strict schema, `429` burst/day, `redirect: "error"`, 64 KB response cap, clean logs | `app/api/assistant/route.ts`, `tests/unit/assistant-route.test.ts` | Existing (`integration`) | Yes (`npm run check`) |
| Site copy rules, CSP nonces, fraud Python parity, contact form | Zero em dashes/banned words, fresh CSP nonce, LightGBM parity `< 1e-9`, FTS5 SQLi rejection, contact Turnstile/Resend checks | `tests/unit/*.test.ts`, `tests/python/*.py`, `tests/e2e/*.spec.ts` | Existing (`unit` + `pytest` + `e2e`) | Yes |

## 2. Verification Added / Running in M7.5–M7.6

| Use-Case / Rule | Expected Behavior | Test Type & Target File | Target Gate |
|---|---|---|---|
| Built bundle secret & JS size budget | Zero LLM/Redis/Turnstile secret prefixes in `.next/static/**`; launcher <= 3 KB gz; Home initial JS <= 90 KB gz | Automated build scan (`scripts/check-assistant-bundle.ts`) | CI gate (`npm run check:bundle`) |
| Disabled-mode production E2E | No `[data-assistant-ui]` rendered; `POST /api/assistant` returns `503` | Automated Playwright (`tests/e2e/assistant.spec.ts`) | CI gate (`npm run e2e`) |
| Enabled-mode E2E, a11y, CSP, ledger & print | No-JS absence; lazy drawer chunk loaded only on click; 0 CSP violations; 0 axe violations (320/768/1280, light/dark, closed/open); Evidence Ledger non-collision; `/cv` <= 2-page print | Automated Playwright + loopback stub (`tests/e2e/assistant-enabled.spec.ts`) | CI gate (`npm run e2e:assistant-enabled`) |
| Lighthouse mobile budgets | Performance >= 95, Accessibility 100, Best Practices 100, SEO 100 on Home | Automated Lighthouse (`lighthouserc.json`) | CI gate (`npm run lhci`) |
| Live OpenRouter golden faithfulness & latency | Verified structured output, >= 95% factual faithfulness, warm p50 <= 1.8s / p95 <= 3.5s | Guarded manual live eval (`npm run eval:assistant`) | Pre-release M7.6 |

## 3. Known Gaps (Ranked by Exposure)

| Rank | Gap | Exposure | Mitigation / Next Check |
|---|---|---|---|
| 1 | Live production Redis kill-switch rehearsal pending Upstash linking on Vercel | Paid LLM shutoff unverified against live Vercel + Upstash until owner links Redis | Required in M7.7 preview staging before production `ASSISTANT_MODE=live` |
| 2 | Mobile browser matrix (iOS Safari / Firefox / Samsung Internet) beyond Chromium | `playwright.config.ts` executes Chromium only; iOS software keyboard + `dvh` dialog fit relies on standards + CSS `dvh`/`safe-area` | Manual real-device check by owner before M7.7 |
| 3 | Semantic prose fidelity beyond structural citation & Fact Card checks | LLM prose could still paraphrase nuance imperfectly between `[N]` links; Fact Cards and `notice` surface verbatim caveats directly | Guarded live eval (`npm run eval:assistant`) + 30-day owner transcript/metrics review |
