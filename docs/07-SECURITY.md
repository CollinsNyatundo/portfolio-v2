# 07 — Security

**Version:** 1.0 · **Date:** 2026-11-05 · Source framework: *Vibe Coder Security Framework — 75 Common Vibe-Coded
Web App Vulnerabilities*.

The framework's own warning applies here: an LLM review is not proof. Every "Applies" item below needs a test or a
recorded manual verification before launch (06, task 5.1).

## 1. Assets

| Asset | Why it matters |
|---|---|
| Owner's reputation | A defaced, phishing-capable or broken portfolio harms job applications directly |
| Domain and DNS | Takeover = impersonation, email spoofing |
| Vercel, GitHub, Porkbun, Upstash, Resend accounts | Control of the site and its secrets |
| Secrets (`UPSTASH_*`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`) | Abuse = cost, spam sent as the owner |
| Demo compute budget | Abuse = bills or a paused project |
| Visitor trust / privacy | Contact-form submissions, analytics |
| Linked private repos | Must not be exposed by mistake (e.g. a private repo URL or code pasted into MDX) |

## 2. Trust boundaries

1. Browser ↔ Vercel CDN (public, static).
2. Browser ↔ demo/contact functions (untrusted input crosses here).
3. Functions ↔ Upstash / Resend / Turnstile (server secrets).
4. GitHub ↔ Vercel build (supply chain: dependencies, CI, Actions).
5. Owner ↔ registrar/hosting dashboards (account security).

## 3. Threat model (STRIDE, short)

| Threat | Example | Main control |
|---|---|---|
| Spoofing | Look-alike domain; DNS hijack; email spoofing from the domain | DNSSEC, registrar lock, 2FA everywhere, SPF/DMARC `p=reject` even if no mail is sent |
| Tampering | Malicious dependency changes build output; PR from fork alters CI | Lockfile, `npm ci`, pinned Actions by SHA, no secrets on fork PRs, branch protection |
| Repudiation | — (no user actions to dispute) | Git history is the audit log |
| Information disclosure | Secrets in client bundle; source maps; stack traces; private repo names/code in content | Server-only env vars, gitleaks, no public source maps, generic errors, content review |
| Denial of service / cost | Script hammers fraud demo; huge request bodies; heavy search queries | Rate limits, body limit 4 KB, global daily caps, timeouts, Vercel spend limit; optional Vercel BotID on demos; Turnstile on the contact form only |
| Elevation of privilege | Pickle model file executes code; SQL/FTS injection in search | No pickle loading; bound parameters; read-only SQLite opened with `mode=ro` |

## 4. Required HTTP security headers

As built at M1 (`lib/security-headers.ts`, `proxy.ts`; decision D-28). The CSP is set **per request** with a fresh
nonce, because Next.js emits inline bootstrap scripts that a static strict policy blocks. That was tested: SRI alone
left 13 inline scripts blocked and the page never hydrated.

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{n}' 'strict-dynamic';
  style-src-elem 'self' 'nonce-{n}'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:;
  font-src 'self'; connect-src 'self'; media-src 'self'; frame-src 'none'; worker-src 'self';
  manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
  upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
X-Frame-Options: DENY
```

- No `'unsafe-inline'` for scripts or style elements in production. `next dev` adds `'unsafe-eval'` and inline styles only in development.
- `style-src-attr 'unsafe-inline'` permits `style=""` attributes, which React and the scroll engine use for custom properties. Attributes can't load resources or run script.
- Hosts are added only when a feature needs them, for example `https://challenges.cloudflare.com` in `script-src` and `frame-src` when the Turnstile contact form ships (M4.8), with a test.
- Unit tests (`tests/unit/security-headers.test.ts`) and end-to-end tests (`tests/e2e/shell.spec.ts`) check the exact directives, a fresh nonce per response, and zero CSP violations at runtime.

## 5. The 75 items mapped to this site

**Legend:** **A** = applies (must have a control + verification) · **R** = reduced (applies in a narrow form) ·
**N/A** = does not apply in v1 because the feature does not exist; re-check if the feature is added.

| # | Item | Sev | Status | Control on this site | Verification |
|---|---|---|---|---|---|
| 01 | IDOR/BOLA | H | N/A | No user-owned objects | Re-check if accounts are added |
| 02 | Broken function-level authz | C | R | No admin routes exist; build has no `/admin` | Route inventory test: only listed routes respond |
| 03 | Missing auth on sensitive endpoints | C | R | All endpoints intentionally public and read-only; documented list in 02 §3 | Route inventory test |
| 04 | Privilege escalation | C | N/A | No roles | — |
| 05 | Direct DB access from client | C | N/A | No database; no Supabase client | Grep CI: no DB client package in bundle |
| 06 | Secrets in frontend | C | A | Only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is public | CI greps `.next/static` for key patterns; gitleaks |
| 07 | Hard-coded secrets | C | A | Env vars only; `.env*` git-ignored | gitleaks pre-commit + CI |
| 08 | SQL injection | C | A | FTS5 search uses bound parameters; operators stripped | pytest with payloads (`' OR 1=1--`, `"*"`, `NEAR(`) → 200, no error |
| 09 | NoSQL injection | H | N/A | Redis keys built from hashes only | — |
| 10 | OS command injection | C | A | No `subprocess`/`exec` in functions | Semgrep rule in CI |
| 11 | Server-side template injection | C | N/A | No server templates; JSON only | — |
| 12 | Stored XSS | H | R | Content is owner-authored MDX; no user content is stored | MDX: no raw HTML from external sources |
| 13 | Reflected XSS | H | A | `?tag=`, `?topic=`, `?q=` rendered via React (escaped); unknown values ignored | Playwright with `<script>` payloads |
| 14 | DOM XSS | H | A | No `dangerouslySetInnerHTML` except vetted MDX; search snippet highlight built from text nodes, not HTML | ESLint `react/no-danger`; test |
| 15 | CSRF | H | R | Contact POST: same-origin check (`Origin` header) + Turnstile; no cookies/sessions | Test cross-origin POST → 403 |
| 16 | Weak password storage | C | N/A | No passwords | — |
| 17 | Weak password policy / credential abuse | M | N/A | No sign-in | — |
| 18 | Missing MFA for sensitive accounts | H | A | **Owner accounts**: GitHub, Vercel, Porkbun, Upstash, Resend, Cloudflare, Google — all with passkey/TOTP | 07 §6 checklist (06 task 0.8) |
| 19 | Session fixation | H | N/A | No sessions | — |
| 20 | Session hijacking | H | N/A | No sessions | — |
| 21 | JWT signature errors | C | N/A | No JWTs | — |
| 22 | JWT claims trusted | H | N/A | — | — |
| 23 | OAuth redirect URI | H | N/A | — | — |
| 24 | OAuth state/PKCE | H | N/A | — | — |
| 25 | Account enumeration | M | N/A | — | — |
| 26 | Brute-force protection | H | R | Rate limits on all functions | Load test hits 429 at the limit |
| 27 | Password reset tokens | C | N/A | — | — |
| 28 | Email verification bypass | H | N/A | — | — |
| 29 | "Remember me" tokens | H | N/A | — | — |
| 30 | Insecure cookies | H | R | Site sets no cookies (theme in `localStorage`) | Playwright asserts no `Set-Cookie` from our origin |
| 31 | CORS misconfiguration | H | A | No CORS headers on `/api/*` (same-origin only) | `curl -H "Origin: https://evil.test"` → no `Access-Control-Allow-Origin` |
| 32 | Missing/weak CSP | M | A | §4: per-request nonce, `'strict-dynamic'`, no inline script | Unit + e2e header tests, runtime zero-violation test |
| 33 | Clickjacking | M | A | `frame-ancestors 'none'` | Header test |
| 34 | Open redirect | M | A | Redirects only in config with fixed targets; no `?next=` parameters | Route inventory |
| 35 | SSRF | C | A | No function fetches a user-supplied URL; outbound hosts fixed (Turnstile, Resend, Upstash) | Code review + Semgrep |
| 36 | Path traversal | H | A | No file paths from input; model/index paths are constants | Semgrep |
| 37 | Local file inclusion | H | A | Same as 36 | — |
| 38 | Unrestricted file upload | C | N/A | No uploads | — |
| 39 | Upload content-type confusion | H | N/A | — | — |
| 40 | Public storage / file permissions | H | R | Only `public/` is public; no Blob store in v1 | Check build output contains no `.env`, `models/*.pkl` |
| 41 | Mass assignment | H | A | Pydantic/Zod with `extra="forbid"` / `.strict()` | Test unknown field → 400 |
| 42 | Parameter tampering | H | A | `limit` clamped 1–10; threshold is server-side, not a request field | Test `limit=10000` → clamped |
| 43 | Business logic abuse | H | R | Demo cannot be used to probe anything but a public-dataset model | Model card states this |
| 44 | Race condition / double submit | H | R | Contact button disabled during submit; rate limit atomic (`INCR` + `EXPIRE`) | Test double click → one email |
| 45 | Missing rate limiting | H | A | Per-IP + global daily caps (02 §7) | Load test |
| 46 | Resource exhaustion | H | A | Body ≤ 4 KB; `q` ≤ 200 chars; function timeout 10 s; memory 1024 MB | Tests for 413 and long `q` |
| 47 | GraphQL complexity | H | N/A | No GraphQL | — |
| 48 | Excessive data exposure | H | A | Responses return only documented fields; no model internals or paths | Contract tests on exact keys |
| 49 | Sensitive data in URLs | H | A | No PII in query strings; contact uses POST; `?ref=` carries source only | Review |
| 50 | Sensitive data in logs | H | A | Log status, route, latency, model version only; never request bodies, emails or IPs | Log review on preview |
| 51 | Verbose errors | M | A | Generic `{error:"internal"}`; stack traces only in local dev | Test forced exception → generic body |
| 52 | Debug mode in production | H | A | `NODE_ENV=production`; no debug flags in Python fn | Check prod response headers/bodies |
| 53 | Misconfigured headers | M | A | §4 | securityheaders.com grade A+ |
| 54 | TLS misconfiguration | H | A | Vercel-managed TLS, HSTS preload, CAA record | SSL Labs A+ |
| 55 | Weak crypto | H | R | Only SHA-256 for IP hashing with a daily random salt | Review |
| 56 | Insecure randomness | H | R | Salt and CSP nonce from `crypto.randomUUID()` / `secrets` | Review |
| 57 | Improper certificate validation | H | A | Default TLS verification on all outbound calls; no `verify=False` | Semgrep |
| 58 | **Insecure deserialization** | C | **A** | **Never load `.pkl`**; LightGBM `.txt` + JSON params only (02 §3) | CI fails if `pickle`/`joblib.load` appears in `api/` |
| 59 | Prototype pollution | H | R | No deep-merge of user JSON; Zod parses into new objects | ESLint + review |
| 60 | Vulnerable dependencies | H | A | `npm audit`, `pip-audit`, Dependabot weekly | CI gate (high+) |
| 61 | Malicious/compromised dependency | C | A | Minimal deps; the scroll-craft engine is vendored unmodified (MIT) and served from our origin, never a CDN; lockfiles; `npm ci --ignore-scripts` where possible; review new deps; Actions pinned by SHA | PR checklist |
| 62 | Dependency confusion | H | R | Public registry only; no internal package names | — |
| 63 | Exposed source maps / build artifacts | M | A | `productionBrowserSourceMaps: false` | Test `*.js.map` → 404 in prod |
| 64 | Exposed `.env`, `.git`, backups | C | A | Not in `public/`; Vercel serves only build output | Test `/.env`, `/.git/config` → 404 |
| 65 | Service-role key exposure | C | A | Upstash token server-only; no Supabase service keys in this project at all | gitleaks + bundle grep |
| 66 | RLS misconfiguration | C | N/A | No database | — |
| 67 | Multi-tenant isolation | C | N/A | Single-tenant static site (LegalAI's isolation is described, not exposed) | — |
| 68 | Webhook signature missing | C | N/A | No webhooks | — |
| 69 | Webhook replay | H | N/A | — | — |
| 70 | Payment amount tampering | C | N/A | No payments | — |
| 71 | Payment entitlement logic | C | N/A | — | — |
| 72 | Insecure API key auth | H | N/A | Demos are anonymous by design | — |
| 73 | Missing scope checks | H | N/A | — | — |
| 74 | AI/LLM tool authorisation | C | N/A in v1 | No LLM (D-14). **If an assistant is added:** read-only tools over public content only, no tools with side effects, server-enforced quotas | Re-assess before any LLM feature |
| 75 | Prompt injection → unsafe tool use | H | N/A in v1 | Same as 74; treat retrieved content as data; no secrets or private repo content in context | Re-assess |

**Summary:** 45 items apply (A) or apply in reduced form (R); 30 are N/A in v1 because the feature does not exist.
The highest-risk applicable items for this specific site are **58 (pickle loading)**, **45/46 (cost abuse of demos)**,
**06/07/65 (secrets)**, **61 (supply chain)** and **18 (owner account MFA)**.

## 6. Owner account hardening

Every owner account that can change the site, its domain or its secrets uses a passkey or TOTP, has unused
tokens removed, and has spend alerts where offered. The detailed checklist is kept privately (task 0.8).

## 7. Content-safety rules (unique to a portfolio)

- No code, screenshots or data from private repos or employers (D-19, D-20).
- Walkthrough videos use demo tenants and synthetic data only; blur nothing — just don't show real data.
- Datasets shown on the site (fraud demo rows, ML Systems text) carry attribution and licence links. Both are CC BY-NC-SA 4.0, so the site stays non-commercial (no ads, no paid features).
- Phone number not published (scraping/spam); email lightly obfuscated.
- Old Vercel projects that are retired must be deleted or protected so stale, unpatched apps don't sit under the owner's name.

## 8. Incident response (lightweight)

| Event | Action |
|---|---|
| Secret leaked | Rotate at provider immediately → redeploy → purge from history if committed → note in vault log |
| Demo abused / cost spike | Set demo `status: "offline"` (static fallback shows), tighten limits, redeploy |
| Site defaced / bad deploy | Vercel Instant Rollback to last good deployment; then investigate the commit |
| Domain/DNS hijack | Registrar support + lock; DNSSEC keys; notify LinkedIn/GitHub followers via post |

## 9. Verification record (task 5.1, 2026-11-05)

Every item marked A or R in §5, with the check that proves it. "Smoke" means `tests/smoke/security.spec.ts` or
`tests/smoke/prod.spec.ts`, run against the live site (`npm run smoke`, and every 6 hours by
`.github/workflows/smoke.yml`). "Unit" and "e2e" are the suites in `tests/unit` and `tests/e2e`; "pytest" is
`tests/python`. N/A items stay N/A while the site has no accounts, database, payments or LLM features.

| # | Check | Result |
|---|---|---|
| 02, 03 | Smoke: unknown API routes return 404/405; only `samples`, `score`, `search` and `contact` answer | Pass |
| 06, 65 | Smoke: shipped JavaScript scanned for key patterns; gitleaks on every commit and in CI | Pass |
| 07 | gitleaks pre-commit hook and full-history CI scan | Pass |
| 08 | pytest: SQL and FTS5 payloads (`'; DROP`, `NEAR(`, `*`, `' OR ''='`) return 200 or 400, never 500; the index survives | Pass |
| 10, 35, 36, 57 | Semgrep (`p/python`, `p/typescript`, `p/secrets`) over `app`, `components`, `lib`, `api`, `scripts`; no shell calls with input; the only outbound fetches go to fixed hosts | See scan note below |
| 12 | Content is MDX compiled at build time from this repository only (D-29); no external HTML is rendered | Pass (review) |
| 13 | Smoke: `<script>` payloads in `?tag=`, `?topic=`, `?sample=` never reach the page or run | Pass |
| 14 | One `dangerouslySetInnerHTML`: the JSON-LD data block, built from static site data with `<` escaped (unit test) | Pass |
| 15 | Unit: cross-origin and missing-origin POSTs to `/api/contact` get 403 | Pass |
| 18 | Owner account hardening checklist (§6) | Owner |
| 26, 45 | Unit and pytest: 3 per hour (contact), 30 per 10 min (score), 60 per 10 min (search), then 429 with `Retry-After` | Pass |
| 30 | Smoke: pages and functions set no cookies | Pass |
| 31 | Smoke: a foreign `Origin` gets no `Access-Control-Allow-Origin` | Pass |
| 32 | Unit (CSP builder), e2e (no CSP violations on every page), smoke (live `'strict-dynamic'`, no `'unsafe-inline'` for scripts) | Pass |
| 33, 53 | Smoke: `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS two years with preload, `nosniff`, referrer and permissions policies, no `X-Powered-By` | Pass |
| 34 | Smoke: `?next=`, `?redirect=`, `?url=` never redirect off-site | Pass |
| 40 | `.vercelignore` keeps `private/`, env files and tests out of uploads; pytest: no `.pkl` under `api/_data`; smoke: `/api/_data/fraud/prep.json` returns 404 | Pass |
| 41, 48 | pytest and unit: unknown fields return 400 naming the field; contract tests pin the exact response keys | Pass |
| 42, 46 | pytest and smoke: `limit` outside 1–10 and queries over 200 characters return 400; bodies over 4 KB (score) and 8 KB (contact) return 413 | Pass |
| 43 | The fraud demo's model card states the dataset's limits | Pass (review) |
| 44 | Unit: the rate limit counts atomically (one Redis `MULTI`); the contact button is disabled while sending | Pass |
| 49 | No personal data in URLs: `?topic=` carries an allow-listed slug only | Pass (review) |
| 50 | Functions log only their own exceptions, never request bodies or queries; request logging is off | Pass (review) |
| 51 | pytest and smoke: forced errors return `{"error":"internal"}` with no trace or path | Pass |
| 52 | Smoke: the 404 page shows no stack or dev-server banner | Pass |
| 54 | TLS 1.0 and 1.1 refused, 1.2 and 1.3 accepted (`openssl s_client`, 2026-11-05); Let's Encrypt certificate; CAA allows only `letsencrypt.org`; DNSSEC validates | Pass |
| 55, 56 | IPs are hashed with SHA-256 and a random daily salt before they reach Redis; nonces and salts come from `crypto.randomUUID()` / `secrets` (unit and pytest check no raw IP is sent) | Pass |
| 58 | pytest: no `pickle` or `joblib` anywhere in `api/`, no `.pkl` files; the model is a LightGBM text file read in pure Python | Pass |
| 59 | ESLint in CI; no object merging of request bodies (strict schemas) | Pass (review) |
| 60 | `npm audit --audit-level=high` in CI: 0; Python functions depend on numpy only | Pass |
| 61, 62 | Pinned versions, lockfile, SHA-pinned GitHub Actions; no private package names | Pass (review) |
| 63, 64 | Smoke: no `.map` files, `/.env`, `/.git/config` or `/private/` served | Pass |

DAST (task 5.2): an OWASP ZAP baseline scan of the live domain triggered Vercel's bot protection, which then
challenged the scanner's own requests, so the scan was repeated against the same production build served locally.
See the scan note below.
