# 05 — Content & Data Schema

**Version:** 0.3 · **Date:** 2026-11-03 · Depends on: [02-TRD](02-TRD.md), [03-APP-FLOW](03-APP-FLOW.md)

The template calls this "Backend Schema". v1 has **no database** (D-03), so this document defines the stored data
that does exist: typed content files in Git, demo request/response contracts, and the only server-side state
(rate-limit counters).

## 1. Entities

| Entity | Stored as | Represents |
|---|---|---|
| `site` | `content/site.ts` | Name, title, location, time zone, availability, links, CV path |
| `caseStudy` | `content/case-studies/<slug>.mdx` | One flagship project, long form (max 5 published) |
| `project` | `content/projects.ts` (array) | A secondary project card |
| `demo` | `content/demos.ts` (array) | A live demo's metadata and status |
| `experience` | `content/experience.ts` (array) | One role |
| `certification` | `content/certifications.ts` (array) | One certificate or degree |
| `note` | `content/notes/<slug>.mdx` | A technical article (P1) |
| `evidence` | Inline in `caseStudy` frontmatter | A link backing a claim |
| `rateLimitCounter` | Upstash Redis key | Requests per hashed IP per window |

## 2. Content models (Zod, validated at build)

### `site`

| Field | Type | Required | Rule / default |
|---|---|---|---|
| `name` | string | yes | "Collins Nyagaka" |
| `fullName` | string | yes | "Collins Nyatundo Nyagaka" (used in JSON-LD) |
| `title` | string | yes | "AI & Machine Learning Engineer" (D-11) |
| `location` | string | yes | "Nairobi, Kenya" |
| `timeZone` | IANA string | yes | "Africa/Nairobi" |
| `availability` | enum `open` \| `selective` \| `closed` | yes | `open` |
| `availabilityNote` | string ≤ 80 | no | e.g. "Open to remote AI/ML engineering roles" |
| `email` | email | yes | `cnyagakan@gmail.com` (rendered obfuscated) |
| `links` | `{ linkedin, github, company }` URLs | yes | LinkedIn, GitHub, `https://tundotechsystems.com` |
| `cvPath` | string starting `/cv/` ending `.pdf` | yes | File must exist in `public/` (build check) |
| `showPhone` | boolean | yes | `false` |

### `caseStudy` (frontmatter)

| Field | Type | Required | Rule / default |
|---|---|---|---|
| `slug` | kebab-case string | yes | Unique; matches filename |
| `title` | string ≤ 60 | yes | |
| `outcome` | string ≤ 140 | yes | One sentence with a number |
| `role` | string | yes | e.g. "Sole engineer", "Team lead (4)" |
| `period` | `{ start: YYYY-MM, end: YYYY-MM \| "present" }` | yes | |
| `domain` | enum `fintech` \| `legaltech` \| `agritech` \| `ai-infra` \| `ml` | yes | |
| `tags` | string[] 1–6 from allow-list | yes | Allow-list in `content/tags.ts` |
| `stack` | string[] ≤ 12 | yes | |
| `visibility` | enum `public` \| `private` \| `partial` | yes | `private` ⇒ `repoUrl` must be absent |
| `repoUrl` | URL (github.com/CollinsNyatundo/*) | if public | CI checks HTTP 200 unauthenticated |
| `liveUrl` | URL | no | CI checks reachable; may be flagged `sleeps: true` |
| `demo` | demo slug | no | Must exist in `demos.ts` |
| `video` | `{ src, captions, poster }` | no | Captions required if video present |
| `headlineMetric` | `{ label, value, context }` | yes | Shown on card |
| `metrics` | `{ name, value, dataset, caveat?, ledger?: boolean, ledgerLabel?: string ≤ 32 }[]` | yes (≥ 1) | `dataset` required — no context-free numbers. `ledger: true` puts the figure in the evidence ledger (signature move); its source is the matching `evidence` entry |
| `evidence` | `{ label, url \| null, private: boolean }[]` | yes (≥ 2) | `url` null only when `private: true` |
| `limits` | string[] ≥ 1 | yes | What is not done |
| `featured` | boolean | no | `false`; max 3 featured (build check) |
| `order` | integer | yes | Display order |
| `published` | boolean | yes | Unpublished files are excluded from build output |
| `updated` | date | yes | |

Body sections (MDX headings, checked by a lint script): `## Problem`, `## Constraints`, `## Approach`,
`## Evaluation`, `## Results`, `## Security`, `## Limits`, `## What I'd do next`.

### `project`

`slug`, `title` (≤ 60), `summary` (≤ 140), `tags[]`, `visibility`, `repoUrl?`, `liveUrl?`, `sleeps?`, `year`, `archived?`.

### `demo`

`slug`, `title`, `summary`, `endpoint` (relative path), `status` enum `live` \| `degraded` \| `offline`,
`caseStudy` slug, `modelCard` `{ data, split, metrics[], limits[] }`, `recordedExample` (path to static JSON).

### `experience`

`org`, `role`, `type` enum `full-time` \| `internship` \| `contract` \| `freelance`, `start` YYYY-MM, `end` YYYY-MM \|
"present", `location`, `remote` boolean, `bullets` string[] 1–4, `visible` boolean.
Initial data (from LinkedIn + CV, 2026-11-03; all visible per D-16; employer roles use generic duties per D-20):

| Org | Role | Period | Type |
|---|---|---|---|
| FlyRank AI | Backend AI Engineer (Intern) | 2026-10 – present | internship, remote |
| Office of the Director of Public Prosecutions (ODPP) | ICT Officer | 2026-07 – present | full-time, on-site |
| Independent | AI & ML Engineer (freelance/contract) | 2022-05 – present | freelance, remote |
| Lish AI Labs | Data Scientist | 2024-09 – 2025-02 | full-time, remote |
| Bloom Hospital Nakuru | IT Technician (Intern) | 2024-10 – 2024-11 | internship |
| TELUS International | Quality Analyst | 2022-10 – 2022-12 | contract, remote |
| Kenya Revenue Authority | Intern, audit | 2022-05 – 2022-07 | internship |

The independent role's title must match on the CV, LinkedIn and the site (task 0.5 in 06).

### `certification`

`name`, `issuer`, `issued` YYYY-MM, `credentialUrl?`, `kind` enum `degree` \| `certificate`. Initial list: BBIT, JKUAT
(2023-12); Data Science, Moringa School (2025); Data Engineering, Sankhyana (2025-04); IBM Data Science Professional
Certificate (2024-07); Complete AI & ML Bootcamp, Zero To Mastery (2024-05); Python Data Wrangling, Great Learning
(2025-01). Lower-signal items (job simulations, short courses) stay on LinkedIn only.

### `note`

`slug`, `title`, `summary` (≤ 160), `published` date, `updated?`, `tags[]`, `caseStudy?`, `draft` boolean.

## 3. Relationships

- `caseStudy 1 — 0..1 demo` (by slug), `demo 1 — 1 caseStudy`.
- `caseStudy 1 — n evidence` (embedded).
- `note n — 0..1 caseStudy`.
- `tag n — n caseStudy/project` (allow-listed strings).
All references are checked at build: a dangling slug fails the build.

## 4. Ownership, authentication, authorisation

Single owner. All content is public once `published: true`. Write access = push to `main` on GitHub, guarded by
branch protection and required CI. No runtime authentication. Demo endpoints are anonymous and read-only.

## 5. Demo API contracts

### `GET /api/demos/fraud/samples`

`200` → `{ samples: { id: string, label: "legit" | "fraud", window: { Time: number, Amount: number }[10], target: Record<RawFeature, number> }[], attribution: { dataset, licence, url } }` (20 items). `RawFeature` = `Time`, `V1`–`V28`, `Amount`.
Static, cacheable (`Cache-Control: public, max-age=86400`).

### `POST /api/demos/fraud/score`

Request (`Content-Type: application/json`, max 4 KB):

| Field | Type | Rule |
|---|---|---|
| `features.Time` | number | 0 ≤ x ≤ 172 800 (seconds in the 2-day dataset window) |
| `features.V1` … `features.V28` | number | Finite; −100 ≤ x ≤ 100 (PCA components; the dataset's observed range sits well inside this) |
| `features.Amount` | number | 0 ≤ x ≤ 30 000 |
| (any other key) | — | **Rejected** (`additionalProperties: false`) |

The request also carries `sampleId` (must match a served sample; its window is loaded server-side, never sent by the
client). The server derives all 79 model features exactly as the training pipeline did, from the stored window plus
the submitted target (feature order from `models/feature_list.json`). The client never sends engineered features or
window data.

Response `200`:
```json
{
  "probability": 0.913,
  "threshold": "<from optimal_threshold_v2.json>",
  "decision": "flag",
  "topContributions": [{ "feature": "V14", "logOdds": 1.82, "direction": "fraud" }],
  "modelVersion": "lgbm-optimized-2026-06",
  "latencyMs": { "model": 1.2, "total": 4.8 }
}
```
Errors: `400 { error: "validation", fields: { "features.Amount": "must be ≤ 30000" } }`, `413` body too large,
`415` wrong content type, `429 { error: "rate_limited", retryAfterSeconds }`, `500 { error: "internal" }` (no stack
trace, no model path).
`topContributions` has exactly 5 items, sorted by absolute contribution, in log-odds (margin) units.
`probability` = `sigmoid(raw_margin + init_score)` (focal-loss model). The threshold, `init_score` and model version
come from `optimal_threshold_v2.json` and the model file. Task 0.9 confirms which threshold produced the repo's
reported metrics (F1 0.80, precision 0.87, recall 0.75 on the time-ordered holdout) before any are quoted.

### `GET /api/demos/mlsys/search?q=<text>&limit=<1..10>`

`q`: 3–200 chars after trimming; FTS5 operators (`" * ^ : ( ) NEAR AND OR NOT`) stripped and the query passed as
**bound parameters** (never string-concatenated into SQL). `limit` default 10.
Response `200`: `{ results: { chapter, section, snippet, url, score }[], attribution: { author, title, licence, url } }`.
Errors as above.

### `POST /api/contact` (P1)

Request: `name` (1–100), `email` (≤ 254, RFC 5322), `topic` (allow-list: `role`, `contract`, `walkthrough:<slug>`,
`general`), `message` (20–2000), `referral` (optional enum: `linkedin`, `github`, `search`, `cv`, `referral`, `other`), `turnstileToken`, `company` (honeypot, must be empty).
Response `200 { ok: true }`; errors `400`, `403` (Turnstile failed), `429`, `500`. Email to owner is plain text; user
input is never rendered as HTML.

## 6. Data validation (summary)

- All content: Zod at build; CI fails on violations.
- All demo/contact input: schema validation server-side (Pydantic for Python, Zod for Node). Client validation is UX only.
- Strings: trimmed, length-limited, control characters stripped; output escaped by React/Jinja-free JSON.
- URLs in content: must be `https://`; external hosts from an allow-list (`github.com`, `*.vercel.app`, `*.streamlit.app`, `tundotechsystems.com`, `huggingface.co`, `linkedin.com`, `zindi.africa`).

## 7. Server-side state, retention and deletion

| Data | Where | Retention |
|---|---|---|
| Rate-limit counters | Upstash Redis, key `rl:<route>:<sha256(ip + daily salt)>` | TTL = window (≤ 1 h). No raw IPs stored. |
| Contact messages | Not stored; emailed to owner | Owner's mailbox policy |
| Demo inputs | Not stored; not logged (log only status code, latency, model version) | — |
| Analytics | Vercel Web Analytics (aggregated, cookieless) | Vercel's retention |
| Function logs | Vercel runtime logs | Vercel's default (short) |

## 8. Migration and seed data

- **Seed:** initial `site.ts`, `experience.ts`, `certifications.ts` from the tables above; case studies drafted from
  repo READMEs and the CV, following the owner's private content inventory.
- **From the old site:** nothing is migrated automatically. The old Supabase project (projects/blog tables) is read
  once for any article worth keeping, then left to the owner to pause or delete (owner decision; not done by agents).
- **Change process:** edit content → PR → preview deploy → CI green → merge. Schema changes bump a `contentSchemaVersion`
  constant and update this document.
