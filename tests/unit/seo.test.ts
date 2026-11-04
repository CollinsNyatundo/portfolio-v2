import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { site } from "@/content/site";
import { publishedCaseStudies } from "@/lib/content";
import {
  SITE_URL,
  absoluteUrl,
  evidenceLabel,
  jsonLdHtml,
  personJsonLd,
} from "@/lib/seo";

describe("sitemap", () => {
  const urls = sitemap().map((e) => e.url);

  it("lists the main pages and every published case study", () => {
    for (const path of [
      "/",
      "/work",
      "/demos",
      "/demos/ml-systems-search",
      "/about",
      "/contact",
      "/cv",
      "/cv",
    ])
      expect(urls).toContain(absoluteUrl(path));
    for (const s of publishedCaseStudies())
      expect(urls).toContain(absoluteUrl(`/work/${s.slug}`));
  });

  it("uses only the canonical origin and no query strings", () => {
    for (const url of urls) {
      expect(url.startsWith(SITE_URL)).toBe(true);
      expect(url).not.toContain("?");
    }
  });
});

describe("evidenceLabel", () => {
  it("shortens a pinned GitHub file URL and labels private work", () => {
    expect(
      evidenceLabel(
        "https://github.com/CollinsNyatundo/creditcard-fraud/blob/d5016073f702b75a8c27934003e32f85d0a6689e/reports/x.json",
      ),
    ).toBe(
      "Evidence: github.com/CollinsNyatundo/creditcard-fraud/reports/x.json",
    );
    expect(evidenceLabel(null)).toBe("Evidence: Private work");
  });
});

describe("robots", () => {
  it("allows the site, keeps crawlers off the API and names the sitemap", () => {
    const r = robots();
    expect(r.sitemap).toBe(absoluteUrl("/sitemap.xml"));
    expect(r.rules).toMatchObject({ allow: "/", disallow: "/api/" });
  });
});

describe("Person JSON-LD", () => {
  it("links the LinkedIn and GitHub profiles", () => {
    const p = personJsonLd();
    expect(p["@type"]).toBe("Person");
    expect(p.sameAs).toEqual([site.links.linkedin, site.links.github]);
  });

  it("escapes < so data can't close the script element", () => {
    const html = jsonLdHtml({ name: "</script><script>alert(1)</script>" });
    expect(html).not.toContain("<");
    expect(JSON.parse(html).name).toBe("</script><script>alert(1)</script>");
  });
});
