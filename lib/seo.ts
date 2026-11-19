/**
 * Search and sharing metadata (task 3.10). The canonical origin is the planned
 * domain (D-15); previews on *.vercel.app still point search engines there.
 */
import { site } from "@/content/site";

export const SITE_URL = "https://collinsnyagaka.com";

/** Absolute URL for a site path. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * A figure's source as short readable text for images, where links can't be
 * clicked: the repo path without the pinned commit, or "Private work".
 */
export function evidenceLabel(url: string | null): string {
  if (!url) return "Evidence: Private work";
  const short = url
    .replace(/^https:\/\//, "")
    .replace(/\/blob\/[0-9a-f]{40}\//, "/");
  return `Evidence: ${short}`;
}

/** schema.org Person for the home page (docs/03 §1: Google search entry). */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    alternateName: site.fullName,
    jobTitle: site.title,
    url: SITE_URL,
    image: absoluteUrl("/images/collins.jpg"),
    email: `mailto:${site.email}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
    sameAs: [site.links.linkedin, site.links.github],
  };
}

/** The author block shared by every article. */
function author() {
  return { "@type": "Person", name: site.name, url: SITE_URL };
}

/**
 * schema.org Article for a case study. Only dates on record are used: a case
 * study has an `updated` date but no publication date (rule 14).
 */
export function caseStudyJsonLd(study: {
  slug: string;
  title: string;
  outcome: string;
  updated: string;
}) {
  const url = absoluteUrl(`/work/${study.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.outcome,
    url,
    mainEntityOfPage: url,
    dateModified: study.updated,
    author: author(),
    image: absoluteUrl(`/work/${study.slug}/opengraph-image`),
  };
}

/** schema.org Article for a note, with its publication date. */
export function noteJsonLd(note: {
  slug: string;
  title: string;
  summary: string;
  published: string;
  updated?: string;
}) {
  const url = absoluteUrl(`/notes/${note.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: note.title,
    description: note.summary,
    url,
    mainEntityOfPage: url,
    datePublished: note.published,
    dateModified: note.updated ?? note.published,
    author: author(),
  };
}

/** schema.org BreadcrumbList from the home page down to the current page. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}

/**
 * JSON for a `<script type="application/ld+json">` data block. `<` is escaped
 * so no string in the data can close the element (Next.js JSON-LD guide).
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
