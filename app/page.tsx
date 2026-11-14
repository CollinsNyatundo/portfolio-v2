import { headers } from "next/headers";
import Link from "next/link";
import { BenchObject } from "@/components/bench-object";
import { Colophon } from "@/components/colophon";
import { CvLink } from "@/components/cv-link";
import { Folio } from "@/components/folio";
import { EvidenceLedger } from "@/components/home/evidence-ledger";
import { LazyFraudDemo } from "@/components/home/lazy-fraud-demo";
import { ScrollEngine } from "@/components/home/scroll-engine";
import { principles } from "@/content/about";
import { mailtoHref, site } from "@/content/site";
import { demos, projects, publishedCaseStudies } from "@/lib/content";
import { ledgerEntries } from "@/lib/ledger";
import { jsonLdHtml, personJsonLd } from "@/lib/seo";

const BUILD_DATE = "2026-11-04";

/**
 * The home page ("The bench"):
 * 1. First screen: name, positioning sentence, and the working fraud demo inside a sheet
 *    (or the featured case study when the demo is offline).
 * 2. Work row: case studies as bench objects with title, one-line summary and real figures.
 * 3. Method: four working principles in two columns, without sequence numerals.
 * 4. Evidence ledger and contact.
 */
export default async function Home() {
  // JSON-LD is a data block, never executed; it still carries the nonce (D-28).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const studies = publishedCaseStudies();
  const featuredStudy = studies[0];
  const ledger = ledgerEntries();
  const liveDemo = demos.find(
    (d) => d.slug === "fraud" && d.status !== "offline",
  );

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(personJsonLd()) }}
      />
      <ScrollEngine />
      <Folio title="Workbench" />
      <EvidenceLedger entries={ledger} />

      <div className="lg:ml-56 xl:mr-60">
        <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
          {/* 1 · First screen: name, positioning, and fraud demo inside a sheet. */}
          <section
            aria-labelledby="title"
            className="border-border min-h-[82dvh] border-b py-10 lg:py-14"
          >
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
              <div>
                <h1
                  id="title"
                  className="font-display text-4xl leading-[1.02] sm:text-5xl lg:text-6xl"
                >
                  {site.name}
                </h1>
                <p className="text-muted mt-3 font-sans text-base font-medium lg:text-lg">
                  {site.title}
                </p>
                <p className="mt-5 max-w-[54ch] font-serif text-xl leading-relaxed lg:text-2xl">
                  {site.positioning}
                </p>
                <p className="text-muted mt-4 max-w-[58ch] font-serif text-base leading-relaxed">
                  Applied models fail quietly when shuffled splits leak future
                  data, retrieval cites a statute without checking it, or tenant
                  isolation stops at the user interface instead of the database.
                </p>
                <p className="text-muted mt-5 font-sans text-sm lg:hidden">
                  {site.availabilityNote} · {site.location} ·{" "}
                  {site.utcOffsetLabel}
                </p>
                <ul
                  aria-label="Start here"
                  className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-sans text-sm"
                >
                  <li>
                    <Link
                      href="/work"
                      className="inline-flex min-h-11 items-center font-medium"
                    >
                      See the work
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/demos/fraud"
                      className="inline-flex min-h-11 items-center"
                    >
                      Score a transaction
                    </Link>
                  </li>
                  <li>
                    <CvLink
                      from="hero"
                      className="inline-flex min-h-11 items-center"
                    />
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="inline-flex min-h-11 items-center"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="bg-surface border-border rounded-[2px] border p-5 sm:p-6">
                {liveDemo ? (
                  <section aria-labelledby="demo">
                    <h2
                      id="demo"
                      className="font-display text-2xl leading-tight sm:text-3xl"
                    >
                      Score a transaction
                    </h2>
                    <p className="text-muted mt-2 max-w-[58ch] font-serif text-base">
                      A real transaction from the held-out test data, with the
                      10 before it. Score it, change it, score it again.
                    </p>
                    <div className="mt-5">
                      <LazyFraudDemo />
                    </div>
                  </section>
                ) : (
                  featuredStudy && (
                    <article aria-labelledby="featured-study">
                      <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
                        <BenchObject slug={featuredStudy.slug} priority />
                        <div>
                          <h2
                            id="featured-study"
                            className="font-display text-2xl leading-tight"
                          >
                            <Link
                              href={`/work/${featuredStudy.slug}`}
                              className="text-text no-underline hover:underline"
                            >
                              {featuredStudy.title}
                            </Link>
                          </h2>
                          <p className="mt-3 font-serif text-base">
                            {featuredStudy.outcome}
                          </p>
                          <p className="mt-4 font-sans text-sm">
                            <Link href={`/work/${featuredStudy.slug}`}>
                              Read the case study
                            </Link>
                          </p>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            </div>
          </section>

          {/* 2 · Work row: case studies as bench objects with real figures. */}
          <section
            aria-labelledby="work"
            className="border-border border-b py-14 lg:py-16"
          >
            <h2
              id="work"
              className="font-display text-3xl leading-tight sm:text-4xl"
            >
              Work
            </h2>
            <div className="mt-8 grid gap-6">
              {studies.map((study) => (
                <article
                  key={study.slug}
                  data-sc-in
                  className="bg-surface border-border grid gap-5 rounded-[2px] border p-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 sm:p-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8"
                >
                  <div className="max-w-[16rem] sm:max-w-none">
                    <BenchObject slug={study.slug} />
                  </div>
                  <div>
                    <div>
                      <div>
                        <h3 className="font-display text-2xl leading-snug">
                          <Link
                            href={`/work/${study.slug}`}
                            className="text-text no-underline hover:underline"
                          >
                            {study.title}
                          </Link>
                        </h3>
                        <p className="mt-2 max-w-[54ch] font-serif text-base">
                          {study.outcome}
                        </p>
                        <p className="mt-3 font-sans text-sm">
                          <Link href={`/work/${study.slug}`}>
                            Read the case study
                          </Link>
                        </p>
                      </div>
                    </div>

                    <dl className="border-border mt-6 grid gap-x-6 gap-y-5 border-t pt-4 font-sans sm:grid-cols-2 xl:grid-cols-3">
                      {study.metrics
                        .filter((m) => m.ledger)
                        .map((m) => (
                          <div
                            key={m.name}
                            data-ledger-id={`${study.slug}:${m.name}`}
                          >
                            <dt className="text-muted text-xs">
                              {m.ledgerLabel ?? m.name}
                            </dt>
                            <dd className="figure mt-0.5 text-2xl font-semibold">
                              {m.value}
                            </dd>
                            <dd className="text-muted mt-1 text-xs">
                              {m.dataset}.{" "}
                              <span className="caveat-note">{m.caveat}</span>
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10">
              <h3 className="font-display text-xl">More projects</h3>
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {projects.slice(0, 4).map((p) => (
                  <li
                    key={p.slug}
                    className="bg-surface border-border rounded-[2px] border p-5"
                  >
                    <p className="font-display text-lg">
                      {p.repoUrl ? (
                        <a
                          href={p.repoUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="text-text"
                        >
                          {p.title}
                          <span className="sr-only"> (opens in new tab)</span>
                        </a>
                      ) : (
                        p.title
                      )}
                    </p>
                    <p className="text-muted mt-2 font-serif text-base">
                      {p.summary}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 3 · Method: four principles, plain, two columns, no numerals. */}
          <section
            aria-labelledby="method"
            className="border-border border-b py-14 lg:py-16"
          >
            <h2
              id="method"
              className="font-display text-3xl leading-tight sm:text-4xl"
            >
              Method
            </h2>
            <ul
              className="mt-8 grid gap-6 md:grid-cols-2"
              data-sc-in
              data-sc-stagger="70"
            >
              {principles.map((p) => (
                <li
                  key={p.title}
                  className="bg-surface border-border rounded-[2px] border p-5 sm:p-6"
                >
                  <h3 className="font-display text-xl leading-snug">
                    {p.title}
                  </h3>
                  <p className="text-muted mt-2 max-w-[60ch] font-serif text-base">
                    {p.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* 4 · Evidence ledger and contact. */}
          <section aria-labelledby="colophon" className="pt-14 lg:pt-16">
            <h2
              id="colophon"
              className="font-display text-3xl leading-tight sm:text-4xl"
            >
              Evidence ledger
            </h2>
            <p className="mt-3 max-w-[58ch] font-serif text-base">
              Every figure on this page, with what it was measured on and where
              to check it.
            </p>
            <div
              className="bg-surface border-border relative mt-6 overflow-x-auto rounded-[2px] border p-4 sm:p-5"
              role="region"
              aria-label="Evidence table"
              tabIndex={0}
            >
              <table className="w-full min-w-[48rem] border-collapse font-sans text-sm">
                <caption className="sr-only">
                  Evidence for every figure on this page
                </caption>
                <thead>
                  <tr className="border-border text-muted border-b text-left">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Figure
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      What
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Measured on
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Caveat
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Project
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e) => (
                    <tr key={e.id} className="border-border border-b">
                      <td className="figure py-3 pr-4 font-semibold whitespace-nowrap">
                        {e.value}
                      </td>
                      <th
                        scope="row"
                        className="py-3 pr-4 text-left font-normal"
                      >
                        {e.label}
                      </th>
                      <td className="text-muted py-3 pr-4">{e.dataset}</td>
                      <td className="py-3 pr-4">
                        <span className="caveat-note">{e.caveat}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <Link href={`/work/${e.projectSlug}`}>{e.project}</Link>
                      </td>
                      <td className="py-3">
                        {e.source ? (
                          <a
                            href={e.source}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Repository file
                            <span className="sr-only"> (opens in new tab)</span>
                          </a>
                        ) : (
                          <span className="caveat">Private work</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted mt-4 font-sans text-sm">
              {ledger.length} figures from{" "}
              {new Set(ledger.map((e) => e.projectSlug)).size}{" "}
              {new Set(ledger.map((e) => e.projectSlug)).size === 1
                ? "project"
                : "projects"}
              .
            </p>
            <p className="mt-12 max-w-[54ch] font-serif text-2xl">
              If this is the kind of work you need,{" "}
              <a href={mailtoHref}>{site.primaryActionLabel}</a> and say what
              you&apos;re building.
            </p>
          </section>

          <Colophon updated={BUILD_DATE} />
        </main>
      </div>
    </>
  );
}
