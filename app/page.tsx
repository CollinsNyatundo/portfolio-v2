import Image from "next/image";
import { headers } from "next/headers";
import { LazyFraudDemo } from "@/components/home/lazy-fraud-demo";
import { principles } from "@/content/about";
import { jsonLdHtml, personJsonLd } from "@/lib/seo";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { CvLink } from "@/components/cv-link";
import { Folio } from "@/components/folio";
import { EvidenceLedger } from "@/components/home/evidence-ledger";
import { ScrollEngine } from "@/components/home/scroll-engine";
import { mailtoHref, site } from "@/content/site";
import { demos, projects, publishedCaseStudies } from "@/lib/content";
import { ledgerEntries } from "@/lib/ledger";

const BUILD_DATE = "2026-11-04";

const failures = [
  {
    lead: "A model that looks great until it meets next month's data.",
    body: "Shuffled splits let it learn from the future, so the score in the notebook never shows up in production.",
  },
  {
    lead: "A legal answer that cites a section that isn't there.",
    body: "Retrieval found something close enough, and nothing checked whether it was close enough to trust.",
  },
  {
    lead: "One firm's records visible to another.",
    body: "Isolation lived in the interface, and the database underneath let anyone ask for anything.",
  },
];

/**
 * The home page, chaptered editorial (scroll-craft BRIEF, D-25): title page,
 * Problem, Method, Work, then the demo (from M4) and the colophon. Chapter
 * grounds change on hard edges; nothing is pinned until the demo exists.
 */
export default async function Home() {
  // JSON-LD is a data block, never executed; it still carries the nonce (D-28).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const studies = publishedCaseStudies();
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
      <Folio marker="Title" title="Collins Nyagaka" />
      <EvidenceLedger entries={ledger} />

      <div className="lg:ml-56 xl:mr-64">
        <main id="main">
          {/* 0 · Title page: type only, depth from planes that drift apart. */}
          <section
            aria-labelledby="title"
            data-sc-act="flow"
            className="title-page relative isolate overflow-hidden px-4 pt-24 pb-28 sm:px-6 lg:px-16 lg:pt-40 lg:pb-44"
          >
            {/* Clip box for the planes, separate from the act element. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 overflow-hidden"
            >
              <div className="title-page__paper" data-sc-parallax="-0.8" />
              <div className="title-page__drawing" data-sc-parallax="-0.4">
                <svg
                  viewBox="0 0 400 400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.75"
                >
                  <circle cx="200" cy="200" r="150" />
                  <circle cx="200" cy="200" r="96" strokeDasharray="4 6" />
                  <line x1="20" y1="200" x2="380" y2="200" />
                  <line x1="200" y1="20" x2="200" y2="380" />
                  <rect x="140" y="140" width="120" height="120" />
                </svg>
              </div>
            </div>
            <div className="mx-auto max-w-5xl">
              <h1
                id="title"
                className="max-w-[12ch] font-serif text-[3.5rem] leading-[0.98] font-medium tracking-[-0.025em] sm:text-[5rem] lg:text-[7rem]"
              >
                {site.name}
              </h1>
              <p className="text-muted mt-8 font-sans text-base font-medium tracking-tight lg:text-lg">
                {site.title}
              </p>
              <p className="mt-6 max-w-[40ch] text-xl lg:text-2xl">
                {site.positioning}
              </p>
              <p className="text-muted mt-6 font-sans text-sm">
                {site.availabilityNote} · {site.location} ·{" "}
                {site.utcOffsetLabel}
              </p>
              <ul
                aria-label="Start here"
                className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-sans text-sm"
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
              <div
                aria-hidden="true"
                className="title-page__rule"
                data-sc-parallax="0.6"
              />
            </div>
          </section>

          {/* I · Problem: three failures, each on its own ground. */}
          <section aria-labelledby="problem" className="chapter">
            <div className="chapter__opener">
              <p className="chapter__number">I</p>
              <h2 id="problem" className="chapter__title">
                Problem
              </h2>
            </div>
            {failures.map((f, i) => (
              <div
                key={f.lead}
                data-sc-act="flow"
                className={`px-4 py-20 sm:px-6 lg:px-16 lg:py-28 ${i % 2 === 0 ? "bg-surface-2" : "bg-bg"}`}
              >
                <div
                  className="mx-auto max-w-5xl lg:pl-[30%]"
                  data-sc-reveal="up"
                  data-sc-reveal-at="0.05 0.45"
                >
                  <p className="max-w-[24ch] font-serif text-3xl leading-tight font-medium lg:text-4xl">
                    {f.lead}
                  </p>
                  <p className="text-muted mt-5 max-w-[48ch]">{f.body}</p>
                </div>
              </div>
            ))}
          </section>

          {/* II · Method: the portrait plate and four working rules. */}
          <section
            aria-labelledby="method"
            className="chapter px-4 sm:px-6 lg:px-16"
          >
            <div className="chapter__opener !px-0">
              <p className="chapter__number">II</p>
              <h2 id="method" className="chapter__title">
                Method
              </h2>
            </div>
            <div className="mx-auto grid max-w-5xl gap-12 pb-28 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
              <figure className="plate" data-sc-act="flow">
                <div
                  className="plate__frame"
                  aria-hidden="true"
                  data-sc-parallax="-0.5"
                />
                <div className="plate__photo" data-sc-parallax="0.4">
                  <Image
                    src="/images/collins.jpg"
                    alt="Collins Nyagaka, smiling, in a black shirt against a grey studio background"
                    width={1200}
                    height={1200}
                    sizes="(min-width: 768px) 360px, 90vw"
                    className="h-auto w-full"
                  />
                </div>
                <figcaption className="text-muted mt-4 font-sans text-sm">
                  Collins Nyagaka, Nairobi. AI and machine-learning engineer.
                </figcaption>
              </figure>
              <ol className="space-y-10" data-sc-in data-sc-stagger="70">
                {principles.map((p) => (
                  <li key={p.title} className="border-border border-t pt-5">
                    <div>
                      <p className="font-serif text-2xl leading-snug font-medium">
                        {p.title}
                      </p>
                      <p className="text-muted mt-2">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* III · Work: spreads with real figures that feed the ledger. */}
          <section
            aria-labelledby="work"
            className="chapter bg-surface px-4 sm:px-6 lg:px-16"
          >
            <div className="chapter__opener !px-0">
              <p className="chapter__number">III</p>
              <h2 id="work" className="chapter__title">
                Work
              </h2>
            </div>
            <div className="mx-auto max-w-5xl pb-28">
              {studies.map((study) => (
                <article
                  key={study.slug}
                  className="border-border grid gap-10 border-t py-16 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
                >
                  <div data-sc-in>
                    <h3 className="font-serif text-3xl leading-tight font-medium lg:text-4xl">
                      <Link
                        href={`/work/${study.slug}`}
                        className="text-text no-underline hover:underline"
                      >
                        {study.title}
                      </Link>
                    </h3>
                    <p className="mt-4 max-w-[48ch]">{study.outcome}</p>
                    <p className="mt-6 font-sans text-sm">
                      <Link href={`/work/${study.slug}`}>
                        Read the case study
                      </Link>
                    </p>
                  </div>
                  <dl className="space-y-5 font-sans">
                    {study.metrics
                      .filter((m) => m.ledger)
                      .map((m) => (
                        <div
                          key={m.name}
                          data-ledger-id={`${study.slug}:${m.name}`}
                        >
                          <dt className="text-muted text-sm">
                            {m.ledgerLabel ?? m.name}
                          </dt>
                          <dd className="figure mt-1 text-3xl">{m.value}</dd>
                          <dd className="text-muted mt-1 text-xs">
                            {m.dataset}. {m.caveat}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </article>
              ))}

              <div className="border-border border-t pt-12">
                <h3 className="text-muted font-sans text-sm">More projects</h3>
                <ul className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
                  {projects.slice(0, 4).map((p) => (
                    <li key={p.slug}>
                      <p className="font-serif text-xl font-medium">
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
                      <p className="text-muted mt-2 text-base">{p.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {liveDemo && (
            <>
              {/* Intertitle: authored silence before the peak (BRIEF). */}
              <section
                aria-label="Interlude"
                className="px-4 py-40 text-center"
              >
                <p className="font-serif text-4xl" data-sc-reveal="up">
                  Now try one.
                </p>
              </section>
              {/* IV · Demo: the peak. The visitor's run is written into the ledger. */}
              <section
                aria-labelledby="demo"
                className="chapter bg-surface px-4 sm:px-6 lg:px-16"
              >
                <div className="chapter__opener !px-0">
                  <p className="chapter__number">IV</p>
                  <h2 id="demo" className="chapter__title">
                    Score a transaction
                  </h2>
                </div>
                <div className="mx-auto max-w-5xl pb-28">
                  <p className="max-w-[48ch]">
                    A real transaction from the held-out test data, with the 10
                    before it. Score it, change it, score it again.
                  </p>
                  <div className="mt-8">
                    <LazyFraudDemo />
                  </div>
                </div>
              </section>
            </>
          )}

          {/* V · Colophon: the ledger as a table, then the one action. */}
          <section
            aria-labelledby="colophon"
            className="chapter px-4 sm:px-6 lg:px-16"
          >
            <div className="chapter__opener !px-0">
              <p className="chapter__number">V</p>
              <h2 id="colophon" className="chapter__title">
                Colophon
              </h2>
            </div>
            <div className="mx-auto max-w-5xl">
              <p className="max-w-[48ch]">
                Every figure on this page, with what it was measured on and
                where to check it.
              </p>
              <div
                className="relative mt-8 overflow-x-auto"
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
                        <td className="figure py-3 pr-4 whitespace-nowrap">
                          {e.value}
                        </td>
                        <th
                          scope="row"
                          className="py-3 pr-4 text-left font-normal"
                        >
                          {e.label}
                        </th>
                        <td className="text-muted py-3 pr-4">{e.dataset}</td>
                        <td className="text-muted py-3 pr-4">{e.caveat}</td>
                        <td className="py-3 pr-4">
                          <Link href={`/work/${e.projectSlug}`}>
                            {e.project}
                          </Link>
                        </td>
                        <td className="py-3">
                          {e.source ? (
                            <a
                              href={e.source}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              Repository file
                              <span className="sr-only">
                                {" "}
                                (opens in new tab)
                              </span>
                            </a>
                          ) : (
                            <span className="text-muted">Private work</span>
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
              <p className="mt-16 max-w-[48ch] font-serif text-2xl">
                If this is the kind of work you need,{" "}
                <a href={mailtoHref}>{site.primaryActionLabel}</a> and say what
                you&apos;re building.
              </p>
            </div>
          </section>
        </main>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-16">
          <Colophon updated={BUILD_DATE} />
        </div>
      </div>
    </>
  );
}
