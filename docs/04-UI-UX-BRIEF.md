# 04 — UI and UX Design Brief

**Version:** 0.3 · **Date:** 2026-11-03 · Depends on: [01-PRD](01-PRD.md), [03-APP-FLOW](03-APP-FLOW.md)

The scroll design for the home page follows the **scroll-craft** method (nateherk-design plugin 0.3.1,
github.com/nateherkai/scroll-craft, MIT). Its full brief lives in
[`design/scrollcraft/builds/portfolio-home/BRIEF.md`](../design/scrollcraft/builds/portfolio-home/BRIEF.md):
interview answers, feeling curve, peak, grammar, score and signature move. This document is the design system that
brief sits on. Where they differ, the BRIEF wins for the home page and this document wins everywhere else.

## 1. Audience and tone

For technical recruiters and engineering managers (D-01) who skim fast and distrust hype.
Three adjectives (owner's choice in the scroll-craft interview): **precise, calm, credible.** The site reads like a
well-made printed feature about engineering work: editorial, not a template and not a light show.

Voice rules for copy:
- Numbers with their context: "hit@10 0.03 → 0.30 on 300 unseen questions", never "10× better retrieval".
- Say what is not done. Each case study has a "Limits" line. Missed targets are stated as missed.
- First person, active voice, short sentences. No "passionate", "ninja", "rockstar", "cutting-edge", "leveraging".
- No claims of "production-grade" unless real users run it in production; use "production-shaped" or "pre-pilot".
- **No em dash in visible copy** (scroll-craft taste floor). Use a period, comma, colon or parentheses.
- One label per intent, everywhere: the primary action is **"Email Collins"**. "Download CV" is a secondary text link.
- The page addresses the visitor as "you" once, at the demo ("Score one yourself."), and nowhere else.

## 2. Structure: chaptered editorial (home page)

Grammar 2.2 from scroll-craft. Full rationale in the BRIEF.

| Element | Treatment |
|---|---|
| Navigation | **No fixed header bar.** A **folio** in the outer margin: chapter number and title (updates as chapters pass), then text links Work · Demos · Notes · Email Collins · CV. On mobile the folio is a slim top line that expands to a sheet. |
| Hero | A **title page**: name, one sentence, the folio. No media above the fold. Depth comes from four typographic and paper planes moving at different rates (BRIEF, "Hero depth"). |
| Chapters | 0 Title page → I Problem → II Method → III Work → intertitle → IV Demo (peak) → V Colophon. Hard cuts between chapter grounds, never crossfaded gradients. |
| Media | Always in its own column with a caption. Never under type. |
| Close | A colophon: the evidence ledger set as a table, then "Email Collins" as a line of running text. |
| Signature move | **The evidence ledger** (§5 component; BRIEF "Signature move"). |
| Peak | Act IV, the live fraud demo: the only pinned stage, the largest scroll span. |

Grammar bans held on the home page:
- No full-bleed scrub or video hero.
- No pinned crossfade type acts.
- No `spotlight` or `magnet` CTA.
- No `drift` gradient between chapters.
- No centred hero copy.

Inner pages (case studies, demos, notes, about, contact) are editorial article pages sharing the folio. They have no
pinned acts.

## 3. Reference products

Scroll-craft asks for references from any medium, not websites. The owner gave none, so these are
**authored and owner-adjustable**.

| Reference | Borrow | Avoid |
|---|---|---|
| A printed long-form magazine feature (e.g. a technical profile in a quarterly) | Folios, captions, asymmetric spreads, measure | Decorative drop caps everywhere |
| Patent drawings and exploded assembly diagrams | Line weight, leader callouts, ink on paper | Shading, colour fills |
| A lab notebook / audit ledger | The ledger's ruled lines, tabular figures, sources per line | Faux-handwriting |
| The owner's CV (PDF) | **Deep green accent** and section rules, so the CV and site read as one brand | Two-column density on mobile |
| Current portfolio (to replace) | — | Star-field background, "Data Scientist" headline, 101-skill grid, purple accent, runtime CMS fetch |

## 4. Colour and type

### Colour tokens

Light **paper** canvas is the design. Dark is an optional reading mode.

Rules:
- One accent, locked.
- No pure black.
- Secondary text is green-tinted, not flat grey.
- No cream-and-brass palette.
- No violet-blue gradients.
- Verify every text/ground pair on the rendered page (target WCAG 2.2 AA: 4.5:1 body, 3:1 large text and UI). The values below are estimates.

| Token (`--sc-*` alias) | Light | Dark | Use |
|---|---|---|---|
| `--bg` (`--sc-canvas`) | `#F3F4F1` | `#0F1312` | Paper ground |
| `--surface` (`--sc-surface`) | `#FFFFFF` | `#161C1A` | Demo surface, ledger, plates |
| `--surface-2` | `#E9EBE6` | `#1D2421` | Code blocks, table stripes, chapter-ground variant |
| `--border` | `#D9DCD5` | `#2A3330` | Rules, folio line, ledger rules |
| `--text` (`--sc-ink`) | `#14181A` | `#E6EBE8` | Body text |
| `--text-muted` (`--sc-ink-soft`) | `#4E5A55` | `#9BA6A1` | Captions, folio, ledger meta |
| `--primary` (`--sc-accent`) | `#1E6B52` | `#4FBF95` | Links, "Email Collins", focus ring, "you" line in the ledger |
| `--primary-ink` (`--sc-accent-ink`) | `#FFFFFF` | `#0F1312` | Text on accent |
| `--success` | `#15803D` | `#4ADE80` | "Allow" decision |
| `--danger` | `#B91C1C` | `#F87171` | "Flag" decision, errors |
| `--warning` | `#8A5A00` | `#FBBF24` | Caveats, "missed target", "may take 30 s to wake" |

There's no separate highlight accent (the old amber is removed). Figures get emphasis from Geist Mono and weight,
not colour. Colour never carries meaning alone: every status also has an icon and a text label.

### Typography

Two families:
- **Newsreader** (editorial serif, OFL) for display and text.
- **Geist** (Sans for the folio and labels, Mono for figures) for UI and data.

Both are self-hosted via `next/font`.

| Role | Font | Size (mobile → desktop) | Weight / leading / tracking |
|---|---|---|---|
| Title page name | Newsreader | 56 → 112 px (hero moment) | 500 / 0.98 / −0.025em, optical size on |
| Chapter title | Newsreader | 36 → 64 px | 500 / 1.05 / −0.015em |
| H2 | Newsreader | 26 → 34 px | 500 / 1.2 |
| H3 | Geist Sans | 18 → 20 px | 600 / 1.3 |
| Body | Newsreader | 18 → 20 px | 400 / 1.6, measure 62ch (45–75) |
| Folio, captions, labels | Geist Sans | 13 → 14 px | 500 / 1.4 / +0.01em, small caps for chapter numbers |
| Figures, ledger, code | Geist Mono | 14 → 16 px (ledger 13 px) | 500, `tabular-nums` |

- Step the title page down one rung below ~700 px viewport height.
- Tracking tightens as size grows.
- Fallbacks: `Georgia, "Times New Roman", serif` and `ui-sans-serif, system-ui, sans-serif`. Preload both fonts' main weights.

## 5. Components

| Component | Spec |
|---|---|
| Folio | Fixed in the outer margin (desktop ≥ 1024 px), slim top line on smaller screens. Chapter number (small caps) + title, updated via the engine's chapter events. Links: Work · Demos · Notes · Email Collins · CV. Keyboard reachable, `nav` landmark |
| **Evidence ledger** (signature) | Narrow ruled panel in the opposite margin (desktop) or a collapsible bottom strip (mobile, collapsed by default, shows a count). Appends one line when a figure tagged `data-ledger` passes the reading line: value (mono) · label · project · source link or "Private work". The visitor's own demo result is written in `--primary` with "you, just now". In the colophon it becomes a real `<table>` with totals. Never shows a figure that isn't in the evidence data. Margin copy `aria-hidden`; the colophon table is the accessible version |
| Title page | Name (h1), one sentence, folio. Four planes (paper tooth, drawing fragment, type, folio rule) with differential translate on scroll. Static under reduced motion with layering intact |
| Chapter opener | Number (small caps), title, one-line standfirst. Hard ground change on entry (`reveal`) |
| Spread | Asymmetric two columns: prose (62ch) and a captioned media column (SVG diagram or plate). Alternates lead/trail. No cards on the home page |
| Figure in prose | Inline Geist Mono figure that settles (`count`) once, and only when the number is real, then registers with the ledger |
| Plate | Captioned image or SVG with a hairline frame. Caption: what it is, the source, and the date |
| Demo surface | The live fraud demo, pinned in Act IV. Sample picker (with 10-transaction history shown read-only), editable target fields, "Score it" button, results panel (`aria-live="polite"`). Same component on `/demos/fraud` |
| Probability gauge | Horizontal bar 0–1 with a threshold marker; the numeric value is always shown as text |
| Contribution bars | Five diverging bars in log-odds units (towards fraud = `--danger`, towards legit = `--success`), labelled with feature and signed value |
| Button | Only inside the demo and forms. Filled `--primary`, 44 px min height, label on one line |
| Link | `--primary`, underline on hover/focus; external links show ↗ + sr-only "(opens in new tab)" |
| Evidence link | Inline: `↳ tests/test_rls.sql` to the exact file/line; private evidence shows a lock + "Private work" |
| Metric table | Metric · Value · Dataset/split · Caveat. Mono numbers, right-aligned |
| Callout | Caveat / Security variants with icon + title |
| Timeline | Vertical, dates in mono, role + org + 1–3 bullets |
| Toast | Bottom-centre, 4 s, pausable, `role="status"` |
| Colophon | The ledger table + totals, then running text: "Email Collins at …", "CV (PDF)", LinkedIn, GitHub, last updated, source of this site |

## 6. Layout rules

- Grid: 12 columns, max content width 1280 px. Reading column 62ch. Margins on ≥ 1024 px hold the folio (outer) and ledger (inner).
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96, 144. Chapter spacing 144 desktop / 96 mobile. More space above a heading than below.
- Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Side gutters: 16 / 24 / 32 px. No horizontal scroll at 320 px.
- Anchors vary by act (lead, trail, split; centred only on the intertitle).
- Radius: 2 px on plates and inputs (print feel), 6 px on buttons. No shadows on paper; a hairline instead. The demo surface gets one soft offset shadow, the only raised object on the page.

## 7. Scroll and motion rules

- Scroll stays native. Pinning is CSS sticky driven by the engine's progress value (`--sc-p`), so it isn't scroll-jacking: no wheel interception, no smooth-scroll override, keyboard and find-in-page keep working.
- Engine: `scrollcraft.js` + `scrollcraft.css` vendored unmodified (MIT). Page-specific behaviour (ledger, hero planes) lives in our own code reading `--sc-p` and our own `data-ledger-*` attributes. **Never edit the engine.**
- Animate only `transform`, `opacity` and `clip-path` (wipes). No `transition: all`.
- UI transitions under 300 ms. No `ease-in` on UI. Never `scale(0)`.
- **Reduced motion:** chapters render as a normal document. No pinning and no extra scroll space. The ledger fills without animation. The hero keeps its static layering. The demo works identically.
- Pointer effects are seasoning: at most one (subtle hero plane shift), gated to `(hover: hover) and (pointer: fine)`, never cursor capture.
- Total scored span: about 12.4 viewport heights over 7 acts (BRIEF score). Administrative content (experience, certifications) lives on `/about` and is not spent on home-page scroll.

## 8. Screen notes

**Home:** see the BRIEF score. Content per chapter:
- **0 Title page:** "Collins Nyagaka", the one-sentence positioning, availability and time zone in the folio.
- **I Problem:** three short failures, one per ground: a model that looks great until it meets next month's data; a retrieval answer that cites law that isn't there; one firm's records visible to another.
- **II Method:** the headshot plate (captioned) and four principles: evaluate on data the model hasn't seen; enforce isolation in the database, not the UI; say what isn't done; ship with tests and security checks.
- **III Work:** spreads for LegalAI Kenya, ComplianceGuard and Production AI Reference Template, plus one compact row for the remaining case study. Each spread ends with "Read the case study".
- **Intertitle:** "Now try one."
- **IV Demo:** the fraud demo surface. The visitor's run is written to the ledger.
- **V Colophon:** the ledger table with totals, then the contact line.

**Case study:** Title, outcome, meta row (role, timeframe, team, stack, visibility). Then:
- Problem
- Constraints
- Approach (one SVG architecture drawing in the technical-drawing world)
- Evaluation (method first, then the metric table)
- Results
- Security
- Limits
- What I'd do next
- Evidence (list)
- Next case study

Its figures also feed the ledger, scoped to that page.

**Demo pages:** what it does (1 sentence), the surface, "How it works" (collapsible), model card, links to the case study and repo.

**About:** narrative (≤ 250 words), focus areas, experience timeline, education and certifications.

**Contact:** "Email Collins" (copy button), LinkedIn, GitHub, time zone + reply time, availability, "Freelance? TundoTech Systems ↗", optional form.

## 9. Accessibility

- WCAG 2.2 AA minimum; axe-core 0 violations on every route, including at mid-scroll positions of the home page.
- Visible focus ring: 2 px `--primary` outline + 2 px offset, never removed. Focus order follows reading order through pinned acts.
- Touch targets ≥ 44 × 44 px.
- Landmarks: folio `nav`, `<main id="main">`, colophon `footer`. One h1 per page; headings in order. Skip link first.
- Real HTML for all copy (no text in images). Diagrams have a text description below.
- Video: captions (`.vtt`) and a transcript; no autoplay with sound; no audio track on any scroll-driven media.
- Charts, gauges and the ledger always carry their numbers as text.
- Forms: visible labels; errors linked with `aria-describedby`; an error summary on submit.

## 10. Interaction states

| State | Treatment |
|---|---|
| Hover | Links underline; plates' hairline → `--primary` at 40%; buttons darken |
| Focus | 2 px outline ring |
| Active | Translate 1 px down; no bounce |
| Disabled | 50% opacity, `aria-disabled` |
| Loading | Spinner after 300 ms + "Scoring…"; skeleton rows for lists |
| Error | `--danger` hairline + icon + message under the field |
| Success | `--success` icon + message; the ledger line is the confirmation for a demo run |

## 11. Banned patterns

From the old brief:
- Star fields, particles, matrix backgrounds
- Glassmorphism
- Purple/violet AI gradients
- Typewriter headlines
- Skill percentage bars and skills-count grids
- Emoji in headings
- Auto-playing carousels
- Scroll-jacking (wheel interception or smooth-scroll override)
- Custom cursors
- Modal on load
- Stock laptop/robot photos
- AI-generated portraits of the owner
- Pulsing "Hire me" buttons
- Fake client logos

From the scroll-craft refuse list:
- Clay, low-poly or diorama worlds
- A "scroll" cue, arrow or mouse icon
- `01 / 06` section counters (folio chapter numbers are navigation, not counters)
- An eyebrow above every heading (at most one per three sections)
- Em dashes in visible copy
- Centred copy in every act
- The same device twice in a row
- A full-frame dark overlay for contrast
- Text baked into images
- Invented statistics or counters without real numbers
- `transition: all`, or animating width/height/top/left
- Gradient text, neon glow, halo shadows
- An ending that fades into a footer

## 12. Assets needed

| Asset | Source | Status |
|---|---|---|
| Headshot (square, ≥ 800 px, neutral background) | Owner (D-21), real photo | In repo: `public/images/collins.jpg` (1200 × 1200, metadata stripped). Grade to the paper/ink palette when the Method plate is built (M3) |
| CV PDF (current) | Owner | Update needed (D-16) |
| Architecture drawings (SVG) for each case study | **Hand-authored** from repo docs, technical-drawing style | To do |
| Chapter-opener ink studies (texture only, no text) | Generated with the BRIEF's style preamble | Blocked until the owner sets `KIE_AI_API_KEY` (optional; the page works without them) |
| Paper tooth texture (tileable, ≤ 30 KB) | Generated or scanned | To do |
| Monogram "CN" favicon + icons | Design at M1 | To do |
| Open Graph images (1200 × 630) via `next/og`, paper + Newsreader | Build | To do |
| LegalAI Kenya 90 s walkthrough (MP4 + captions) | Owner records; demo tenant only | To do |
| ComplianceGuard demo walkthrough | Owner records | To do |
| Icons | Lucide (MIT) | — |
