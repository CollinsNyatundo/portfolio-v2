import { caseStudyBySlug, evidenceSource } from "@/lib/content";
import { ogContentType, ogImage, ogSize } from "@/lib/og";
import { evidenceLabel } from "@/lib/seo";

export const alt = "Case study by Collins Nyagaka";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const study = caseStudyBySlug((await params).slug);
  if (!study) return ogImage({ eyebrow: "Case study", title: "Not found" });
  return ogImage({
    eyebrow:
      study.visibility === "private"
        ? "Case study · Private work"
        : "Case study",
    title: study.title,
    figure: study.headlineMetric,
    // The figure's provenance travels with it (AGENTS.md rule 1).
    source: evidenceLabel(evidenceSource(study)?.url ?? null),
  });
}
