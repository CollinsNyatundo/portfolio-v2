import type { Metadata } from "next";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { MlsysSearch } from "@/components/demos/mlsys-search";
import { Folio } from "@/components/folio";
import { demos, projects } from "@/lib/content";

const demo = demos.find((d) => d.slug === "ml-systems-search")!;
const project = projects.find((p) => p.slug === demo.caseStudy);

export const metadata: Metadata = {
  title: demo.title,
  description: demo.summary,
  alternates: { canonical: "/demos/ml-systems-search" },
};

const h2 = "font-sans text-sm font-semibold tracking-wide uppercase";

/** Demo page (docs/04 §7): what it does, the surface, how it works, model card. */
export default function MlsysSearchPage() {
  return (
    <>
      <Folio marker="Demo" title={demo.title} currentPath="/demos" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16">
        <main id="main" className="mx-auto max-w-5xl pt-20 lg:pt-32">
          <p className="text-muted font-sans text-sm">
            <Link href="/demos">Demos</Link>
          </p>
          <h1 className="mt-4 font-serif text-[2.25rem] leading-[1.05] font-medium tracking-[-0.015em] sm:text-[2.5rem] lg:text-[4rem]">
            {demo.title}
          </h1>
          <p className="mt-6 max-w-[62ch] text-xl">{demo.summary}</p>

          <section aria-label="Search" className="mt-12">
            <MlsysSearch />
          </section>

          <details className="border-border mt-16 border-t pt-6">
            <summary className="cursor-pointer font-serif text-2xl font-medium">
              How it works
            </summary>
            <div className="mt-4 max-w-[62ch] space-y-4">
              <p>
                The book&apos;s chapters are split into sections and indexed
                with SQLite full-text search, ranked by BM25 with section
                headings weighted above body text. It&apos;s the same index the
                MCP server builds, saved as a read-only file.
              </p>
              <p>
                Your words are reduced to plain tokens and passed as bound
                parameters, so search operators and SQL never reach the
                database. Nothing you type is stored or logged.
              </p>
            </div>
          </details>

          <section
            aria-labelledby="card"
            className="border-border mt-10 border-t pt-6"
          >
            <h2 id="card" className={h2}>
              Model card
            </h2>
            <dl className="mt-4 grid gap-4 md:grid-cols-[10rem_1fr]">
              <dt className="text-muted font-sans text-sm">Data</dt>
              <dd>{demo.modelCard.data}</dd>
              <dt className="text-muted font-sans text-sm">Method</dt>
              <dd>{demo.modelCard.split}</dd>
              <dt className="text-muted font-sans text-sm">Limits</dt>
              <dd>
                <ul className="list-disc space-y-1 pl-5">
                  {demo.modelCard.limits.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </dd>
            </dl>
          </section>

          <section
            aria-labelledby="credit"
            className="border-border mt-10 border-t pt-6"
          >
            <h2 id="credit" className={h2}>
              Credit
            </h2>
            <p className="mt-4 max-w-[62ch]">
              Text from{" "}
              <a
                href="https://mlsysbook.ai/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Machine Learning Systems
                <span className="sr-only"> (opens in new tab)</span>
              </a>{" "}
              by Vijay Janapa Reddi, adapted, under{" "}
              <a
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                rel="noopener noreferrer"
                target="_blank"
              >
                CC BY-NC-SA 4.0
                <span className="sr-only"> (opens in new tab)</span>
              </a>
              .{" "}
              {project?.repoUrl && (
                <>
                  The index and server are in the{" "}
                  <a
                    href={project.repoUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    project repository
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                  .
                </>
              )}
            </p>
          </section>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-04" />
        </div>
      </div>
    </>
  );
}
