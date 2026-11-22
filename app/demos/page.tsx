import type { Metadata } from "next";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import { caseStudyBySlug, demos } from "@/lib/content";
import { PAGE_UPDATED } from "@/lib/pages";

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
          <p className="mt-5 max-w-[62ch]">
            Both demos are Python functions on Vercel. They read a fixed model
            or index that ships with the code, so a result is the same every
            time you ask. Each one lists the data it was built on, how it was
            checked and where it falls short, and links to the case study that
            explains the work behind it.
          </p>
          <ul className="border-border mt-12 border-t">
            {listed.map((d) => {
              const study = caseStudyBySlug(d.caseStudy);
              return (
                <li key={d.slug} className="border-border border-b py-8">
                  <h2 className="font-serif text-2xl font-medium">
                    <Link href={pages[d.slug]}>{d.title}</Link>
                  </h2>
                  <p className="mt-2 max-w-[62ch]">{d.summary}</p>
                  <dl className="text-muted mt-5 grid max-w-[62ch] gap-x-6 gap-y-2 font-sans text-sm sm:grid-cols-[8rem_1fr]">
                    <dt className="text-text font-medium">Data</dt>
                    <dd>{d.modelCard.data}</dd>
                    <dt className="text-text font-medium">Checked on</dt>
                    <dd>{d.modelCard.split}</dd>
                    {d.modelCard.metrics.length > 0 && (
                      <>
                        <dt className="text-text font-medium">Measured by</dt>
                        <dd>{d.modelCard.metrics.join("; ")}</dd>
                      </>
                    )}
                    <dt className="text-text font-medium">Limits</dt>
                    <dd>{d.modelCard.limits.join(" ")}</dd>
                  </dl>
                  {study && (
                    <p className="mt-4 font-sans text-sm">
                      Case study:{" "}
                      <Link href={`/work/${study.slug}`}>{study.title}</Link>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated={PAGE_UPDATED["/demos"]} />
        </div>
      </div>
    </>
  );
}
