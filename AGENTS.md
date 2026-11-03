# AGENTS.md — Collins Nyagaka Portfolio (v2)

Shared working memory for **every** coding agent in this repo: Claude Code, Codex, OpenCode, Cursor, Gemini and
others. It is a **living file**: it must change whenever the system changes (see
[How these files evolve](#how-these-files-evolve)). Keep it short. Put depth in `docs/`, and put a pointer here.

Agent-specific notes live in separate files that build on this one. `CLAUDE.md` imports this file and adds Claude
Code specifics. Add a file per agent only when an agent needs something the others don't.

## What this is

An evidence-first personal portfolio for Collins Nyagaka (AI & Machine Learning Engineer, Nairobi). Its main audience
is hiring managers and technical recruiters. It is a static MDX site with a few sandboxed live demos.
Domain: `collinsnyagaka.com` · Repo: `CollinsNyatundo/portfolio-v2` (to be created at M1).

## Source of truth

Read these before changing anything. If code and docs disagree, stop and ask; don't silently pick one.

| Need | Read |
|---|---|
| Decisions, open follow-ups, glossary | `docs/00-README.md` (decision log D-xx is canonical) |
| Scope, features, acceptance criteria | `docs/01-PRD.md` |
| Stack, architecture, demos, env vars | `docs/02-TRD.md` |
| Routes, journeys, UI states | `docs/03-APP-FLOW.md` |
| Tokens, type, components, banned patterns | `docs/04-UI-UX-BRIEF.md` |
| Content models, demo API contracts | `docs/05-CONTENT-SCHEMA.md` |
| Milestones and done criteria | `docs/06-IMPLEMENTATION-PLAN.md` |
| Security controls (75-item map) | `docs/07-SECURITY.md` |
| Which projects appear and what to fix | `private/planning/08-CONTENT-INVENTORY.md` (private) |
| Owner's open questions, full decision detail, review notes | `private/planning/` (private) |

## Current state  <!-- LIVING: update at every milestone checkpoint -->

- **Phase:** Milestone 0 in progress. Done: 0.1 (answers), 0.2 (contradiction review, 20 findings), 0.3 (gitleaks: 0 findings), 0.9 (fraud metric provenance). `docs/` trimmed for publishing (D-24).
- **Code:** none yet. Local git repo initialised; nothing pushed.
- **Waiting on owner:** tasks 0.4–0.8 and the open follow-ups (details in `private/planning/`); domain purchase at M6.
- **Then:** M1 scaffold (agent can start M1 before the owner tasks finish; none of them block it).
- **Last updated:** 2026-11-03

## Stack  <!-- LIVING: replace "planned" with exact versions once installed -->

Planned (verify current versions against official docs at M1, then pin them here):
Next.js 16.x App Router · TypeScript strict · MDX + Zod-validated content · Tailwind CSS v4 · Node.js 24 ·
Python 3.13 Vercel Functions for demos (LightGBM, SQLite FTS5) · Vercel hosting + Web Analytics ·
Upstash Redis (rate limits) · Cloudflare Turnstile + Resend (contact form) · Vitest, pytest, Playwright, axe, Lighthouse CI.

## Commands  <!-- LIVING: fill in at M1; every script in package.json must be listed -->

| Task | Command |
|---|---|
| Install | _TBD at M1_ |
| Dev server | _TBD_ |
| Typecheck / lint / format | _TBD_ |
| Unit tests (TS / Python) | _TBD_ |
| E2E + a11y | _TBD_ |
| Link + evidence check | _TBD_ |
| Build | _TBD_ |

## Layout  <!-- LIVING: update when top-level folders change -->

```
docs/            public planning documents (00–07), trimmed
private/         owner-only material, git-ignored, never commit:
  planning/      content inventory (08), full decision detail, review notes, account checklist
  *.md           CV edits, outreach drafts
.gitignore       ignores private/, .env*, .remember/, .vercel/
AGENTS.md        shared agent instructions (this file)
CLAUDE.md        imports AGENTS.md + Claude Code specifics
(at M1) app/ content/ components/ api/ scripts/ public/ tests/
```

## Hard rules (do not break without a new decision in docs/00-README.md)

1. **Evidence-first (D-05).** Every metric needs a dataset/split, a caveat, and an evidence link, or a "Private work" label. Never invent or round up numbers. Never call something "production-grade" unless real users run it.
2. **No database, CMS, admin or auth in v1 (D-03).** Content is MDX in Git.
3. **No LLM features in v1 (D-07, D-14).** Demos call no paid model.
4. **Never load pickle/joblib files** in demo code (07, item 58). Use the LightGBM `.txt` model plus JSON parameters.
5. **Secrets are server-only.** Only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` may be public. Never commit `.env*`, `.remember/`, `.vercel/` or `private/`.
6. **Excluded content:** only projects approved in the private content inventory may appear. No unfinished projects (D-18), no employer work (D-20), and no code, screenshots or data from private repos. Private repositories are shown as "Private work" (D-19).
7. **The owner approves before** any purchase (domain), any publishing (making a repo public, sending messages, LinkedIn changes), and any deletion of repos or Vercel projects.
8. **Accessibility and performance budgets are gates,** not goals: axe 0 violations, Lighthouse mobile ≥ 95/100/100/100 (02 §8).
9. **Respect the banned UI patterns** in 04 §10 (star fields, glassmorphism, purple AI gradients, skill bars…).
10. **Fraud demo specifics.** Window features need each sample's 10-transaction history; probability = `sigmoid(raw + init_score)` (focal loss); describe 1.4 ms as in-process model inference, never as API latency.
11. **Public repo hygiene (D-24).** Everything outside `private/` is public. Never write private repo names, employer details, CV issues or owner follow-ups into `docs/`, `AGENTS.md`, `CLAUDE.md`, code or commit messages; put them in `private/planning/`. `private/` exists only on the owner's machine; if it's missing, ask the owner.

## Conventions  <!-- LIVING: add a rule when a review finds a repeated mistake -->

- Semantic commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Branch, then PR; never push to `main`.
- Use the glossary terms from `docs/00-README.md` in UI copy and code (case study, project, demo, evidence, note).
- Copy: plain English, active voice, short sentences, numbers with their context. No "passionate", "cutting-edge" or "leveraging".
- Check current official docs for a library or framework before writing code against its API.
- Windows host: PowerShell is primary and Git Bash is available. Use forward slashes in scripts.

## Shared agent memory

The cross-agent vault is at `C:\Users\COLLINS\agent-memory`, project `projects/portfolio/`. At session start, read
`STATE.md` and the last 3 entries of `log.md`. At session end, **append** a handoff to `log.md` (never overwrite it),
refresh `STATE.md`, then commit and push. Never store secrets there.

## How these files evolve

`AGENTS.md` (shared) and the agent-specific files (`CLAUDE.md`, …) must track reality. Update them **in the same
change** that causes any of these triggers:

| Trigger | File | Section |
|---|---|---|
| Milestone checkpoint passed or phase changes | AGENTS.md | Current state |
| Dependency added, removed or upgraded (major) | AGENTS.md | Stack (exact versions) |
| `package.json` / `pyproject.toml` script added or changed | AGENTS.md | Commands |
| New top-level folder or a moved entry point | AGENTS.md | Layout |
| New decision D-xx that constrains code | AGENTS.md | Hard rules (cite the D-number) |
| Review or bug shows a repeated mistake by any agent | AGENTS.md | Conventions (one line with the reason) |
| A doc in `docs/` is added, renamed or retired | AGENTS.md | Source of truth |
| Owner answers a follow-up (F-xx) | AGENTS.md + `docs/00-README.md` | Current state, decision log |
| A tool, skill, MCP server, hook or setting only one agent uses | That agent's file (e.g. CLAUDE.md) | Its own sections |
| A new agent needs its own instructions | New `<AGENT>.md` that points to AGENTS.md | Layout table here |

Rules for editing them:
- **Shared facts go in AGENTS.md only.** Agent files hold only what is specific to that agent. Never copy shared content into them.
- Keep AGENTS.md under ~170 lines. If a section grows past ~15 lines, move the detail to `docs/` and leave a link.
- Only state facts that are true now. Delete stale lines; don't mark them "old".
- Before finishing any task, check the triggers table. If one fired, update the right file and add a changelog line to it.
- Write in plain English (no compressed or "caveman" style). Humans and every agent read these files.

## Changelog  <!-- append newest last; one line per change, signed with the agent name -->

- 2026-11-03 — Created as the shared living instructions file after planning docs v0.2 (Claude Code).
- 2026-11-03 — M0 progress: state, layout (`private/`, `.gitignore`), hard rules 5 and 10 updated after the contradiction review (Claude Code).
- 2026-11-03 — Trimmed for the public repo (D-24): private material moved to `private/planning/`; hard rules 6 and 11 added or changed (Claude Code).
