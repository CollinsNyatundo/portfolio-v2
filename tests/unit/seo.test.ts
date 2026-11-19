import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { site } from "@/content/site";
import { publishedCaseStudies, publishedNotes } from "@/lib/content";
import {
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
  caseStudyJsonLd,
  evidenceLabel,
  jsonLdHtml,
  noteJsonLd,
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

describe("sitemap dates", () => {
  it("gives every entry a lastModified date", () => {
    for (const e of sitemap()) {
      expect(e.lastModified, e.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("article structured data", () => {
  it("describes a case study with only dates on record", () => {
    const study = publishedCaseStudies()[0];
    const a = caseStudyJsonLd(study);
    expect(a["@type"]).toBe("Article");
    expect(a.headline).toBe(study.title);
    expect(a.dateModified).toBe(study.updated);
    expect(a).not.toHaveProperty("datePublished");
    expect(a.author.name).toBe(site.name);
  });

  it("dates a note from its front matter", () => {
    for (const note of publishedNotes()) {
      const a = noteJsonLd(note);
      expect(a.datePublished).toBe(note.published);
      expect(a.dateModified).toBe(note.updated ?? note.published);
    }
  });

  it("numbers breadcrumbs from 1 with absolute URLs", () => {
    const b = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Work", path: "/work" },
    ]);
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(b.itemListElement[1].item).toBe(absoluteUrl("/work"));
  });
});
