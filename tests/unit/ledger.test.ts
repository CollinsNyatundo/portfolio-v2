import { describe, expect, it } from "vitest";
import { evidenceSource, publishedCaseStudies } from "@/lib/content";
import { ledgerEntries } from "@/lib/ledger";

describe("evidenceSource", () => {
  it("is null for private studies and public evidence otherwise", () => {
    for (const s of publishedCaseStudies()) {
      const source = evidenceSource(s);
      if (s.visibility === "private") expect(source).toBeNull();
      else {
        expect(source?.private).toBe(false);
        expect(source?.url).toMatch(/^https:\/\//);
      }
    }
  });
});

describe("evidence ledger", () => {
  it("cites no source for figures from private case studies", () => {
    const privateSlugs = new Set(
      publishedCaseStudies()
        .filter((s) => s.visibility === "private")
        .map((s) => s.slug),
    );
    const entries = ledgerEntries().filter((e) =>
      privateSlugs.has(e.projectSlug),
    );
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) expect(e.source).toBeNull();
  });

  it("cites the repository for figures from public case studies", () => {
    const fraud = ledgerEntries().filter(
      (e) => e.projectSlug === "creditcard-fraud",
    );
    expect(fraud.length).toBeGreaterThan(0);
    for (const e of fraud)
      expect(e.source).toMatch(/^https:\/\/github\.com\/CollinsNyatundo\//);
  });
});
