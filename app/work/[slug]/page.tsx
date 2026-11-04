import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
      <Folio marker="Work" title={study.title} />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16">
        <main id="main" className="mx-auto max-w-5xl pt-20 lg:pt-32">
          <header>
            <p className="text-muted font-sans text-sm">
              {visibilityLabel[study.visibility]}
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
            <h1 className="mt-4 max-w-[20ch] font-serif text-[2.25rem] leading-[1.05] font-medium tracking-[-0.015em] [overflow-wrap:break-word] sm:text-[2.5rem] lg:text-[4rem]">
              {study.title}
            </h1>
            <p className="mt-6 max-w-[62ch] text-xl lg:text-2xl">
              {study.outcome}
            </p>
            <dl className="border-border mt-10 grid grid-cols-2 gap-x-8 gap-y-4 border-y py-6 font-sans text-sm md:grid-cols-4">
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
          </header>

          <article className="mt-4">
            <Body
              components={{
                Metrics: () => <MetricTable metrics={study.metrics} />,
                Limits: () => <LimitsList limits={study.limits} />,
              }}
            />
            <section aria-labelledby="evidence" className="mt-20">
              <h2
                id="evidence"
                className="font-serif text-[1.75rem] leading-tight font-medium lg:text-[2.125rem]"
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
