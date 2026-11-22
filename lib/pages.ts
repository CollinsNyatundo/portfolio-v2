/**
 * When each fixed page's content last changed. The page's colophon and the
 * sitemap's lastmod both read from here, so they can't drift apart. Case
 * studies and notes carry their own `updated` dates in front matter.
 *
 * Change a date only when that page's visible content changes (rule 14:
 * no invented dates).
 */
export const PAGE_UPDATED = {
  "/": "2026-11-22",
  "/work": "2026-11-04",
  "/demos": "2026-11-22",
  "/demos/fraud": "2026-11-19",
  "/demos/ml-systems-search": "2026-11-04",
  "/about": "2026-11-14",
  "/contact": "2026-11-22",
  "/cv": "2026-11-14",
  "/notes": "2026-11-05",
} as const satisfies Record<string, `${number}-${number}-${number}`>;

export type FixedPage = keyof typeof PAGE_UPDATED;
