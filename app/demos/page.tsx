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
  "ml-systems-search": "/demos/ml-systems-search",
};

export default function DemosPage() {
  const listed = demos.filter((d) => pages[d.slug]);
  return (
    <>
      <Folio marker="Index" title="Demos" currentPath="/demos" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16">
        <main id="main" className="mx-auto max-w-5xl pt-20 lg:pt-32">
          <h1 className="font-serif text-[2.25rem] leading-[1.05] font-medium tracking-[-0.015em] sm:text-[2.5rem] lg:text-[4rem]">
            Demos
          </h1>
          <p className="mt-6 max-w-[62ch] text-xl">
            Small working pieces of the projects. Each runs in its own sandboxed
            function, stores nothing you enter, and calls no paid model.
          </p>
          <ul className="border-border mt-12 border-t">
            {listed.map((d) => (
              <li key={d.slug} className="border-border border-b py-8">
                <h2 className="font-serif text-2xl font-medium">
                  <Link href={pages[d.slug]}>{d.title}</Link>
                </h2>
                <p className="mt-2 max-w-[62ch]">{d.summary}</p>
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
