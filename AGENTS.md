# AGENTS.md — Collins Nyagaka Portfolio (v2)

Shared working memory for **every** coding agent in this repo: Claude Code, Codex, OpenCode, Cursor, Gemini and
others. It is a **living file**: it must change whenever the system changes (see
[How these files evolve](#how-these-files-evolve)). Keep it short. Put depth in `docs/`, and put a pointer here.

Agent-specific notes live in separate files that build on this one. `CLAUDE.md` imports this file and adds Claude
Code specifics. Add a file per agent only when an agent needs something the others don't.

## What this is

An evidence-first personal portfolio for Collins Nyagaka (AI & Machine Learning Engineer, Nairobi). Its main audience
is hiring managers and technical recruiters. It is a static MDX site with a few sandboxed live demos.
Domain: `collinsnyagaka.com` · Repo: [`CollinsNyatundo/portfolio-v2`](https://github.com/CollinsNyatundo/portfolio-v2) (public).

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
| Home-page scroll design (grammar, score, ledger, world, tokens) | `design/scrollcraft/builds/portfolio-home/BRIEF.md` (scroll-craft) |
| Which projects appear and what to fix | `private/planning/08-CONTENT-INVENTORY.md` (private) |
| Owner's open questions, full decision detail, review notes | `private/planning/` (private) |

## Current state  <!-- LIVING: update at every milestone checkpoint -->

- **Phase:** M3 in progress. Merged: 3.1 home chapters and 3.1b evidence ledger, 3.2 template, 3.3 LegalAI Kenya, 3.4 fraud and 3.5 ComplianceGuard case studies. 3.6 `/work`, 3.7 `/about`, 3.8 `/contact`. Branch `feat/m3-cv-seo`: 3.9 `cv_download` event and 3.10 SEO (sitemap, robots, preview images, Person JSON-LD, canonical URLs). Act IV (pinned demo) renders only once the fraud demo is live (M4). Open: 1.5 Vercel (owner).
- **Code:** Next.js app: folio, colophon, home chapters with the evidence ledger, `/about`, `/contact`, the `/work` index and case-study pages at `/work/[slug]`, 404, design tokens, fonts, vendored scroll-craft engine, strict nonce CSP (D-28).
- **Positioning:** set in `content/site.ts` (rationale in the BRIEF, "Title-page positioning"); no figures allowed in it (unit test).
- **Assets:** headshot at `public/images/collins.jpg` (owner's real photo, 1200 px, metadata stripped; a unit test blocks EXIF in published photos).
- **Known gaps:** folio links to `/demos` and `/notes` return 404 until they are built. The CV at `/cv/Collins_Nyagaka_CV.pdf` is the phone-free public copy; its HTML source and the owner's copy (with phone) are in `private/cv/` (`node private/cv/render.mjs` prints both).
- **Waiting on owner:** M0 tasks 0.4–0.8 and follow-ups (details in `private/planning/`); 1.5 Vercel link; domain purchase at M6.
- **Last updated:** 2026-11-04

## Stack  <!-- LIVING: replace "planned" with exact versions once installed -->

Installed (M1, 2026-11-03): Node.js ≥ 24 (`.nvmrc`) · Next.js 16.4.5 App Router, `proxy.ts` for the per-request CSP ·
React 19.3.0 · TypeScript 5.9.3 strict · Tailwind CSS 4.3.4 (`@tailwindcss/turbopack`) · ESLint 9 + `eslint-config-next`
16.4.5 · Prettier 3.9.10 + `prettier-plugin-tailwindcss` · Vitest 5.1.0 · Playwright 1.64.1 + `@axe-core/playwright`
4.14.0 · Lighthouse CI 0.16.0 · Husky 9.1.7 (gitleaks pre-commit) · fonts Newsreader + Geist Sans/Mono via `next/font` ·
scroll-craft engine (vendored unmodified, `public/vendor/scrollcraft/`).

Content (M2): `@next/mdx` 16.4.5 + `@mdx-js/react` 3.1.1, remark-frontmatter 5, remark-gfm 4, gray-matter 4, Zod 4.6.7 (D-29). Scripts run as TypeScript on Node directly (type stripping, `"type": "module"`); no tsx.

Analytics (3.9): `@vercel/analytics` 2.0.1 (cookieless; custom events record only on a Vercel plan that supports them).

Planned (not installed yet): Python 3.13 Vercel Functions for demos (M4) · Upstash Redis · Cloudflare Turnstile + Resend.

## Commands  <!-- LIVING: fill in at M1; every script in package.json must be listed -->

| Task | Command |
|---|---|
| Install | `npm ci` (then `npx playwright install chromium` once) |
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` (runs `next typegen` first) |
| Format / check format | `npm run format` / `npm run format:check` |
| Unit tests | `npm test` |
| Build | `npm run build` |
| Start the production build | `npm start` |
| E2E + accessibility (needs a build) | `npm run e2e` |
| Lighthouse (needs a build) | `npm run lhci` |
| Everything quick before a commit | `npm run check` (lint, typecheck, format check, unit tests) |
| Git hooks | `npm run prepare` (installs Husky; pre-commit runs gitleaks on staged changes) |
| Validate content and write the index | `npm run content` (runs automatically before dev, build, typecheck and tests) |
| Link + evidence check (network) | `npm run links` |

## Layout  <!-- LIVING: update when top-level folders change -->

```
docs/            public planning documents (00–07), trimmed
private/         owner-only material, git-ignored, never commit:
  planning/      content inventory (08), full decision detail, review notes, account checklist
  *.md           CV edits, outreach drafts
.gitignore       ignores private/, .env*, .remember/, .vercel/
design/scrollcraft/   scroll-craft workspace: builds/portfolio-home/BRIEF.md, FINGERPRINTS.md
.scrollcraft.json     points scroll-craft at design/scrollcraft
AGENTS.md        shared agent instructions (this file)
CLAUDE.md        imports AGENTS.md + Claude Code specifics
app/             Next.js routes: layout (fonts, skip link, per-request rendering), page, not-found, icon
components/      folio, colophon, theme toggle
content/         site.ts, schema.ts (Zod), tags.ts, about.ts + about.mdx, cv.ts (skills), experience.ts, projects.ts (+ demos); case-studies/*.mdx and notes/*.mdx from M3; .generated/ is git-ignored
mdx-components.tsx  MDX component map (required by @next/mdx)
scripts/         build-content.ts (validate + index), check-links.ts (evidence links)
lib/             security-headers.ts (CSP builder), content.ts (typed content), ledger.ts, work.ts (work index filter), contact.ts (topics), seo.ts, og.tsx (preview images)
proxy.ts         per-request nonce CSP (Next.js 16 Proxy)
public/vendor/scrollcraft/   vendored engine + SHA256SUMS + SOURCE.md (never edit)
tests/unit/      Vitest      tests/e2e/   Playwright + axe
.github/workflows/ci.yml     CI: gitleaks, content, lint, typecheck, format, unit, links, audit, build, e2e, Lighthouse
.github/workflows/links.yml  nightly link check
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
12. **Scroll design (D-25, D-26).** The home page follows its BRIEF: chaptered editorial grammar and its bans (no fixed bar, no scrub hero, no spotlight/magnet, no pinned type crossfades), one peak (the demo), the evidence ledger shows only real figures from the evidence data. Never edit the vendored engine; put page behaviour in our own code. No em dashes in visible copy. If the page and the BRIEF disagree after the feel check, fix the page, not the BRIEF.
13. **Strict CSP (D-28).** Every page renders per request so `proxy.ts` can give it a fresh nonce. Don't re-enable Cache Components or Partial Prerendering, add inline scripts, or add `'unsafe-inline'` to scripts. A new third-party host goes into `lib/security-headers.ts` with a test, only when a feature needs it.
14. **Content (D-29).** Never add a content library or MDX renderer that evaluates code at runtime (`new Function`, `eval`); MDX compiles at build time. Every new content field goes into `content/schema.ts` with a test in `tests/unit/content.test.ts`. No invented dates or numbers in data files: if a month or figure isn't on record, leave it out.

## Conventions  <!-- LIVING: add a rule when a review finds a repeated mistake -->

- Semantic commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Branch, then PR; never push to `main`.
- Use the glossary terms from `docs/00-README.md` in UI copy and code (case study, project, demo, evidence, note).
- Copy: plain English, active voice, short sentences, numbers with their context. No "passionate", "cutting-edge" or "leveraging".
- Check current official docs for a library or framework before writing code against its API.
- Windows host: PowerShell is primary and Git Bash is available. Use forward slashes in scripts.
- The scroll-craft harness (`shoot.mjs`) injects an inline style, which the strict CSP blocks. Run a scratch copy with Playwright's `bypassCSP: true`; never relax the site's CSP for a test tool.
- Every `sr-only` element must sit inside a positioned ancestor (body is `relative`; scroll regions are `relative`), or it anchors to the viewport and widens narrow pages.
- Chain checks and commit with `&&` (`npm run check && git commit …`), never `;`. A formatter run once rewrote an MDX fixture, two tests failed, and a `;` chain still committed and pushed.

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
- 2026-11-03 — Public repo created and `main` pushed; Current state updated (Claude Code).
- 2026-11-03 — Scroll-craft design adopted (D-25–D-27): source of truth, stack, layout, hard rule 12 (Claude Code).
- 2026-11-03 — M1 shell built: Current state, Stack (exact versions), Commands, Layout, hard rule 13 (D-28) (Claude Code).
- 2026-11-04 — M2 content layer: Current state, Stack, Commands, Layout, hard rule 14 (D-29) (Claude Code).
- 2026-11-04 — M3.3 and M3.5 drafted: Current state (Claude Code).
- 2026-11-04 — M3.6 work index: Current state (Claude Code).
- 2026-11-04 — M3.7 about page: Current state, Layout (Claude Code).
- 2026-11-04 — M3.8 contact page: Current state (Claude Code).
- 2026-11-04 — M3.9 and M3.10: Current state, Stack, Layout (Claude Code).
- 2026-11-04 — M4.10 /cv page: Layout (Claude Code).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` â€” verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
