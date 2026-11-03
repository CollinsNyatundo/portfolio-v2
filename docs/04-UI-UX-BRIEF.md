# 04 — UI and UX Design Brief

**Version:** 0.2 · **Date:** 2026-11-03 · Depends on: [01-PRD](01-PRD.md), [03-APP-FLOW](03-APP-FLOW.md)

## 1. Audience and tone

For technical recruiters and engineering managers (D-01) who skim fast and distrust hype.
Three adjectives: **precise, calm, credible.** The page should feel like a well-written engineering design doc
that happens to look good — not a template, not a light show.

Voice rules for copy:
- Numbers with their context: "hit@10 0.03 → 0.30 on 300 unseen questions", never "10× better retrieval".
- Say what is not done. Each case study has a "Limits" line. (This is the owner's existing style on GitHub.)
- First person, active voice, short sentences. No "passionate", "ninja", "rockstar", "cutting-edge", "leveraging".
- No claims of "production-grade" unless real users run it in production; use "production-shaped" or "pre-pilot", as the owner's READMEs already do.

## 2. Reference products

| Reference | Borrow | Avoid |
|---|---|---|
| Stripe Docs / Stripe Press | Typographic hierarchy, generous whitespace, calm colour | Heavy illustration |
| Linear changelog | Dense-but-readable metric rows, crisp dividers | Dark-only aesthetic |
| Vercel / Geist design system | Monospace for numbers and code, restrained motion | Pure black-and-white coldness |
| The owner's CV (PDF) | **Deep green accent** and section rules — keeps the CV and site visibly one brand | Two-column density on mobile |
| Current portfolio (to replace) | — | Star-field background, "Data Scientist" headline, 101-skill grid, purple accent, runtime CMS fetch |

## 3. Colour palette (tokens)

Defined as CSS variables on `:root`; dark values under `prefers-color-scheme: dark` and `[data-theme="dark"]`.
Contrast values are estimates; verify every text/background pair with an automated check at M1 (target WCAG 2.2 AA:
4.5:1 body, 3:1 large text and UI).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FAFAF7` | `#0E1211` | Page background |
| `--surface` | `#FFFFFF` | `#151A19` | Cards, demo panels |
| `--surface-2` | `#F2F3EF` | `#1B2220` | Code blocks, table stripes |
| `--border` | `#E3E5E0` | `#26302D` | Dividers, card borders |
| `--text` | `#14181A` | `#E8ECEA` | Body text |
| `--text-muted` | `#5B6468` (~5.8:1) | `#9AA4A0` | Captions, meta |
| `--primary` | `#1E6B52` (~6.1:1 on bg) | `#4FBF95` (~8:1 on bg) | Links, primary buttons, focus ring, CV green |
| `--primary-hover` | `#17573F` | `#6FD3AC` | Hover/pressed |
| `--accent` | `#B45309` | `#F2A65A` | Metric highlights only (sparingly) |
| `--success` | `#15803D` | `#4ADE80` | "Allow" decision, passing checks |
| `--warning` | `#B45309` | `#FBBF24` | Caveats, "may take 30 s to wake" |
| `--danger` | `#B91C1C` | `#F87171` | "Flag" decision, errors |
| `--info` | `#1D4ED8` | `#93C5FD` | Notes, private-work badge |

Rule: colour never carries meaning alone — every status also has an icon and a text label.

## 4. Typography

| Role | Font | Size (mobile → desktop) | Weight / leading |
|---|---|---|---|
| Display (hero name) | **Geist Sans** (self-hosted via `next/font`) | 40 → 64 px | 650 / 1.05, tracking −0.02em |
| H1 (page title) | Geist Sans | 32 → 44 px | 650 / 1.15 |
| H2 | Geist Sans | 24 → 30 px | 600 / 1.25 |
| H3 | Geist Sans | 19 → 22 px | 600 / 1.3 |
| Body | Geist Sans | 17 → 18 px | 400 / 1.65, max line 68ch |
| Small / meta | Geist Sans | 14 px | 400 / 1.5 |
| Metrics, code, latency | **Geist Mono** | 15 → 16 px; hero proof numbers 28 px | 500, `font-variant-numeric: tabular-nums` |

Fallback stack: `ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif`. Font files preloaded; `font-display: swap`.

## 5. Components

| Component | Spec |
|---|---|
| Button | Primary (filled `--primary`), Secondary (outline), Ghost (text). Height 44 px min. Icon + label; icon-only buttons need `aria-label` and tooltip |
| Link | `--primary`, underline on hover/focus; external links show ↗ icon + sr-only "(opens in new tab)" |
| Proof chip | Mono number + short label, e.g. `1.4 ms` p95 fraud scoring. Max 3 in hero |
| Case-study card | Title, one-line outcome, 3 tags, 1 headline metric, visibility badge (Public code / Private work / Live app) |
| Project card | Smaller; title, one line, tags, links |
| Evidence link | Inline pill: `↳ tests/test_rls.sql` linking to the exact file/line; private evidence shows lock icon + "Private" |
| Metric table | Metric · Value · Dataset/split · Caveat. Mono numbers, right-aligned |
| Callout | Info / Caveat / Security variants with icon + title |
| Timeline (experience) | Vertical, dates in mono, role + org + 1–3 bullets |
| Demo panel | Two columns ≥ 1024 px (input left, result right), stacked on mobile. Result area has `aria-live="polite"` |
| Probability gauge | Horizontal bar 0–1 with threshold marker; numeric value always shown as text |
| SHAP bars | Diverging horizontal bars (towards fraud = `--danger`, towards legit = `--success`), labelled with feature and signed value |
| Toast | Bottom-centre, auto-dismiss 4 s, pausable on hover/focus, `role="status"` |
| Header | Sticky, 64 px, background blur off (solid `--bg` with bottom border) — avoids glass effects |
| Footer | Contact links, last-updated date, source link |

## 6. Layout rules

- Grid: 12 columns, max content width 1200 px; reading column 720 px (68ch).
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96. Section spacing 96 desktop / 64 mobile.
- Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`.
- Side gutters: 16 px mobile, 24 px tablet, 32 px desktop. No horizontal scroll at 320 px.
- Radius: 8 px cards, 6 px buttons, 999 px chips. Shadows: none by default; 1 px border instead.

## 7. Screen notes (hierarchy)

**Home**
1. Hero: name (display), "AI & Machine Learning Engineer", "Nairobi, Kenya · UTC+3 · Open to remote roles" (availability from `site.ts`), one-sentence positioning from the CV profile, buttons: Download CV (primary), Email, LinkedIn, GitHub. Headshot (D-21).
2. Proof row: 3 proof chips.
3. Selected work: 3 case-study cards (LegalAI Kenya, Credit-card fraud, ComplianceGuard), "All work →".
4. Live demos: 2 demo cards with a one-line "what you'll see".
5. Focus areas: Fintech · Legaltech · Agritech — one sentence each with links.
6. How I work: 4 short principles (evaluate on unseen data; enforce isolation in the database; say what isn't done; ship with CI and security checks).
7. Experience snapshot: last 3 roles; "Full experience →".
8. Contact CTA band.

**Case study** — Title, one-line outcome, meta row (role, timeframe, team size, stack, visibility). Then: Problem ·
Constraints · Approach (with one architecture diagram, SVG, theme-aware) · Evaluation (method first, then metric
table) · Results · Security · Limits / what's not done · What I'd do next · Evidence (list) · Next case study.

**Demo** — Title, what it does (1 sentence), "How it works" collapsible, panel, "Model card" (data, split, metrics,
limits), link to the case study and repo.

**About** — Narrative (≤ 250 words), focus areas, how I work, experience timeline, education and certifications,
"Outside work" (1–2 lines, optional).

**Contact** — Email (copy button), LinkedIn, GitHub, time zone + typical reply time, availability, "Freelance? →
TundoTech Systems", optional form.

## 8. Accessibility

- WCAG 2.2 AA minimum; axe-core 0 violations in CI on every route.
- Visible focus ring: 2 px `--primary` outline + 2 px offset, never removed.
- Touch targets ≥ 44 × 44 px.
- Landmarks: one `<header>`, `<nav>`, `<main id="main">`, `<footer>`; one H1 per page; headings in order.
- All images have meaningful `alt` or `alt=""` if decorative; diagrams have a text description below.
- Video: captions (`.vtt`) and a transcript link; no autoplay with sound.
- `prefers-reduced-motion`: disable all non-essential animation.
- Forms: labels always visible (no placeholder-only labels); errors linked with `aria-describedby`; error summary on submit.
- Charts/gauges always include the numeric value as text.

## 9. Interaction states

| State | Treatment |
|---|---|
| Hover | Links underline; cards border → `--primary` at 40%; buttons darken (`--primary-hover`) |
| Focus | 2 px outline ring (all interactive elements) |
| Active / pressed | Translate 1 px down; no scale bounce |
| Disabled | 50% opacity, `cursor: not-allowed`, `aria-disabled` |
| Loading | Spinner after 300 ms + text ("Scoring…"); skeletons for lists |
| Error | `--danger` border + icon + message under the field |
| Success | `--success` icon + message; toast for transient confirmations |

## 10. Banned patterns

Star fields, particle or matrix backgrounds; glassmorphism; purple/violet AI gradients; typing/typewriter headline
effects; skill percentage bars; "101 skills" grids; emoji in headings; auto-playing carousels; scroll-jacking;
custom cursors; modal on load; stock photos of laptops/robots; AI-generated portraits of the owner; "Hire me" pulsing
buttons; fake client logos.

## 11. Assets needed

| Asset | Source | Status |
|---|---|---|
| Headshot (square, ≥ 800 px, neutral background) | Owner | Owner supplies (D-21) |
| CV PDF (current, matching LinkedIn roles) | Owner | Update needed (D-16) |
| Monogram "CN" favicon + app icons (SVG, 32, 180, 512) | Design at M1 | To do |
| Open Graph image template (1200 × 630), generated per page with `next/og` | Build | To do |
| Architecture diagrams (SVG) for each case study | Build from repo docs | To do |
| LegalAI Kenya 90 s walkthrough video (MP4 + captions) | Owner records; demo tenant data only | To do |
| ComplianceGuard demo walkthrough (from `make demo`) | Owner records | To do |
| Screenshots of each live app (light + dark where relevant) | Build | To do |
| Icons | Lucide (MIT) | — |
