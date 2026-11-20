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
