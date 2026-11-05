import type { MetadataRoute } from "next";
import { publishedCaseStudies, publishedNotes, showNotes } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";

/** Every public page; filtered views (?tag=, ?topic=) are left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "/",
    "/work",
    "/demos",
    "/demos/fraud",
    "/demos/ml-systems-search",
    "/about",
    "/contact",
    "/cv",
  ].map((path) => ({
    url: absoluteUrl(path),
  }));
  const studies = publishedCaseStudies().map((s) => ({
    url: absoluteUrl(`/work/${s.slug}`),
    lastModified: s.updated,
  }));
  const notes = showNotes()
    ? [
        { url: absoluteUrl("/notes") },
        ...publishedNotes().map((n) => ({
          url: absoluteUrl(`/notes/${n.slug}`),
          lastModified: n.updated ?? n.published,
        })),
      ]
    : [];
  return [...pages, ...studies, ...notes];
}
