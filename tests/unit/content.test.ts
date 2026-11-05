import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  aboutProblems,
  skillProblems,
  buildIndex,
  ContentError,
  demoReferenceProblems,
  headings,
  sectionProblems,
} from "../../scripts/build-content.ts";
import {
  checkUrl,
  collectLinks,
  isAllowedHost,
} from "../../scripts/check-links.ts";
import { demos } from "../../content/projects.ts";

const fixtures = join(process.cwd(), "tests", "fixtures", "content");
// Fixture content has none of the site's case studies, so its demos are
// offline: a live demo must point at a published study.
const fixtureDemos = demos.map((d) => ({ ...d, status: "offline" as const }));
const validFile = join(fixtures, "valid", "case-studies", "sample-study.mdx");

/** Copy the valid fixture, apply an edit to the MDX source, and build. */
function buildWith(edit: (source: string) => string) {
  const dir = mkdtempSync(join(tmpdir(), "content-"));
  cpSync(join(fixtures, "valid"), dir, { recursive: true });
  const file = join(dir, "case-studies", "sample-study.mdx");
  writeFileSync(file, edit(readFileSync(validFile, "utf8")));
  return () => buildIndex(dir, fixtureDemos);
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
    const index = buildIndex(join(fixtures, "valid"), fixtureDemos);
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

describe("about data", () => {
  const area = { tag: "fintech", title: "Fintech", body: "Fraud scoring." };
  const rule = { title: "Say what isn't done", body: "Limits in every study." };

  it("accepts valid focus areas and principles", () => {
    expect(aboutProblems([area], [rule])).toEqual([]);
  });

  it("rejects empty titles and bodies", () => {
    expect(aboutProblems([{ ...area, title: "" }], [])).not.toEqual([]);
    expect(aboutProblems([{ ...area, body: "" }], [])).not.toEqual([]);
    expect(aboutProblems([], [{ ...rule, body: "" }])).not.toEqual([]);
  });

  it("rejects unknown tags, extra fields and repeated tags", () => {
    expect(aboutProblems([{ ...area, tag: "crypto" }], [])).not.toEqual([]);
    expect(aboutProblems([{ ...area, extra: 1 }], [])).not.toEqual([]);
    expect(aboutProblems([area, area], [])).toContain(
      "focusAreas: each tag may appear once",
    );
  });
});

describe("cv skills", () => {
  const ok = { group: "MLOps", items: ["MLflow"] };

  it("accepts a valid group", () => {
    expect(skillProblems([ok])).toEqual([]);
  });

  it("rejects empty groups, empty items, extra fields and repeats", () => {
    expect(skillProblems([{ ...ok, items: [] }])).not.toEqual([]);
    expect(skillProblems([{ ...ok, items: [""] }])).not.toEqual([]);
    expect(skillProblems([{ ...ok, group: "" }])).not.toEqual([]);
    expect(skillProblems([{ ...ok, level: 5 }])).not.toEqual([]);
    expect(skillProblems([ok, ok])).toContain(
      "skills: each group may appear once",
    );
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

  it("checks bare GitHub repo and profile links through the API", () => {
    expect(checkUrl("https://github.com/CollinsNyatundo/portfolio-v2")).toBe(
      "https://api.github.com/repos/CollinsNyatundo/portfolio-v2",
    );
    expect(checkUrl("https://github.com/CollinsNyatundo")).toBe(
      "https://api.github.com/users/CollinsNyatundo",
    );
    const blob = "https://github.com/CollinsNyatundo/repo/blob/abc/file.json";
    expect(checkUrl(blob)).toBe(blob);
    expect(checkUrl("https://tundotechsystems.com")).toBe(
      "https://tundotechsystems.com",
    );
  });

  it("collects every evidence, repo and profile link", () => {
    const urls = collectLinks(join(fixtures, "valid"), fixtureDemos).map(
      (l) => l.url,
    );
    expect(urls).toContain(
      "https://github.com/CollinsNyatundo/production-ai-template",
    );
    expect(urls).toContain("https://github.com/CollinsNyatundo");
    expect(urls.every((u) => u.startsWith("https://"))).toBe(true);
  });
});
