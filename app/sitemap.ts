import type { MetadataRoute } from "next";
import { publishedCaseStudies } from "@/lib/content";
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
  return [...pages, ...studies];
}
