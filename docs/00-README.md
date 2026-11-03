# Collins Nyagaka Portfolio — Build Documents

Planning documents written before any code, following the template "Six Documents Before Vibe Coding", plus a
security document. Read them in order. Give all of them to the coding agent together and ask it to flag
contradictions before it writes code.

| # | Document | What it answers |
|---|---|---|
| 01 | [PRD](01-PRD.md) | What we build, for whom, how success is measured |
| 02 | [TRD](02-TRD.md) | Stack, hosting, architecture, demos, security, performance, delivery |
| 03 | [App Flow](03-APP-FLOW.md) | Every page, journey, state and navigation rule |
| 04 | [UI/UX Brief](04-UI-UX-BRIEF.md) | Tone, palette, type, components, accessibility, banned patterns |
| 05 | [Content & Data Schema](05-CONTENT-SCHEMA.md) | MDX content models, demo API contracts, validation, retention (no database in v1) |
| 06 | [Implementation Plan](06-IMPLEMENTATION-PLAN.md) | Ordered milestones with inputs, outputs and done criteria |
| 07 | [Security](07-SECURITY.md) | Threat model and the 75-item Vibe Coder Security Framework mapped to this site |
| — | [Scroll-craft BRIEF](../design/scrollcraft/builds/portfolio-home/BRIEF.md) | Home-page scroll design: interview, feeling curve, peak, grammar, score, signature move |
| — | [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md) | Living agent instructions: current state, stack, commands, hard rules. Updated at every checkpoint |

**Published vs private.** This folder is public and has been trimmed. The project inventory (which repositories
appear and why), the review notes, the owner's open questions and the account checklist are kept privately in the
owner's working copy. They are git-ignored and never published.

**Status (2026-11-03):** Draft v0.3 (scroll-craft design added). No application code yet. Milestone 0 in progress: the contradiction review
and the secret scan of the fraud-detection repository are done.

## Sources used

| Source | What it gave |
|---|---|
| Owner's CV (PDF) | Headline, profile, skills, selected projects with metrics |
| LinkedIn `linkedin.com/in/collinsnyagaka001` | Current roles, certifications, project write-ups |
| GitHub `CollinsNyatundo` | Repository READMEs, deploy URLs, pinned repositories |
| Live URLs (HTTP checks) | Which deployments work today |
| *Vibe Coder Security Framework — 75 Common Vibe-Coded Web App Vulnerabilities* | The checklist mapped in 07 |
| *Six Documents Before Vibe Coding* | Document structure |

## Decision log

Numbers are stable. Some decisions are recorded here in general terms; the specifics stay private.

| ID | Decision | Made by | Date |
|---|---|---|---|
| D-01 | Primary audience is **hiring managers and technical recruiters** for remote/international AI & ML engineering roles. Freelance clients are secondary and are sent to TundoTech Systems. | Owner | 2026-11-03 |
| D-02 | Site lives on a **new personal domain** (see D-15). | Owner | 2026-11-03 |
| D-03 | v1 is **static content plus a small set of live, sandboxed demos**. No CMS, no admin, no database. | Owner | 2026-11-03 |
| D-04 | LinkedIn and CV are both sources of truth; contradictions between them are raised, not silently resolved. | Owner | 2026-11-03 |
| D-05 | **Evidence-first**: every claim on the site links to inspectable evidence (repo path, test, report, live URL) or is labelled as private work. | Proposed | 2026-11-03 |
| D-06 | Stack: Next.js (App Router, static generation) + MDX + TypeScript + Tailwind CSS on Vercel. | Proposed | 2026-11-03 |
| D-07 | Demos run as isolated Vercel Functions (Python for ML) behind rate limits and spend caps; no demo calls a paid LLM in v1. | Proposed | 2026-11-03 |
| D-08 | v1 demos: (1) fraud-score explorer, (2) ML Systems reference search. LegalAI Kenya is linked to its live app and shown with a recorded walkthrough, not proxied. | Proposed | 2026-11-03 |
| D-09 | Contact is email + LinkedIn + CV download; a contact form is P1 and ships only with Turnstile + rate limit. | Proposed | 2026-11-03 |
| D-10 | Analytics: Vercel Web Analytics (cookieless) + Speed Insights. No cookie banner needed. | Proposed | 2026-11-03 |
| D-11 | Headline: "AI & Machine Learning Engineer". | Proposed | 2026-11-03 |
| D-12 | New public repository `CollinsNyatundo/portfolio-v2`. The old portfolio stays up until cut-over, then redirects; its repo is archived. | Owner | 2026-11-03 |
| D-13 | Five flagship case studies, maximum. Quality over count; no skills-count grids. | Proposed | 2026-11-03 |
| D-14 | No "chat with my portfolio" AI assistant in v1 (cost, prompt-injection and hallucination risk outweigh the signal). Reconsider for v2 with the guardrails in 07. | Proposed | 2026-11-03 |
| D-15 | Domain `collinsnyagaka.com`. | Owner | 2026-11-03 |
| D-16 | The Experience timeline shows all current roles, including the FlyRank AI internship and the ICT Officer role; the CV is updated to match. | Owner | 2026-11-03 |
| D-17 | The fraud-detection repository is made public after a clean full-history secret scan. | Owner | 2026-11-03 |
| D-18 | Unfinished projects are not shown, as cards or as case studies. | Owner | 2026-11-03 |
| D-19 | Private repositories are shown as "Private work": architecture write-up, walkthrough video, "Request a walkthrough". No code links. | Owner | 2026-11-03 |
| D-20 | Work done for employers is not shown. Employer roles list generic duties only. | Owner | 2026-11-03 |
| D-21 | The site uses a real headshot. | Owner | 2026-11-03 |
| D-22 | **Notes ship in v1**: 2 technical notes at launch. | Owner | 2026-11-03 |
| D-23 | A Testimonials section appears only once 2 real recommendations exist, quoted with permission. | Owner | 2026-11-03 |
| D-24 | `docs/` is published in the public repository after trimming; private planning material stays out of Git. | Owner | 2026-11-03 |
| D-25 | The home page is designed with the **scroll-craft** method: chaptered editorial grammar, title-page hero, fraud demo as the single peak, zero video scrub, technical-drawing world on a paper ground. Brief: `design/scrollcraft/builds/portfolio-home/BRIEF.md`. | Owner (interview) | 2026-11-03 |
| D-26 | Signature move: the **evidence ledger**, a margin ledger of every real figure read, with sources, ending in the colophon with the visitor's own demo run. | Owner (interview) | 2026-11-03 |
| D-27 | One primary action label everywhere: "Email Collins". The CV is a secondary text link. Replaces the header button layout of D-09. | Proposed (scroll-craft taste floor) | 2026-11-03 |

## Glossary (one word per idea, in UI copy and in code)

| Term (UI) | Code name | Meaning | Do not say |
|---|---|---|---|
| Case study | `caseStudy` | A long-form page about one flagship project | project page, portfolio item |
| Project | `project` | A short card for a non-flagship project | work, item |
| Demo | `demo` | A live, interactive, sandboxed feature on this site | playground, sandbox (in UI) |
| Evidence | `evidence` | A link that proves a claim (repo path, test, report, URL) | proof, source (in UI) |
| Note | `note` | A short technical article | blog post, article |
| Private work | `visibility: "private"` | Real work whose code is not public | confidential, NDA (unless true) |
