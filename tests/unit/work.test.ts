import { describe, expect, it } from "vitest";
import { projects, publishedCaseStudies } from "@/lib/content";
import { parseTag, workIndex } from "@/lib/work";

const studies = publishedCaseStudies();

describe("parseTag", () => {
  it("accepts an allow-listed tag", () => {
    expect(parseTag("ml")).toBe("ml");
  });

  it("ignores unknown, repeated or missing tags", () => {
    expect(parseTag("crypto")).toBeNull();
    expect(parseTag(["ml", "llm"])).toBeNull();
    expect(parseTag(undefined)).toBeNull();
    expect(parseTag("")).toBeNull();
  });
});

describe("workIndex", () => {
  it("shows everything, case studies in their set order, with no tag", () => {
    const index = workIndex(studies, projects, null);
    expect(index.active).toBeNull();
    expect(index.caseStudies.map((s) => s.order)).toEqual(
      [...studies.map((s) => s.order)].sort((a, b) => a - b),
    );
    expect(index.projects.length).toBe(
      projects.filter((p) => !p.archived).length,
    );
  });

  it("keeps only items carrying the active tag", () => {
    const index = workIndex(studies, projects, "fintech");
    expect(index.active).toBe("fintech");
    const items = [...index.caseStudies, ...index.projects];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.tags).toContain("fintech");
  });

  it("offers chips only for tags something uses", () => {
    const used = new Set(
      [...studies, ...projects].flatMap((i) => i.tags as string[]),
    );
    for (const t of workIndex(studies, projects, null).tags)
      expect(used.has(t)).toBe(true);
  });

  it("shows everything when the tag is known but unused", () => {
    // agritech is on the allow-list; nothing published uses it yet.
    const index = workIndex(studies, projects, "agritech");
    expect(index.active).toBeNull();
    expect(index.caseStudies.length).toBe(studies.length);
  });

  it("leaves archived projects out", () => {
    const archived = { ...projects[0], slug: "old-thing", archived: true };
    const index = workIndex(studies, [...projects, archived], null);
    expect(index.projects.map((p) => p.slug)).not.toContain("old-thing");
  });
});
