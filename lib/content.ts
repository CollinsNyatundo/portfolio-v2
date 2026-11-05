/**
 * Typed access to validated content. The index is written by
 * scripts/build-content.ts, which runs before dev, build, typecheck and tests,
 * so anything read here has already passed the Zod schemas.
 */
import index from "@/content/.generated/index.json";
import { certifications, experience } from "@/content/experience";
import { demos, projects } from "@/content/projects";
import type { CaseStudyFrontmatter, NoteFrontmatter } from "@/content/schema";

const content = index as {
  caseStudies: CaseStudyFrontmatter[];
  notes: NoteFrontmatter[];
};

export function publishedCaseStudies(): CaseStudyFrontmatter[] {
  return content.caseStudies.filter((c) => c.published);
}

type Evidence = CaseStudyFrontmatter["evidence"][number];

/**
 * The public evidence a study's figures can cite, or null for private work.
 * A private study's figures come from private reports; a public link on it
 * (such as a live app) is not their source (AGENTS.md rule 1).
 */
export function evidenceSource(
  study: CaseStudyFrontmatter,
): (Evidence & { url: string }) | null {
  if (study.visibility === "private") return null;
  const e = study.evidence.find((x) => x.url && !x.private);
  return e?.url ? { ...e, url: e.url } : null;
}

export function featuredCaseStudies(): CaseStudyFrontmatter[] {
  return publishedCaseStudies().filter((c) => c.featured);
}

export function caseStudyBySlug(
  slug: string,
): CaseStudyFrontmatter | undefined {
  return publishedCaseStudies().find((c) => c.slug === slug);
}

export function publishedNotes(): NoteFrontmatter[] {
  return content.notes.filter((n) => !n.draft);
}

/** The Notes section only appears once at least two notes exist (docs/03 §2). */
export function noteBySlug(slug: string): NoteFrontmatter | undefined {
  return publishedNotes().find((n) => n.slug === slug);
}

export function showNotes(): boolean {
  return publishedNotes().length >= 2;
}

export function visibleExperience() {
  return experience.filter((e) => e.visible);
}

export { certifications, demos, projects };
