import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import { TAG_LABELS } from "@/content/tags";
import { publishedNotes, showNotes } from "@/lib/content";

export const metadata: Metadata = {
  title: "Notes",
  description:
    "Short technical notes by Collins Nyagaka on evaluation, model serving and the mistakes behind the numbers.",
  alternates: { canonical: "/notes" },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Notes index (docs/03 §2). It exists only once two notes are published. */
export default function NotesPage() {
  if (!showNotes()) notFound();
  const notes = publishedNotes();
  return (
    <>
      <Folio marker="Index" title="Notes" currentPath="/notes" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16">
        <main id="main" className="mx-auto max-w-5xl pt-20 lg:pt-32">
          <h1 className="font-serif text-[2.25rem] leading-[1.05] font-medium tracking-[-0.015em] sm:text-[2.5rem] lg:text-[4rem]">
            Notes
          </h1>
          <p className="mt-6 max-w-[62ch] text-xl">
            Short write-ups of things I learned building the projects, with the
            numbers and the code behind them.
          </p>
          <ol className="border-border mt-12 border-t">
            {notes.map((n) => (
              <li key={n.slug} className="border-border border-b py-8">
                <p className="text-muted font-sans text-sm">
                  <time dateTime={n.published}>{formatDate(n.published)}</time>
                  {" · "}
                  {n.tags.map((t) => TAG_LABELS[t]).join(", ")}
                </p>
                <h2 className="mt-2 font-serif text-2xl leading-snug font-medium">
                  <Link href={`/notes/${n.slug}`}>{n.title}</Link>
                </h2>
                <p className="mt-2 max-w-[62ch]">{n.summary}</p>
              </li>
            ))}
          </ol>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-05" />
        </div>
      </div>
    </>
  );
}
