import { noteBySlug } from "@/lib/content";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Note by Collins Nyagaka";
export const size = ogSize;
export const contentType = ogContentType;

/** Social preview for a note: its title and summary, no figures (rule 1). */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const note = noteBySlug((await params).slug);
  if (!note) return ogImage({ eyebrow: "Note", title: "Not found" });
  return ogImage({ eyebrow: "Note", title: note.title, body: note.summary });
}
