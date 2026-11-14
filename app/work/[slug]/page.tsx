import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BenchObject } from "@/components/bench-object";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import {
  EvidenceList,
  LimitsList,
  MetricTable,
} from "@/components/case-study/parts";
import { caseStudyBySlug } from "@/lib/content";

const visibilityLabel = {
  public: "Public code",
  partial: "Partly public",
  private: "Private work",
} as const;

function formatPeriod(start: string, end: string): string {
  const fmt = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} to ${end === "present" ? "present" : fmt(end)}`;
}

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const study = caseStudyBySlug((await params).slug);
  if (!study) return {};
  return {
    title: study.title,
    description: study.outcome,
    alternates: { canonical: `/work/${study.slug}` },
    openGraph: {
      type: "article",
      siteName: "Collins Nyagaka",
      title: study.title,
      description: study.outcome,
      modifiedTime: study.updated,
    },
  };
}

export default async function CaseStudyPage({
  params,
}: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const study = caseStudyBySlug(slug);
  if (!study) notFound();

  // Compiled at build time by @next/mdx; no runtime evaluation (D-29).
  const { default: Body } = await import(
    `@/content/case-studies/${study.slug}.mdx`
  );

  return (
    <>
      <Folio title={study.title} />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-12">
        <main id="main" className="mx-auto max-w-5xl pt-12 lg:pt-16">
          <header className="grid items-start gap-8 md:grid-cols-[15rem_1fr] lg:grid-cols-[18rem_1fr] lg:gap-10">
            <BenchObject slug={study.slug} priority />
            <div>
              <p className="text-muted font-sans text-sm">
                {study.visibility === "private" ? (
                  <span className="caveat">
                    {visibilityLabel[study.visibility]}
                  </span>
                ) : (
                  visibilityLabel[study.visibility]
                )}
                {study.repoUrl && (
                  <>
                    {" · "}
                    <a
                      href={study.repoUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Repository
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  </>
                )}
                {study.visibility === "private" && (
                  <>
                    {" · "}
                    <Link href={`/contact?topic=${study.slug}`}>
                      Request a walkthrough
                    </Link>
                  </>
                )}
                {study.liveUrl && (
                  <>
                    {" · "}
                    <a
                      href={study.liveUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Live app
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  </>
                )}
              </p>
              <h1 className="font-display mt-3 max-w-[24ch] text-3xl leading-[1.08] [overflow-wrap:break-word] sm:text-4xl lg:text-5xl">
                {study.title}
              </h1>
              <p className="mt-4 max-w-[62ch] font-serif text-lg lg:text-xl">
                {study.outcome}
              </p>

              <dl className="border-border mt-6 grid gap-4 border-t pt-5 font-sans sm:grid-cols-2">
                {study.metrics.slice(0, 2).map((m) => (
                  <div key={m.name}>
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

              <dl className="border-border mt-6 grid grid-cols-2 gap-x-8 gap-y-4 border-y py-4 font-sans text-sm md:grid-cols-4">
                <div>
                  <dt className="text-muted">Role</dt>
                  <dd className="mt-1">{study.role}</dd>
                </div>
                <div>
                  <dt className="text-muted">Period</dt>
                  <dd className="mt-1">
                    {formatPeriod(study.period.start, study.period.end)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted">Stack</dt>
                  <dd className="mt-1">{study.stack.join(", ")}</dd>
                </div>
              </dl>
            </div>
          </header>

          <article className="bg-surface border-border mt-10 rounded-[2px] border p-6 font-serif sm:p-10">
            <Body
              components={{
                Metrics: () => <MetricTable metrics={study.metrics} />,
                Limits: () => <LimitsList limits={study.limits} />,
              }}
            />
            <section aria-labelledby="evidence" className="mt-16">
              <h2
                id="evidence"
                className="font-display text-2xl leading-tight lg:text-3xl"
              >
                Evidence
              </h2>
              <EvidenceList evidence={study.evidence} />
            </section>
          </article>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated={study.updated} />
        </div>
      </div>
    </>
  );
}
