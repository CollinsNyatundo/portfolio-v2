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
      <Folio title="Notes" currentPath="/notes" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-12">
        <main id="main" className="mx-auto max-w-5xl pt-12 lg:pt-16">
          <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
            Notes
          </h1>
          <p className="mt-4 max-w-[62ch] font-serif text-xl">
            Short write-ups of things I learned building the projects, with the
            numbers and the code behind them.
          </p>
          <ol className="mt-10 grid gap-5">
            {notes.map((n) => (
              <li
                key={n.slug}
                className="bg-surface border-border rounded-[2px] border p-6"
              >
                <p className="text-muted font-sans text-sm">
                  <time dateTime={n.published}>{formatDate(n.published)}</time>
                  {" · "}
                  {n.tags.map((t) => TAG_LABELS[t]).join(", ")}
                </p>
                <h2 className="font-display mt-2 text-2xl leading-snug">
                  <Link href={`/notes/${n.slug}`}>{n.title}</Link>
                </h2>
                <p className="mt-2 max-w-[62ch] font-serif">{n.summary}</p>
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
