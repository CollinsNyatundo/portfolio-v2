/**
 * Search and sharing metadata (task 3.10). The canonical origin is the planned
 * domain (D-15); previews on *.vercel.app still point search engines there.
 */
import { site } from "@/content/site";
import { PAGE_UPDATED } from "@/lib/pages";

export const SITE_URL = "https://collinsnyagaka.com";

/** Stable node ids, so every block on the site points at one person. */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Google cuts titles near 60 characters; past that, drop the name suffix. */
const TITLE_MAX = 60;
const TITLE_SUFFIX = ` · ${site.name}`;

/**
 * Page title for metadata: the root template adds " · Collins Nyagaka", unless
 * the result would run past what search results show. The visible heading is
 * unchanged; only the <title> loses the suffix.
 */
export function pageTitle(title: string): string | { absolute: string } {
  return title.length + TITLE_SUFFIX.length > TITLE_MAX
    ? { absolute: title }
    : title;
}

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
    "@id": PERSON_ID,
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

/** schema.org WebSite, published by the person. */
export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: site.name,
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  };
}

/**
 * The home page graph: a ProfilePage about one person, on a site that person
 * publishes (Google's ProfilePage guide). Only dates on record (rule 14).
 */
export function homeJsonLd() {
  const { "@context": context, ...person } = personJsonLd();
  return {
    "@context": context,
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}/#profile`,
        url: SITE_URL,
        name: `${site.name}, ${site.title}`,
        isPartOf: { "@id": WEBSITE_ID },
        dateModified: PAGE_UPDATED["/"],
        mainEntity: { "@id": PERSON_ID },
      },
      person,
      websiteJsonLd(),
    ],
  };
}

/** The author block shared by every article: a reference to the one person. */
function author() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: site.name,
    url: SITE_URL,
  };
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
    isPartOf: { "@id": WEBSITE_ID },
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
    isPartOf: { "@id": WEBSITE_ID },
    image: absoluteUrl(`/notes/${note.slug}/opengraph-image`),
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
