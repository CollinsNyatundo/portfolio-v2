import type { MetadataRoute } from "next";
import { publishedCaseStudies, publishedNotes, showNotes } from "@/lib/content";
import { PAGE_UPDATED, type FixedPage } from "@/lib/pages";
import { absoluteUrl } from "@/lib/seo";

/** Every public page; filtered views (?tag=, ?topic=) are left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const fixed: FixedPage[] = [
    "/",
    "/work",
    "/demos",
    "/demos/fraud",
    "/demos/ml-systems-search",
    "/about",
    "/contact",
    "/cv",
  ];
  const pages = fixed.map((path) => ({
    url: absoluteUrl(path),
    lastModified: PAGE_UPDATED[path],
  }));
  const studies = publishedCaseStudies().map((s) => ({
    url: absoluteUrl(`/work/${s.slug}`),
    lastModified: s.updated,
  }));
  const notes = showNotes()
    ? [
        { url: absoluteUrl("/notes"), lastModified: PAGE_UPDATED["/notes"] },
        ...publishedNotes().map((n) => ({
          url: absoluteUrl(`/notes/${n.slug}`),
          lastModified: n.updated ?? n.published,
        })),
      ]
    : [];
  return [...pages, ...studies, ...notes];
}
