# BRIEF: portfolio home (collinsnyagaka.com)

Interviewed 2026-11-03 (scroll-craft Step 0). The owner picked answers from proposed options; selections are
recorded verbatim. Anything not chosen by the owner is labelled **Authored**. Source plugin:
`nateherk-design/scroll-craft` 0.3.1 (github.com/nateherkai/scroll-craft, MIT).

## Interview answers

| # | Topic | Owner's answer (verbatim selection) |
|---|---|---|
| 1 | Vibe | "Precise, calm, credible". No outside references given. |
| 2 | Journey | "Problem → how I work → work → demo → contact" |
| 3 | Energy curve | "Calm → peak at demo → calm" |
| 4 | Peak moment | "Running the fraud model": they score a real transaction and watch the decision and its reasons appear in milliseconds. |
| 5 | The thing no site does | "Evidence ledger": a small fixed ledger adds a line, with its source link, each time you pass a real claim. By the end it totals everything you read. Real numbers only. |
| 6 | Aesthetic range | "Editorial": paper, folios, measure, restraint. |
| 7 | World vs scenes | "Distinct scenes" |
| 8 | Assets | "Headshot / photos of me", "Generate the rest" |

Step 1 answers come from the project docs (`docs/01-PRD.md`), so they aren't asked again:
- **What and who:** an evidence-first portfolio for an AI & ML engineer, for hiring managers and technical recruiters.
- **Believe by the end:** "His AI systems hold up under honest evaluation, and he shows you exactly how."
- **One action, one label everywhere:** **"Email Collins"**. The CV download is a secondary link, never a second button.

## Title-page positioning (written 2026-11-04)

> I build ML and LLM systems that hold up under honest evaluation, from fraud models tested on future data to legal
> search that refuses to guess.

Owner delegated the wording ("use the best one"). Authored from research and the project evidence:

| Rule (source) | How the sentence follows it |
|---|---|
| Name the role, then state an outcome as a claim, in one breath; proof or domain goes in the supporting line (SlateGit, "Portfolio hero headline", 2026; Hbaek, "About page", 2025) | The role is already the line above ("AI & Machine Learning Engineer"), so this sentence carries the outcome plus two proofs |
| Recruiters decide fit in about 6 to 7.4 seconds and read titles first (Ladders eye-tracking studies, 2012 and 2018) | Name, title and this sentence sit above the fold at 375 px (e2e test) |
| ML hiring managers screen for evaluation rigour, leakage awareness and honest handling of low confidence, not tool lists (Calyptus 2026; Interviewer Signal 2026; Devinity 2026; Eugene Yan 2024) | "Honest evaluation", "tested on future data" (time-ordered splits, no leakage) and "refuses to guess" (LegalAI declines weak matches) |
| Avoid "passionate about", generic labels and unbacked claims (all sources) | Every clause points to a case study with evidence |

No figures in the sentence: numbers on this site travel with their dataset, caveat and source, which is the ledger's
job, not the title page's.

## Journey (beats)

| Beat | What changes in the visitor |
|---|---|
| 1 Problem | They recognise the failure they've seen: AI that demos well and breaks on real data |
| 2 Method | They learn how this engineer works against that failure |
| 3 Work | They see the method applied, with numbers they can check |
| 4 Demo | They test it themselves |
| 5 Contact | One clear next step |

## Feeling curve (written before the acts)

| Act | Feeling | What on screen causes it |
|---|---|---|
| 0 Title page | Calm curiosity | A quiet printed title page: name, one sentence, a folio. Nothing moves until they do |
| I Problem | Recognition, slight unease | Three short failures named plainly, each landing on a hard ground change |
| II Method | Trust | The headshot plate and four working principles, set like a magazine profile |
| III Work | Confidence | Case-study spreads where real figures settle into place and each one enters the ledger |
| — Intertitle | Anticipation (**authored silence**) | A nearly empty page: one line, "Now try one." Then a wipe |
| IV Demo | **Delight, then conviction (PEAK)** | The page stops. The visitor picks a transaction, scores it, and the decision and its five reasons arrive in milliseconds. Their own result is written into the ledger |
| V Colophon | Resolve, calm | The ledger becomes the colophon: everything they read, totalled, with sources. Then one line of running text: "Email Collins" |

No two adjacent acts share a feeling. Silence before the peak: the intertitle (authored, not dead scroll).

## The peak

> "I scored a credit-card transaction myself and it told me why it flagged it, in about a millisecond, and my
> result went straight into his evidence list."

Lives in Act IV. It gets the largest scroll span on the page, the only pinned stage, and the asset budget (the live
model and its explanation).

## Tell-someone sentence

> It's the site where **a running ledger keeps the receipts for every claim you scroll past, and then you score a
> transaction yourself and your own result lands in it.**

The signature move (the ledger) and the peak (the demo) meet in the same moment: the peak writes to the ledger.

## Grammar: 2.2 Chaptered editorial

**Why it won:**
- The owner chose Editorial (Q6) and distinct scenes (Q7).
- Case studies are long-form substance, which is this grammar's stated fit.
- The evidence-first principle reads naturally as captions, folios and a colophon.

**Why the others lost:**

| Grammar | Why not |
|---|---|
| Filmic one-shot | Carries the burden of proof. A single carried arc hides the seams between projects, and evidence needs seams |
| Live surface | Fits the demo chapter, but the whole site isn't a tool; it would ban the profile and spreads |
| Continuous world | No real geography. The owner chose distinct scenes |
| Typographic poster | The asset is evidence and a working model, not one sentence |
| Gallery / catalog | Close second: case studies are a range. But the visitor's question is "should I believe him", which is an argument, and catalog bans argument |
| Split stage | No two-sided comparison runs the whole page |
| Rhythmic cutlist | The vibe is calm. Cutlist is energy |

**Grammar constraints we accept:**
- No fixed bar. A **folio** in the margin shows the chapter number and title, plus "Email Collins" and "CV" as text links.
- No full-bleed scrub hero. The hero is a **title page** with no media above the fold.
- No pinned crossfade type acts, no `spotlight`, no `magnet`.
- Media sits in its own column with a caption, never under type.
- `scrub` is used in at most one chapter. **Planned use: none.**
- The close is a **colophon**, and the CTA is running text.

## Signature move: the evidence ledger

A narrow fixed ledger in the outer margin (desktop) or a collapsible bottom strip (mobile). When a real figure in
the prose passes the reading line, a line is appended, for example:

```
61,683   passages indexed            LegalAI Kenya      ↗ source
0.03→0.30 hit@10, 300 unseen Qs      LegalAI Kenya      ↗ source
37/37    cross-tenant probes failed  LegalAI Kenya      ↗ source
0.80     F1 (target 0.85, missed)    Fraud detection    ↗ source
1.4 ms   p95 in-process inference    Fraud detection    ↗ source
1.2 ms   your transaction, scored     You, just now
```

Rules:
- Only figures that already exist in the site's evidence data (D-05). No figure, no line.
- A missed target is listed as missed.
- Each line links to its evidence, or says "Private work".
- The line the visitor creates in Act IV is styled as theirs.
- In Act V the ledger slides into the page as the colophon table and totals: "N claims, M sources, 1 run by you".
- It's built in page code, driven off `--sc-p` and the page's own `data-ledger-*` attributes. The engine is untouched.
- Reduced motion: lines appear without animation. Screen readers get the full ledger as a normal table in the colophon. The margin copy is `aria-hidden` to avoid double reading.

## Score

| Act | Beat | Device | Span (vh) | Anchor | Why this device |
|---|---|---|---|---|---|
| 0 Title page | — | `in` (staggered type set) + typographic depth planes | 1.0 | lead | A printed page arriving, not a film starting |
| I Problem | Problem | `reveal` (hard ground cut per failure) | 1.4 | trail | Each failure is a change of state, and editorial wants hard cuts |
| II Method | Method | `parallax` in the media column (layered headshot plate) | 1.6 | split | Intimacy needs a near/far relationship; depth sits in the plate, not under text |
| III Work | Work | `flow` + `count` (real figures in prose) | 3.0 | lead/trail alternating | Spreads read like a feature; figures settle and enter the ledger |
| Intertitle | — | `reveal` (wipe on a near-empty page) | 0.8 | centre (only centred act) | Authored silence before the peak |
| IV Demo | Demo | `pin` (the live demo holds while the visitor operates it) | **3.4** | split | The page stops moving and starts responding. Largest span by a visible margin |
| V Colophon | Contact | `flow` (ledger becomes colophon) | 1.2 | lead | Resolves and holds; quiet type, one running-text CTA |

- **Totals:** 7 acts, 12.4 vh of scored span. This avoids the 13.6–13.8 vh, 6–7 act band.
- **Device families:** in, reveal, parallax, flow+count, pin (5 distinct). No family appears twice in a row. Two `reveal` acts are separated by two acts. **Zero `scrub`.**
- **Grammar bans held:** no scrub hero, spotlight, magnet or pinned type crossfades. The single `pin` stages a live surface, not type.

## World and assets

**World:** #8 Technical drawing (ink on paper), plus one real photograph.

Reasons:
- Engineering work is best shown as accurate diagrams, honest about being diagrams.
- The editorial paper ground is shared with the drawings.
- It avoids invented product photography for software that has no physical form.

**Realism rule:**
- Diagrams that carry facts (architecture, data flow) are **hand-authored SVG** from the repos, never generated.
- Generated plates are texture and atmosphere only (chapter-opener ink studies), using the preamble below, with no text in the image.
- The headshot is the one photograph. It's a captioned portrait plate, graded to the paper and ink palette so it sits with the drawings.

**Style preamble** (verbatim in every generated prompt):

> Precise technical illustration in the style of a patent drawing or exploded assembly diagram. Fine consistent
> line weight, no fills, monochrome deep green-black ink on cool off-white paper ground, dimension lines and leader
> callouts without any lettering. Orthographic projection. Subtle paper tooth and faint ink bleed. Restrained,
> engineered, no shading, no gradients, NOT 3D render, NOT clay, NOT illustration with colour, no text, no numbers.

**Hero depth** (title page, without media):
- Four planes, each moving at its own rate on the first 0.6 vh of scroll:
  - back: paper tooth
  - mid: a faint oversized technical-drawing fragment
  - title type
  - fore: the folio rule and margin ledger head
- The full headline is readable at rest. A static composition keeps the layering under reduced motion.

**Generation status:** `KIE_AI_API_KEY` is not set (preflight 2026-11-03). Nothing is generated until the owner adds
the key; the SVG and photo route needs no key.

## Theme (tokens)

Light paper canvas by default. Dark is an optional reading mode, not the design.

| Token | Value |
|---|---|
| canvas | `#F3F4F1` (cool paper, not cream) |
| surface | `#FFFFFF` |
| ink | `#14181A` |
| ink-soft | `#4E5A55` (green-tinted, not flat grey) |
| accent | `#1E6B52` (the CV's green) |
| accent-ink | `#FFFFFF` |

- One accent, locked. No amber, no brass. Emphasis comes from weight and Geist Mono figures.
- **Type:** Newsreader for display and text (editorial serif), Geist Sans and Geist Mono for the folio, labels, ledger and figures. Two families.

## Fingerprint gate

`design/scrollcraft/FINGERPRINTS.md` is empty (first build), so the gate passes trivially. The row is appended after
the page ships and is verified.
