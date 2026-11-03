# 03 — App Flow

**Version:** 0.2 · **Date:** 2026-11-03 · Depends on: [01-PRD](01-PRD.md), [02-TRD](02-TRD.md)

## 1. Entry points

| Entry | Lands on | Notes |
|---|---|---|
| CV PDF links (header + project URLs) | `/` and `/work/<slug>` | CV project URLs should point to case studies on this site, with the repo linked from there |
| LinkedIn "Website" field and Featured section | `/` | Add `?ref=linkedin` (no PII) to measure source |
| GitHub profile README + `websiteUrl` | `/` | GitHub `websiteUrl` currently points to `tundotechsystems.com`; change to `https://collinsnyagaka.com` |
| Google search "Collins Nyagaka" | `/` | JSON-LD `Person` with `sameAs` LinkedIn/GitHub |
| Shared case-study link (LinkedIn post, email) | `/work/<slug>` | Must stand alone: header, summary and CTAs on every page |
| Old domains (`collins-nyagaka-portfolio.vercel.app` etc.) | 308 → matching page on new domain | F-17 |

## 2. Screen inventory

| Route | Screen | Purpose | Data required |
|---|---|---|---|
| `/` | Home | Qualify in 10 s, route to depth | `site.ts` (name, title, location, availability, links), featured case studies, top 3 proof metrics |
| `/work` | Work index | All case studies + project cards, filterable | `caseStudies[]`, `projects[]` |
| `/work/[slug]` | Case study | Depth and evidence for one flagship project | One `caseStudy` MDX |
| `/demos` | Demos index | List live demos and their status | `demos[]` |
| `/demos/fraud` | Fraud-score explorer | Run the model | `/api/demos/fraud/samples`, `/api/demos/fraud/score` |
| `/demos/ml-systems-search` | ML Systems search | Query the corpus | `/api/demos/mlsys/search` |
| `/about` | About | Story, focus, how I work, experience timeline, certifications, education | `about.mdx`, `experience[]`, `certifications[]` |
| `/notes` | Notes index | List technical notes | `notes[]` (hidden from nav if fewer than 2) |
| `/notes/[slug]` | Note | Article | One `note` MDX |
| `/cv` | CV (HTML) (P1) | ATS-friendly HTML CV + PDF download | `cv.ts` |
| `/contact` | Contact | Email, LinkedIn, availability, time zone, freelance route, optional form | `site.ts` |
| `/uses` (optional, v2) | Tools I use | Personality / SEO | — |
| `404` | Not found | Recover | Links to Home, Work, Contact |
| `500` / demo error | Error | Recover gracefully | — |

Global chrome on every page: header (name → `/`, Work, Demos, About, Notes*, Contact, theme toggle, "Download CV"
button), footer (email, LinkedIn, GitHub, "Last updated <build date>", licence of content, link to source repo).
*Notes appears only when ≥ 2 notes exist.

## 3. Primary journeys

**J1 — Recruiter qualifies (target: < 60 s)**
`/` → reads hero (title, location, availability, proof chips) → clicks **Download CV** → PDF downloads → (optional)
clicks **Email** → mail client opens with subject "Opportunity for Collins Nyagaka".
Success state: `cv_download` or `email_click` event recorded.

**J2 — Hiring manager goes deep (target: 3–10 min)**
`/` → "Selected work" card **LegalAI Kenya** → `/work/legalai-kenya` → reads Problem / Approach / Evaluation →
clicks an evidence link (opens GitHub in new tab, or "Private work — request a walkthrough") → watches the 90 s video →
returns, scrolls to "Next case study" → `/work/creditcard-fraud` → **Try the live demo** → `/demos/fraud` → runs a
sample → reads SHAP output → **Contact** → `/contact`.
Success state: `demo_run` + contact action.

**J3 — Freelance prospect**
`/` or `/contact` → "Need this for your business?" → `https://tundotechsystems.com` (new tab).

## 4. Alternate journeys

| Journey | Path |
|---|---|
| Skip to content | First Tab on any page shows "Skip to main content" link |
| Filter projects | `/work` → filter chip "ML" → list updates in place; URL becomes `/work?tag=ml` (shareable, back button restores) |
| Edit a demo sample | `/demos/fraud` → choose sample (its 10-transaction history is shown read-only) → toggle "Edit values" → change the target transaction's `Amount` or `V*` values → Score again |
| Reset demo | "Reset" restores the selected sample's original values and clears results |
| Leave demo mid-request | Navigating away aborts the fetch (`AbortController`); no error shown |
| Private project | Project card shows "Private work" → "Request a walkthrough" → `/contact?topic=<slug>` with the topic pre-selected |
| Print case study | Browser print → print stylesheet hides nav and demo widgets, shows evidence URLs in full |

## 5. Actions — trigger, validation, loading, success, error, next

| Action | Trigger | Validation | Loading | Success | Error | Next |
|---|---|---|---|---|---|---|
| Download CV | Button (header, hero, `/cv`) | — | — | Browser downloads PDF; event fired | 404 impossible (CI checks file exists) | Stay |
| Email | `mailto:` link | — | — | Mail client opens | If no mail client, a "Copy email" button sits next to it; copied → toast "Email copied" | Stay |
| Theme toggle | Button | — | — | Theme switches, saved to `localStorage` (try/catch) | Storage blocked → still switches for the session | Stay |
| Filter work | Chip click | Tag must be in the known list, else ignored | — | List filtered, URL updated | Unknown `?tag=` → shows all + no error | Stay |
| Load fraud samples | Page load | Response schema check | Skeleton list (3 rows) | 20 samples listed | "Samples unavailable — showing a recorded example" + static result | Stay |
| Score transaction | "Score" button or Enter | Client: the target transaction's 30 fields numeric and in range (see 05); the history window can't be edited; server re-validates | Button shows spinner + "Scoring…", disabled; results area `aria-busy="true"` | Probability gauge, decision badge (Flag / Allow at threshold), top 5 SHAP bars, "Model 1.2 ms · total 340 ms" | 400 → inline field errors · 429 → "Demo limit reached, try again in N min" · 5xx/timeout (8 s) → "Demo is waking up or unavailable" + recorded example | Stay |
| Search ML Systems | Submit (debounced 300 ms if typing, min 3 chars) | 3–200 chars, stripped of FTS operators | Skeleton results | Up to 10 results: chapter, section, snippet with highlight, link | 0 results → "No matches. Try: 'quantization', 'data drift'" · 429/5xx as above | Result link opens chapter source (attributed) |
| Contact form submit (P1) | Submit | Name 1–100, email RFC-valid ≤ 254, topic from list, message 20–2000, Turnstile token present | Button spinner, fields disabled | "Thanks — I reply within 2 working days (EAT)." Form cleared | Field errors inline; 429 "Too many messages"; 5xx "Couldn't send — email me directly at …" | Stay |
| Request a walkthrough | Link on private card | — | — | `/contact?topic=<slug>` with topic pre-filled (allow-listed slugs only) | Unknown topic → "General" | Contact |

## 6. Navigation rules

- Header nav is identical on every page; current section has `aria-current="page"`.
- Mobile (< 768 px): nav collapses to a menu button opening a full-height sheet; focus is trapped inside; Esc closes and returns focus to the button.
- External links open in a new tab only for: GitHub evidence, live apps, TundoTech. They carry an "opens in new tab" icon + `sr-only` text and `rel="noopener noreferrer"`.
- Back button always works: filters and demo sample selection live in the URL (`?tag=`, `?sample=`), not in hidden state.
- Deep links: every case-study heading has an anchor (`#evaluation`, `#security`) with a copy-link button.
- Case studies end with "Previous / Next case study" and a CTA block (CV, Email).
- No infinite scroll; no modal on page load; no exit-intent pop-ups.

## 7. Empty and blocked states

| State | Where | Behaviour |
|---|---|---|
| No notes yet | Nav, Home | Notes link and section hidden (no "coming soon") |
| Demo offline / cold | Demo pages | Friendly message + a **recorded** example result (static JSON) so the page still teaches something |
| Rate limited | Demos, contact | Clear wait time; no retry storm (button disabled until time passes) |
| JavaScript disabled | Demos | `<noscript>` explanation + recorded example; all content pages unaffected |
| Slow network | All | Static HTML renders first; images lazy-load below the fold; demo shows spinner after 300 ms only |
| Live app sleeping (Streamlit cropland app returns 303 to an auth/wake page on 2026-11-03) | Project card | Label "May take ~30 s to wake" and link to a screenshot/video fallback |

## 8. First-use journey

There is no account. "First use" is a first visit: no splash, no cookie banner (cookieless analytics), no
newsletter prompt. The hero is the onboarding. Demos show a one-line "What this does" and a pre-selected sample so the
first click produces a result.
