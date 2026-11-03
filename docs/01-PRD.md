# 01 — Product Requirements Document (PRD)

**Product:** Collins Nyagaka — personal portfolio (v2)
**Owner:** Collins Nyatundo Nyagaka · **Version:** 0.2 · **Date:** 2026-11-03

## 1. Product name and one-sentence idea

**collinsnyagaka.com** — an evidence-first portfolio that lets a hiring manager decide in under two minutes that
Collins is a credible AI & ML engineer, by showing measured results, inspectable code and two live demos instead
of a skills list.

## 2. Target users

| Persona | Who | What they need | How long they stay |
|---|---|---|---|
| P1 Technical recruiter (primary) | Screens for remote AI/ML roles at international companies and Kenyan fintech/legaltech | Title, location/time zone, availability, key stack, CV, contact — in seconds | 30–90 s |
| P2 Hiring manager / senior engineer (primary) | Decides whether to interview | Depth: how problems were framed, evaluated and secured; real numbers with honest caveats; code to read | 3–10 min |
| P3 Freelance prospect (secondary) | Kenyan SME or founder | A short "work with me" route to TundoTech Systems | 30 s |
| P4 Peer / community (tertiary) | Other engineers from LinkedIn/GitHub | Notes and open-source repos | variable |

## 3. Problem and current workaround

Today the owner's public presence is inconsistent and partly broken (checked 2026-11-03):

- The current site (`collins-nyagaka-portfolio.vercel.app`) titles him **"Data Scientist"**, while the CV and LinkedIn
  use other titles. A recruiter comparing them sees three different people.
- The current site's project section shows **"Error loading projects. Please try again later."** (its Supabase backend
  no longer answers). The flagship work is invisible.
- It lists **101 skills** in a grid. Recruiters cannot tell depth from exposure.
- Strong evidence exists but is scattered: LegalAI Kenya's README has the best proof (37 cross-tenant probes, hit@10
  0.03 → 0.30, axe 0 violations, Lighthouse 100s), but no page tells that story.
- 8 older Vercel deployments (`V9`, `V11`, `portfolio`, `neratics`, …) compete in search results.

Workaround today: recruiters rely on the PDF CV and LinkedIn, which cannot show code, demos, or evaluation depth.

## 4. Goal and success measures

**Goal:** turn profile visits into interview conversations for AI & ML engineering roles.

| Metric | Target (90 days after launch) | How measured |
|---|---|---|
| CV downloads / unique visitors | ≥ 8% | Vercel Analytics custom event `cv_download` |
| Contact actions (email click, LinkedIn click, form submit) / unique visitors | ≥ 4% | Custom events |
| Case-study visitors who scroll to "Results" | ≥ 50% | Custom event `case_results_viewed` |
| Demo runs per week | ≥ 20 | Demo function logs |
| Lighthouse (mobile) on Home and one case study | ≥ 95 Performance, 100 Accessibility, 100 Best Practices, 100 SEO | Lighthouse CI |
| Broken links site-wide | 0 | Link checker in CI |
| Interview requests attributed to the site | ≥ 2 | Contact form `referral` field (05 §5) when the form ships; owner-reported until then |
| Ranking for "Collins Nyagaka" | Position 1 on Google | Search Console |

## 5. Core features

| ID | Feature | User benefit | Priority |
|---|---|---|---|
| F-01 | **Hero with positioning** — name, "AI & Machine Learning Engineer", Nairobi (EAT, UTC+3), availability status, 3 proof chips (e.g. "61k-passage legal RAG", "1.4 ms p95 fraud-model inference", "37/37 tenant-isolation probes") | Recruiter qualifies in 10 s | P0 |
| F-02 | **Primary actions** — Download CV (PDF), Email, LinkedIn, GitHub — visible on every page | Fast contact | P0 |
| F-03 | **Flagship case studies (max 5)** — Problem → Constraints → Approach → Evaluation → Results (with caveats) → Security → Limits → What I'd do next → Evidence links | Shows engineering judgement, not just output | P0 |
| F-04 | **Evidence links** — every metric carries a link (repo file, test, report) or a "private work" label | Credibility; matches D-05 | P0 |
| F-05 | **Project index** — short cards for secondary projects with filters (AI engineering, ML, data, web) | Breadth without clutter | P0 |
| F-06 | **Experience timeline** — roles from LinkedIn + CV, reconciled; includes all current roles (D-16); employer roles list generic duties only (D-20) | Answers "where has he worked" | P0 |
| F-07 | **Skills by evidence** — ~20 skills grouped in 4 groups, each linked to the case studies that use it | Replaces 101-skill grid | P0 |
| F-08 | **Demo: fraud-score explorer** — pick or edit a sample transaction, get fraud probability, decision at the tuned threshold, top SHAP contributions, and model latency | Hands-on proof of ML + serving | P0 |
| F-09 | **Demo: ML Systems reference search** — BM25 search over the adapted *Machine Learning Systems* chapters (same index as the MCP server), with attribution | Proof of retrieval/MCP work, zero LLM cost | P0 (D-08) |
| F-10 | **LegalAI Kenya walkthrough** — 90-second captioned video + link to the live app | Shows the strongest project without exposing a multi-tenant app | P0 |
| F-11 | **About** — short narrative, focus areas (fintech, legaltech, agritech), how I work, certifications | Human context | P0 |
| F-12 | **Contact page** — email, LinkedIn, time zone, availability, link to TundoTech for freelance; optional form | Conversion | P0 (form P1) |
| F-13 | **Notes** — 2+ short technical notes (e.g. "Why hit@10 went from 0.03 to 0.30", "Testing RLS with 37 attack probes") | Depth, SEO | P0 (D-22) |
| F-14 | **SEO & sharing** — per-page metadata, Open Graph images, JSON-LD `Person` + `CreativeWork`, sitemap, robots | Discoverability; LinkedIn previews look right | P0 |
| F-15 | **Dark / light theme** following system preference with manual toggle | Comfort, accessibility | P1 |
| F-16 | **Print-friendly / ATS-friendly CV page** (`/cv`) mirroring the PDF in HTML | Recruiters on mobile; parsers | P1 |
| F-17 | **Redirect old deployments** to the new domain | One canonical presence | P1 |

## 6. Out of scope for v1

- CMS, admin dashboard, database, user accounts (the old site's Supabase/TinyMCE admin is retired).
- "Chat with my portfolio" LLM assistant (D-14).
- Proxying LegalAI Kenya or ComplianceGuard as live demos (multi-tenant / heavy backends; shown by video and write-up).
- Comments, newsletter, blog search, i18n (English only).
- Freelance pricing, service packages (lives on TundoTech Systems).
- Testimonials section until at least 2 real testimonials exist (D-23).
- Unfinished projects (D-18) and work done for employers (D-20).

## 7. User stories

1. As a **recruiter**, I want to see title, location, time zone and availability above the fold, so I can decide whether to keep reading.
2. As a **recruiter**, I want to download a current CV in one click, so I can attach it to the candidate record.
3. As a **hiring manager**, I want each case study to state the evaluation method and caveats, so I can judge whether the numbers are honest.
4. As a **hiring manager**, I want to open the exact file or test that backs a claim, so I can verify it quickly.
5. As a **hiring manager**, I want to run the fraud model on a sample transaction, so I can see the model served, explained and fast.
6. As a **hiring manager**, I want to know which projects are private and why, so I don't mistake missing code for missing work.
7. As a **freelance prospect**, I want a clear route to TundoTech Systems, so I can request a quote.
8. As a **visitor on mobile in Nairobi on 3G**, I want pages to load fast, so I don't leave.
9. As a **screen-reader user**, I want every page and demo to be operable by keyboard and labelled, so I can use the site.
10. As **the owner**, I want to add a case study by adding one MDX file, so updates take minutes, not a deploy of a CMS.

## 8. Acceptance criteria

| Story | Given | When | Then |
|---|---|---|---|
| 1 | A 375 px wide phone | Home loads | Name, title, "Nairobi · UTC+3", availability badge and "Download CV" are visible without scrolling |
| 2 | Any page | Visitor clicks "Download CV" | `/cv/Collins_Nyagaka_CV.pdf` downloads (HTTP 200, `application/pdf`), and event `cv_download` is recorded |
| 3 | A case study page | Visitor reaches "Results" | Every number shows its dataset/split, metric definition and at least one stated limitation |
| 4 | A case study with a public repo | Visitor clicks an evidence link | Link resolves (HTTP 200) to a file or line in a public repo; CI fails the build if any evidence link 404s |
| 5 | Fraud demo page | Visitor submits a sample transaction | Response within 2 s (p95, warm) showing probability, decision, top 5 SHAP features and server latency; invalid input shows a field error, not a stack trace |
| 5b | Demo rate limit reached | Visitor submits again | HTTP 429 with a friendly message and retry time; no cost incurred |
| 6 | A private project card | Visitor views it | A "Private work" label and a "Request a walkthrough" link appear; no dead GitHub link |
| 7 | Contact page | Visitor clicks "Freelance or company work?" | Navigates to `tundotechsystems.com` in a new tab with `rel="noopener"` |
| 8 | Lab test: Lighthouse mobile, simulated slow 4G | Home and one case study run | Performance ≥ 95, lab LCP ≤ 2.5 s, lab CLS ≤ 0.1 (field targets are in 02 §8) |
| 9 | Keyboard only | Visitor tabs through Home and the fraud demo | Every interactive element is reachable, has a visible focus ring, and axe-core reports 0 violations |
| 10 | Owner adds `content/case-studies/new.mdx` with valid frontmatter | Pushes to `main` | Page builds and appears in the index; invalid frontmatter fails the build with a clear message |

## 9. Open questions

All planning questions were answered on 2026-11-03 and recorded in the [decision log](00-README.md#decision-log). Remaining owner follow-ups are tracked privately.
