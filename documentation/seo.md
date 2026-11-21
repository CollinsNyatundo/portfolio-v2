# SEO and Public Indexing

All public pages render per request (`await connection()` in `app/layout.tsx`) so `proxy.ts` attaches a unique CSP nonce while still emitting full semantic HTML, canonical URLs, JSON-LD, and `next/og` metadata (`lib/seo.ts`, `lib/og.tsx`). **The portfolio assistant renders inside a hydrate-gated `<dialog>` and adds zero indexable routes or sitemap entries.**

## Route x SEO Matrix

| Route | Needs SEO | Source | Public-Data-Only Control |
|---|---|---|---|
| `/` | Yes | `app/page.tsx` + `Person` JSON-LD | `jsonLdHtml()` escapes `<` to `\u003c`; omits `showPhone` |
| `/work`, `/work/[slug]` | Yes | `lib/content.ts` (`publishedCaseStudies()`) | Unpublished studies return `notFound()`; private `repoUrl` absent |
| `/notes`, `/notes/[slug]` | Yes (when >= 2 notes) | `lib/content.ts` (`publishedNotes()`) | Draft notes return `notFound()` |
| `/about`, `/contact`, `/cv`, `/demos/*` | Yes | Static TSX + `content/*.ts` | `robots.ts` allows public routes; `sitemap.ts` includes only published slugs |
| `/api/*` (`/api/contact`, `/api/assistant`, `/api/demos/*`) | No | Route handlers / Python functions | Excluded from `sitemap.ts`; `POST` endpoints never indexed |

## Structured data graph

- The home page emits one JSON-LD graph: `ProfilePage` (main entity: the person), `Person` (`@id` `https://collinsnyagaka.com/#person`) and `WebSite` (`#website`, published by the person). Built by `homeJsonLd()` in `lib/seo.ts`.
- Case-study and note `Article` blocks name their author by that same `@id` and are `isPartOf` the website, so search and answer engines see one person, not one per page.
- Notes have their own preview image (`app/notes/[slug]/opengraph-image.tsx`), used by Open Graph, X cards and the `Article` image.

## Titles

`pageTitle()` keeps the ` · Collins Nyagaka` suffix only while the full `<title>` fits in 60 characters; longer case-study and note titles render without it. Visible headings are unchanged.

## Audit record

2026-11-21 OpenSEO crawl of the live site (32 pages): Lighthouse SEO 100 on every page; filtered views (`/work?tag=`, `/contact?topic=`) correctly canonicalise to their base page. Fixed here: the name suffix is dropped from over-long titles (one note title is still over 60 characters on its own), notes without a preview image, colophon links told apart by colour only (Lighthouse accessibility 96). The site is registered in Google Search Console and Bing Webmaster Tools with the sitemap submitted.

The evidence ledger (`components/home/evidence-ledger.tsx`) carries `data-nosnippet` on a `div` inside the wide `aside` and on the narrow `section` (Google honours it only on `div`, `span` and `section`), so search results quote the page copy, not ledger figures. Adjacent inline labels (folio marker and title, ledger value and label, demo feature and score) are separated by a real space so text extraction does not run words together.
