/**
 * Validates every piece of content and writes a typed index for the app
 * (docs/06 M2.1, M2.2, M2.4). Runs before dev, build, typecheck and tests:
 *
 *   node scripts/build-content.ts            validate and write the index
 *   node scripts/build-content.ts --check    validate only
 *
 * MDX bodies are compiled by @next/mdx at build time (no eval, so the strict
 * CSP holds); this script only reads frontmatter and headings.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import matter from "gray-matter";
import type { ZodType } from "zod";
import { certifications, experience } from "../content/experience.ts";
import { demos, projects } from "../content/projects.ts";
import {
  CASE_STUDY_SECTIONS,
  caseStudyFrontmatter,
  certification,
  demo,
  experience as experienceSchema,
  noteFrontmatter,
  project,
  type CaseStudyFrontmatter,
  type NoteFrontmatter,
} from "../content/schema.ts";

export const MAX_PUBLISHED_CASE_STUDIES = 5;
export const MAX_FEATURED = 3;

export type ContentIndex = {
  caseStudies: CaseStudyFrontmatter[];
  notes: NoteFrontmatter[];
};

export class ContentError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Content is invalid:\n  - ${problems.join("\n  - ")}`);
    this.problems = problems;
  }
}

function check<T>(
  schema: ZodType<T>,
  value: unknown,
  where: string,
  problems: string[],
): T | undefined {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const path = issue.path.length ? issue.path.join(".") : "(root)";
    problems.push(`${where}: ${path}: ${issue.message}`);
  }
  return undefined;
}

/** `## Heading` lines, in order, ignoring fenced code blocks. */
export function headings(body: string): string[] {
  const found: string[] = [];
  let fenced = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const match = !fenced && /^##\s+(.+?)\s*$/.exec(line);
    if (match) found.push(match[1]);
  }
  return found;
}

/** Problems with a case study body's required sections (M2.4). */
export function sectionProblems(body: string): string[] {
  const present = headings(body);
  const problems: string[] = [];
  const missing = CASE_STUDY_SECTIONS.filter((s) => !present.includes(s));
  if (missing.length)
    problems.push(
      `missing sections: ${missing.map((s) => `## ${s}`).join(", ")}`,
    );
  const order = present.filter((h) =>
    (CASE_STUDY_SECTIONS as readonly string[]).includes(h),
  );
  if (!missing.length && order.join("|") !== CASE_STUDY_SECTIONS.join("|")) {
    problems.push(
      `sections out of order; expected ${CASE_STUDY_SECTIONS.join(" → ")}`,
    );
  }
  return problems;
}

function mdxFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

export function buildIndex(contentDir: string): ContentIndex {
  const problems: string[] = [];
  const caseStudies: CaseStudyFrontmatter[] = [];
  const notes: NoteFrontmatter[] = [];

  for (const file of mdxFiles(join(contentDir, "case-studies"))) {
    const where = `case-studies/${basename(file)}`;
    const { data, content } = matter(readFileSync(file, "utf8"));
    const fm = check(caseStudyFrontmatter, data, where, problems);
    if (!fm) continue;
    if (fm.slug !== basename(file, ".mdx"))
      problems.push(`${where}: slug "${fm.slug}" must match the file name`);
    for (const p of sectionProblems(content)) problems.push(`${where}: ${p}`);
    caseStudies.push(fm);
  }

  for (const file of mdxFiles(join(contentDir, "notes"))) {
    const where = `notes/${basename(file)}`;
    const fm = check(
      noteFrontmatter,
      matter(readFileSync(file, "utf8")).data,
      where,
      problems,
    );
    if (!fm) continue;
    if (fm.slug !== basename(file, ".mdx"))
      problems.push(`${where}: slug "${fm.slug}" must match the file name`);
    notes.push(fm);
  }

  const published = caseStudies.filter((c) => c.published);
  if (published.length > MAX_PUBLISHED_CASE_STUDIES) {
    problems.push(
      `${published.length} published case studies; the maximum is ${MAX_PUBLISHED_CASE_STUDIES} (D-13)`,
    );
  }
  const featured = published.filter((c) => c.featured);
  if (featured.length > MAX_FEATURED) {
    problems.push(
      `${featured.length} featured case studies; the maximum is ${MAX_FEATURED}`,
    );
  }

  const slugs = new Set<string>();
  for (const s of [
    ...caseStudies.map((c) => c.slug),
    ...projects.map((p) => p.slug),
  ]) {
    if (slugs.has(s))
      problems.push(`duplicate slug "${s}" across case studies and projects`);
    slugs.add(s);
  }

  projects.forEach((p, i) =>
    check(project, p, `projects[${i}] (${p.slug})`, problems),
  );
  experience.forEach((e, i) =>
    check(experienceSchema, e, `experience[${i}] (${e.org})`, problems),
  );
  certifications.forEach((c, i) =>
    check(certification, c, `certifications[${i}] (${c.name})`, problems),
  );

  const demoSlugs = new Set(demos.map((d) => d.slug));
  demos.forEach((d, i) => {
    check(demo, d, `demos[${i}] (${d.slug})`, problems);
    // An offline demo isn't linked anywhere yet, so its case study may not exist.
    if (d.status !== "offline" && !slugs.has(d.caseStudy)) {
      problems.push(
        `demos[${i}] (${d.slug}): caseStudy "${d.caseStudy}" doesn't exist`,
      );
    }
  });
  for (const c of caseStudies) {
    if (c.demo && !demoSlugs.has(c.demo))
      problems.push(
        `case-studies/${c.slug}.mdx: demo "${c.demo}" doesn't exist`,
      );
  }
  for (const n of notes) {
    if (n.caseStudy && !caseStudies.some((c) => c.slug === n.caseStudy)) {
      problems.push(
        `notes/${n.slug}.mdx: caseStudy "${n.caseStudy}" doesn't exist`,
      );
    }
  }

  if (problems.length) throw new ContentError(problems);
  const byOrder = (a: CaseStudyFrontmatter, b: CaseStudyFrontmatter) =>
    a.order - b.order;
  return {
    caseStudies: caseStudies.sort(byOrder),
    notes: notes.sort((a, b) => b.published.localeCompare(a.published)),
  };
}

if (import.meta.main) {
  const root = join(import.meta.dirname, "..");
  try {
    const index = buildIndex(join(root, "content"));
    if (!process.argv.includes("--check")) {
      const out = join(root, "content", ".generated");
      mkdirSync(out, { recursive: true });
      writeFileSync(
        join(out, "index.json"),
        JSON.stringify(index, null, 2) + "\n",
      );
    }
    console.log(
      `content ok: ${index.caseStudies.length} case studies, ${index.notes.length} notes, ${projects.length} projects`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
