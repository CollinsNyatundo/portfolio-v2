import { publishedCaseStudies } from "@/lib/content";

/** One line of the evidence ledger (D-26): a real figure with its source. */
export type LedgerEntry = {
  id: string;
  value: string;
  label: string;
  /** What the figure was measured on (D-05). */
  dataset: string;
  caveat: string;
  project: string;
  projectSlug: string;
  /** First evidence link of the study, or null for private work. */
  source: string | null;
};

/**
 * Every metric marked `ledger: true` in a published case study, in page
 * order. Nothing else can reach the ledger, so it can't show an invented
 * figure (AGENTS.md rule 12).
 */
export function ledgerEntries(): LedgerEntry[] {
  return publishedCaseStudies().flatMap((study) => {
    const source = study.evidence.find((e) => e.url)?.url ?? null;
    return study.metrics
      .filter((m) => m.ledger)
      .map((m) => ({
        id: `${study.slug}:${m.name}`,
        value: m.value,
        label: m.ledgerLabel ?? m.name,
        dataset: m.dataset,
        caveat: m.caveat,
        project: study.title,
        projectSlug: study.slug,
        source,
      }));
  });
}
