import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { focusAreas, principles } from "@/content/about";
import { TAGS } from "@/content/tags";

const narrative = readFileSync("content/about.mdx", "utf8");
const words = narrative.split(/\s+/).filter(Boolean);

describe("about narrative", () => {
  it("stays within 250 words (docs/04 §7)", () => {
    expect(words.length).toBeLessThanOrEqual(250);
  });

  it("has no em dashes and no figures", () => {
    expect(narrative).not.toContain("—");
    // Figures belong in case studies, next to their dataset and source.
    expect(narrative).not.toMatch(/\d/);
  });
});

describe("about data", () => {
  it("focus areas use allow-listed tags, once each", () => {
    const tags = focusAreas.map((a) => a.tag);
    expect(new Set(tags).size).toBe(tags.length);
    for (const t of tags) expect(TAGS).toContain(t);
  });

  it("has four working principles", () => {
    expect(principles).toHaveLength(4);
  });
});
