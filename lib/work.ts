/**
 * The /work index (docs/03 §2, §5): every published case study and project
 * card, filtered by one tag from the URL. Pure, so it is unit tested.
 */
import type { CaseStudyFrontmatter, Project } from "@/content/schema";
import { TAGS, type Tag } from "@/content/tags";

/** A `?tag=` value, or null when it is missing, repeated or not on the allow-list. */
export function parseTag(raw: string | string[] | undefined): Tag | null {
  if (typeof raw !== "string") return null;
  return (TAGS as readonly string[]).includes(raw) ? (raw as Tag) : null;
}

export type WorkIndex = {
  caseStudies: CaseStudyFrontmatter[];
  projects: Project[];
  /** Tags used by at least one item, in allow-list order: the filter chips. */
  tags: Tag[];
  active: Tag | null;
};

export function workIndex(
  studies: CaseStudyFrontmatter[],
  allProjects: Project[],
  requested: Tag | null,
): WorkIndex {
  const projects = allProjects.filter((p) => !p.archived);
  const used = new Set([...studies, ...projects].flatMap((i) => i.tags));
  // A known tag that nothing uses would empty the page; show everything.
  const active = requested && used.has(requested) ? requested : null;
  const has = (item: { tags: Tag[] }) =>
    active === null || item.tags.includes(active);
  return {
    caseStudies: [...studies].sort((a, b) => a.order - b.order).filter(has),
    projects: [...projects].sort((a, b) => b.year - a.year).filter(has),
    tags: TAGS.filter((t) => used.has(t)),
    active,
  };
}
