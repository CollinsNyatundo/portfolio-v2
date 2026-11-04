/**
 * Contact helpers (docs/03 §4, §5). `?topic=<slug>` names a case study or
 * project to ask about. Only known slugs count, so the URL can't inject text
 * into the page or the email subject; anything else falls back to general.
 */
import { site } from "@/content/site";
import type { CaseStudyFrontmatter, Project } from "@/content/schema";

export type ContactTopic = { slug: string; title: string } | null;

export function contactTopic(
  raw: string | string[] | undefined,
  studies: Pick<CaseStudyFrontmatter, "slug" | "title">[],
  projects: Pick<Project, "slug" | "title">[],
): ContactTopic {
  if (typeof raw !== "string") return null;
  const hit = [...studies, ...projects].find((i) => i.slug === raw);
  return hit ? { slug: hit.slug, title: hit.title } : null;
}

/** mailto link; a known topic becomes the subject, never free text from the URL. */
export function contactMailto(topic: ContactTopic): string {
  const subject = topic
    ? `Walkthrough request: ${topic.title}`
    : `Opportunity for ${site.name}`;
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}`;
}
