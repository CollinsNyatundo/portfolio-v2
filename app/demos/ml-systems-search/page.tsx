import type { Metadata } from "next";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { MlsysSearch } from "@/components/demos/mlsys-search";
import { Folio } from "@/components/folio";
import { demos, projects } from "@/lib/content";
import { PAGE_UPDATED } from "@/lib/pages";
// The index's own manifest, so the counts and commit on this page always
// match the file the function serves (AGENTS.md rule 14: no copied figures).
import manifest from "@/api/_data/mlsys.json";

const demo = demos.find((d) => d.slug === "ml-systems-search")!;
const project = projects.find((p) => p.slug === demo.caseStudy);
const commitUrl = `${manifest.source}/tree/${manifest.commit}`;

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
      <Folio title={demo.title} currentPath="/demos" />
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

          <section
            aria-labelledby="scope"
            className="border-border mt-16 border-t pt-6"
          >
            <h2 id="scope" className={h2}>
              What you can search
            </h2>
            <div className="mt-4 max-w-[62ch] space-y-4">
              <p>
                The index holds {manifest.chapters} chapter and appendix files
                from both volumes of the book. Volume 1 runs from deployment
                paradigms and data engineering through training, model
                compression, hardware acceleration, serving and MLOps. Volume 2
                moves to fleet scale: compute infrastructure, network fabrics,
                distributed training, collective communication, fault tolerance,
                inference at scale, edge intelligence, security and
                sustainability.
              </p>
              <p>
                Search for a concept such as data drift or quantization, a
                failure mode such as training-serving skew, or a design question
                such as batch size and memory. Each result names its chapter and
                section, shows the matching passage with your words marked, and
                links to that chapter at the{" "}
                <a href={commitUrl} rel="noopener noreferrer" target="_blank">
                  exact commit the index was built from
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
                , so you can read the whole section in context.
              </p>
            </div>
          </section>

          <details className="border-border mt-10 border-t pt-6">
            <summary className="cursor-pointer font-serif text-2xl font-medium">
              How it works
            </summary>
            <div className="mt-4 max-w-[62ch] space-y-4">
              <p>
                A build script runs the MCP server&apos;s own index builder on a
                checkout pinned to one commit. It splits each chapter at its
                headings, keeps each section&apos;s own text, and cuts long
                sections at paragraph breaks into pieces of at most 2,500
                characters. The pieces go into an SQLite FTS5 table with Porter
                stemming, so quantize also finds quantization. The table is
                saved as a read-only file, with the source commit and a SHA-256
                hash of the file recorded next to it.
              </p>
              <p>
                Your words are reduced to plain tokens and passed as bound
                parameters, so search operators and SQL never reach the
                database. The search first asks for sections that contain every
                word. If none do, it falls back to sections that contain any of
                them. The last word also matches as a prefix, so results appear
                while you are still typing.
              </p>
              <p>
                BM25 ranks the matches, and a word in a section heading counts
                six times as much as a word in the body. Each section appears
                once, up to ten results. Snippets are cleaned for reading:
                Markdown and LaTeX syntax are removed and formulas become plain
                symbols.
              </p>
              <p>
                A Python function on Vercel answers each search. It uses only
                the standard library and opens the index read-only, so a request
                can never change it. Each IP address can run 60 searches in ten
                minutes. If the function can&apos;t be reached, the page shows a
                recorded example instead of an empty box.
              </p>
              <p>
                It is the same index the MCP server gives AI assistants, so a
                result here is what an assistant gets when it searches the book.
                Keyword search needs no model and no paid API, and the same
                words always return the same results. Nothing you type is stored
                or logged.
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
          <Colophon updated={PAGE_UPDATED["/demos/ml-systems-search"]} />
        </div>
      </div>
    </>
  );
}
