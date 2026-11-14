import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import { caseStudyBySlug, noteBySlug } from "@/lib/content";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/notes/[slug]">): Promise<Metadata> {
  const note = noteBySlug((await params).slug);
  if (!note) return {};
  return {
    title: note.title,
    description: note.summary,
    alternates: { canonical: `/notes/${note.slug}` },
    openGraph: {
      type: "article",
      siteName: "Collins Nyagaka",
      title: note.title,
      description: note.summary,
      publishedTime: note.published,
      modifiedTime: note.updated ?? note.published,
    },
  };
}

/** One note (docs/03 §2): long-form reading on a sheet in Literata. */
export default async function NotePage({ params }: PageProps<"/notes/[slug]">) {
  const note = noteBySlug((await params).slug);
  if (!note) notFound();
  const study = note.caseStudy ? caseStudyBySlug(note.caseStudy) : undefined;

  // Compiled at build time by @next/mdx; no runtime evaluation (D-29).
  const { default: Body } = await import(`@/content/notes/${note.slug}.mdx`);

  return (
    <>
      <Folio title={note.title} />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-12">
        <main id="main" className="mx-auto max-w-5xl pt-12 lg:pt-16">
          <header>
            <p className="text-muted font-sans text-sm">
              <Link href="/notes">Notes</Link> ·{" "}
              <time dateTime={note.published}>
                {formatDate(note.published)}
              </time>
            </p>
            <h1 className="font-display mt-3 max-w-[24ch] text-3xl leading-[1.08] [overflow-wrap:break-word] sm:text-4xl lg:text-5xl">
              {note.title}
            </h1>
            <p className="mt-4 max-w-[62ch] font-serif text-xl">
              {note.summary}
            </p>
          </header>
          <article className="bg-surface border-border mt-8 rounded-[2px] border p-6 font-serif sm:p-10">
            <Body />
          </article>
          {study && (
            <p className="border-border mt-10 border-t pt-6 font-sans text-sm">
              Related case study:{" "}
              <Link href={`/work/${study.slug}`}>{study.title}</Link>
            </p>
          )}
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated={note.updated ?? note.published} />
        </div>
      </div>
    </>
  );
}
