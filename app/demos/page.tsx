import type { Metadata } from "next";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import { demos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "Small live demos by Collins Nyagaka. Each runs in a sandboxed function and calls no paid model.",
  alternates: { canonical: "/demos" },
};

/** Pages that exist; a demo without one isn't linked (no dead links). */
const pages: Record<string, string> = {
  fraud: "/demos/fraud",
  "ml-systems-search": "/demos/ml-systems-search",
};

export default function DemosPage() {
  const listed = demos.filter((d) => pages[d.slug]);
  return (
    <>
      <Folio title="Demos" currentPath="/demos" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-12">
        <main id="main" className="mx-auto max-w-5xl pt-12 lg:pt-16">
          <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
            Demos
          </h1>
          <p className="mt-4 max-w-[62ch] font-serif text-xl">
            Small working pieces of the projects. Each runs in its own sandboxed
            function, stores nothing you enter, and calls no paid model.
          </p>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {listed.map((d) => (
              <li
                key={d.slug}
                className="bg-surface border-border rounded-[2px] border p-6"
              >
                <h2 className="font-display text-2xl leading-snug">
                  <Link href={pages[d.slug]}>{d.title}</Link>
                </h2>
                <p className="mt-2 max-w-[62ch] font-serif">{d.summary}</p>
              </li>
            ))}
          </ul>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-04" />
        </div>
      </div>
    </>
  );
}
