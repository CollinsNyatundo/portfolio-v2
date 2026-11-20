import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAssistantCorpus,
  CorpusError,
  CORPUS_SCHEMA_VERSION,
  extractMdxSections,
} from "../../scripts/build-assistant-corpus.ts";
import type { Project } from "../../content/schema.ts";
import { experience } from "../../content/experience.ts";
import { site } from "../../content/site.ts";

const BANNED_COPY = [
  /\bpassionate\b/i,
  /\bninja\b/i,
  /\brockstar\b/i,
  /\bcutting[- ]edge\b/i,
  /\bleverag(e|es|ed|ing)\b/i,
  /\bproduction[- ]grade\b/i,
];

function makeFixtureRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "assistant-corpus-"));
  cpSync(join(process.cwd(), "tests", "fixtures", "content", "valid"), dir, {
    recursive: true,
  });
  writeFileSync(
    join(dir, "about.mdx"),
    "Engineer based in Nairobi building evaluated ML systems.\n",
  );
  return dir;
}

describe("assistant AST corpus compiler (M7.2)", () => {
  it("builds the real repository corpus deterministically within byte and copy budgets", () => {
    const a = buildAssistantCorpus(process.cwd());
    const b = buildAssistantCorpus(process.cwd());
    expect(a.schemaVersion).toBe(CORPUS_SCHEMA_VERSION);
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.chunks.length).toBeGreaterThan(40);
    expect(a.facts.length).toBeGreaterThan(30);

    const routeSet = new Set(a.routeRegistry);
    for (const chunk of a.chunks) {
      expect(routeSet.has(chunk.route), chunk.id).toBe(true);
    }
    for (const fact of a.facts) {
      expect(routeSet.has(fact.route), fact.id).toBe(true);
    }

    const serialized = JSON.stringify(a);
    expect(serialized).not.toMatch(/\+254|\b07\d{8}\b/);
    expect(serialized).not.toContain("\u2014");
    for (const manifestId of a.manifestChunkIds) {
      const m = a.chunks.find((c) => c.id === manifestId)!;
      for (const re of BANNED_COPY) {
        expect(m.text, `${manifestId}: ${re}`).not.toMatch(re);
      }
    }
  });

  it("excludes unpublished case studies, draft notes, hidden experience and archived projects", () => {
    const contentDir = makeFixtureRoot();
    const samplePath = join(contentDir, "case-studies", "sample-study.mdx");
    const sample = readFileSync(samplePath, "utf8");
    writeFileSync(
      join(contentDir, "case-studies", "secret-draft-study.mdx"),
      sample
        .replace("slug: sample-study", "slug: secret-draft-study")
        .replace("title: Sample study", "title: Secret Unpublished Study")
        .replace("published: true", "published: false")
        .replace("order: 1", "order: 2"),
    );
    mkdirSync(join(contentDir, "notes"), { recursive: true });
    writeFileSync(
      join(contentDir, "notes", "hidden-draft-note.mdx"),
      [
        "---",
        "slug: hidden-draft-note",
        "title: Hidden Draft Note",
        "summary: Never appear in assistant corpus.",
        'published: "2026-11-05"',
        "tags: [ml]",
        "draft: true",
        "---",
        "",
        "Secret draft body text.",
      ].join("\n"),
    );

    const projectsFixture: Project[] = [
      {
        slug: "archived-secret",
        title: "Archived Internal Tool",
        summary: "Archived item must not appear.",
        tags: ["ml"],
        visibility: "public",
        repoUrl: "https://github.com/CollinsNyatundo/archived-secret",
        year: 2024,
        archived: true,
      },
    ];
    const expFixture = [
      ...experience,
      {
        org: "Stealth Employer",
        role: "Hidden Role",
        type: "full-time" as const,
        start: "2025-01",
        end: "2025-06",
        location: "Nairobi",
        remote: false,
        bullets: ["Hidden bullet must stay out."],
        visible: false,
      },
    ];

    const corpus = buildAssistantCorpus(process.cwd(), {
      contentDir,
      projectsData: projectsFixture,
      experienceData: expFixture,
    });
    const text = JSON.stringify(corpus);
    expect(text).not.toContain("Secret Unpublished Study");
    expect(text).not.toContain("Hidden Draft Note");
    expect(text).not.toContain("Secret draft body text");
    expect(text).not.toContain("Archived Internal Tool");
    expect(text).not.toContain("Stealth Employer");
    expect(text).not.toContain("Hidden bullet must stay out");
  });

  it("strips repoUrl on private projects and url on private evidence even if present in schema input", () => {
    const contentDir = makeFixtureRoot();
    const samplePath = join(contentDir, "case-studies", "sample-study.mdx");
    const privateStudy = readFileSync(samplePath, "utf8")
      .replace("visibility: public", "visibility: private")
      .replace(
        "repoUrl: https://github.com/CollinsNyatundo/production-ai-template\n",
        "",
      )
      .replace(
        'url: "https://github.com/CollinsNyatundo/production-ai-template",\n      private: false',
        'url: "https://github.com/CollinsNyatundo/leaked-evidence-repo",\n      private: true',
      );
    writeFileSync(samplePath, privateStudy);

    const privateProjectWithUrl: Project[] = [
      {
        slug: "private-client-system",
        title: "Private Client System",
        summary: "Private system summary.",
        tags: ["ml"],
        visibility: "private",
        repoUrl: "https://github.com/CollinsNyatundo/leaked-private-repo",
        year: 2026,
      },
    ];

    const corpus = buildAssistantCorpus(process.cwd(), {
      contentDir,
      projectsData: privateProjectWithUrl,
    });
    const text = JSON.stringify(corpus);
    expect(text).toContain("Private Client System");
    expect(text).not.toContain("leaked-private-repo");
    expect(text).not.toContain("leaked-evidence-repo");
  });

  it("rejects phone numbers in site projection", () => {
    const contentDir = makeFixtureRoot();
    expect(() =>
      buildAssistantCorpus(process.cwd(), {
        contentDir,
        siteData: {
          ...site,
          availabilityNote: "Call +254706807114 anytime",
        },
      }),
    ).toThrow(CorpusError);
  });

  it("ignores headings inside fenced code blocks and rejects unsupported JSX", () => {
    const sections = extractMdxSections(
      [
        "## Problem",
        "",
        "```md",
        "## Fake heading inside fence",
        "```",
        "",
        '<Callout title="Caveat block">Important limitation.</Callout>',
      ].join("\n"),
      { where: "test.mdx" },
    );
    expect(sections.map((s) => s.heading)).toEqual(["Problem"]);
    expect(sections[0].callouts[0].title).toBe("Caveat block");
    expect(sections[0].text).toContain("Important limitation.");

    expect(() =>
      extractMdxSections("## Problem\n\n<UnknownWidget />", {
        where: "bad.mdx",
      }),
    ).toThrow(CorpusError);
  });
});
