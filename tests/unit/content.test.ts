import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildIndex,
  ContentError,
  demoReferenceProblems,
  headings,
  sectionProblems,
} from "../../scripts/build-content.ts";
import { collectLinks, isAllowedHost } from "../../scripts/check-links.ts";

const fixtures = join(process.cwd(), "tests", "fixtures", "content");
const validFile = join(fixtures, "valid", "case-studies", "sample-study.mdx");

/** Copy the valid fixture, apply an edit to the MDX source, and build. */
function buildWith(edit: (source: string) => string) {
  const dir = mkdtempSync(join(tmpdir(), "content-"));
  cpSync(join(fixtures, "valid"), dir, { recursive: true });
  const file = join(dir, "case-studies", "sample-study.mdx");
  writeFileSync(file, edit(readFileSync(validFile, "utf8")));
  return () => buildIndex(dir);
}

function problemsOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof ContentError) return error.problems.join("\n");
    throw error;
  }
  return "";
}

describe("content index", () => {
  it("accepts the repository's own content", () => {
    expect(() => buildIndex(join(process.cwd(), "content"))).not.toThrow();
  });

  it("accepts a valid case study", () => {
    const index = buildIndex(join(fixtures, "valid"));
    expect(index.caseStudies.map((c) => c.slug)).toEqual(["sample-study"]);
    expect(index.caseStudies[0].featured).toBe(false);
  });

  it("rejects a metric without its dataset (D-05)", () => {
    const run = buildWith((s) =>
      s.replace(/dataset: time-ordered holdout,\s*/, ""),
    );
    expect(problemsOf(run)).toMatch(/metrics\.0\.dataset/);
  });

  it("rejects a metric without a caveat (D-05)", () => {
    const run = buildWith((s) => s.replace(/caveat: target was 0\.85,\s*/, ""));
    expect(problemsOf(run)).toMatch(/metrics\.0\.caveat/);
  });

  it("rejects evidence without a URL unless it's private", () => {
    const run = buildWith((s) =>
      s.replace("url: null, private: true", "url: null, private: false"),
    );
    expect(problemsOf(run)).toMatch(/must be marked private/);
  });

  it("rejects a private case study that links a repo (D-19)", () => {
    const run = buildWith((s) =>
      s.replace("visibility: public", "visibility: private"),
    );
    expect(problemsOf(run)).toMatch(/must not link a repo/);
  });

  it("rejects a slug that doesn't match the file name", () => {
    const run = buildWith((s) =>
      s.replace("slug: sample-study", "slug: other-study"),
    );
    expect(problemsOf(run)).toMatch(/must match the file name/);
  });

  it("rejects unknown frontmatter keys and tags", () => {
    expect(
      problemsOf(
        buildWith((s) => s.replace("order: 1", "order: 1\nhype: true")),
      ),
    ).toMatch(/hype/);
    expect(
      problemsOf(
        buildWith((s) => s.replace("[ml, evaluation]", "[ml, blockchain]")),
      ),
    ).toMatch(/tags\.1/);
  });

  it("rejects a missing required section (M2.4)", () => {
    const run = buildWith((s) => s.replace("## Limits\n", ""));
    expect(problemsOf(run)).toMatch(/missing sections: ## Limits/);
  });

  it("rejects sections out of order", () => {
    const run = buildWith((s) =>
      s
        .replace("## Constraints", "## TEMP")
        .replace("## Approach", "## Constraints")
        .replace("## TEMP", "## Approach"),
    );
    expect(problemsOf(run)).toMatch(/out of order/);
  });
});

describe("demo references", () => {
  const studies = [
    { slug: "creditcard-fraud", published: true },
    { slug: "draft-study", published: false },
  ];

  it("lets offline demos point anywhere until they ship", () => {
    expect(
      demoReferenceProblems(
        [{ slug: "a", status: "offline", caseStudy: "nowhere" }],
        studies,
      ),
    ).toEqual([]);
  });

  it("requires live demos to point at a published case study", () => {
    expect(
      demoReferenceProblems(
        [{ slug: "a", status: "live", caseStudy: "creditcard-fraud" }],
        studies,
      ),
    ).toEqual([]);
    expect(
      demoReferenceProblems(
        [{ slug: "b", status: "live", caseStudy: "draft-study" }],
        studies,
      ),
    ).toHaveLength(1);
    // A project card slug isn't a case study page.
    expect(
      demoReferenceProblems(
        [{ slug: "c", status: "degraded", caseStudy: "ml-systems-mcp-server" }],
        studies,
      ),
    ).toHaveLength(1);
  });
});

describe("headings", () => {
  it("ignores headings inside code fences", () => {
    expect(headings("## A\n```\n## B\n```\n## C")).toEqual(["A", "C"]);
    expect(sectionProblems("## Problem")).toHaveLength(1);
  });
});

describe("link checker", () => {
  it("allows only https on listed hosts", () => {
    expect(isAllowedHost("https://github.com/CollinsNyatundo")).toBe(true);
    expect(isAllowedHost("https://legalai-kenya.vercel.app")).toBe(true);
    expect(isAllowedHost("http://github.com/CollinsNyatundo")).toBe(false);
    expect(isAllowedHost("https://evil.example.com")).toBe(false);
    expect(isAllowedHost("https://github.com.evil.example")).toBe(false);
  });

  it("collects every evidence, repo and profile link", () => {
    const urls = collectLinks(join(fixtures, "valid")).map((l) => l.url);
    expect(urls).toContain(
      "https://github.com/CollinsNyatundo/production-ai-template",
    );
    expect(urls).toContain("https://github.com/CollinsNyatundo");
    expect(urls.every((u) => u.startsWith("https://"))).toBe(true);
  });
});
