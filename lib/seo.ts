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

/**
 * JSON for a `<script type="application/ld+json">` data block. `<` is escaped
 * so no string in the data can close the element (Next.js JSON-LD guide).
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
