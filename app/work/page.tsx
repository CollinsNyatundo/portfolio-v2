import type { Metadata } from "next";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import type { CaseStudyFrontmatter } from "@/content/schema";
import { TAG_LABELS, type Tag } from "@/content/tags";
import { evidenceSource, projects, publishedCaseStudies } from "@/lib/content";
import { parseTag, workIndex } from "@/lib/work";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Case studies and projects by Collins Nyagaka, each with its evidence or a Private work label.",
  alternates: { canonical: "/work" },
};

const visibilityLabel = {
  public: "Public code",
  partial: "Partly public",
  private: "Private work",
} as const;

function TagList({ tags }: { tags: Tag[] }) {
  return (
    <ul className="text-muted mt-3 flex flex-wrap gap-x-3 gap-y-1 font-sans text-xs">
      {tags.map((t) => (
        <li key={t}>{TAG_LABELS[t]}</li>
      ))}
    </ul>
  );
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="inline-flex min-h-11 items-center md:min-h-7"
    >
      {children}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

/** The figure's source, next to the figure (AGENTS.md rule 1). */
function HeadlineSource({ study }: { study: CaseStudyFrontmatter }) {
  const source = evidenceSource(study);
  return (
    <span className="mt-1 block" data-headline-source>
      {source ? (
        <a
          href={source.url}
          rel="noopener noreferrer"
          target="_blank"
          className="inline-flex min-h-11 items-center md:min-h-7"
        >
          Evidence
          <span className="sr-only">
            {" "}
            for {study.headlineMetric.label}: {source.label} (opens in new tab)
          </span>
        </a>
      ) : (
        <span className="text-muted">Evidence: Private work</span>
      )}
    </span>
  );
}

/** Work index (docs/03 §2): filter chips are links, so `?tag=` survives back and share. */
export default async function WorkPage({ searchParams }: PageProps<"/work">) {
  const index = workIndex(
    publishedCaseStudies(),
    projects,
    parseTag((await searchParams).tag),
  );

  const chip = (tag: Tag | null, label: string) => {
    const on = index.active === tag;
    return (
      <li key={label}>
        <Link
          href={tag ? `/work?tag=${tag}` : "/work"}
          scroll={false}
          aria-current={on ? "true" : undefined}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 font-sans text-sm no-underline lg:min-h-9 ${
            on
              ? "border-text text-text font-semibold"
              : "border-border text-muted hover:border-text hover:text-text"
          }`}
        >
          {label}
        </Link>
      </li>
    );
  };

  const count = index.caseStudies.length + index.projects.length;

  return (
    <>
      <Folio marker="Index" title="Work" currentPath="/work" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16">
        <main id="main" className="mx-auto max-w-5xl pt-20 lg:pt-32">
          <h1 className="font-serif text-[2.25rem] leading-[1.05] font-medium tracking-[-0.015em] sm:text-[2.5rem] lg:text-[4rem]">
            Work
          </h1>
          <p className="mt-6 max-w-[62ch] text-xl">
            Case studies show how each system was tested and where it falls
            short. Every figure comes with the data it was measured on, or a
            Private work label.
          </p>

          <nav aria-label="Filter by tag" className="mt-10">
            <ul className="flex flex-wrap gap-2">
              {chip(null, "All")}
              {index.tags.map((t) => chip(t, TAG_LABELS[t]))}
            </ul>
          </nav>
          <p className="sr-only" role="status">
            {count} {count === 1 ? "item" : "items"}
            {index.active ? `, tagged ${TAG_LABELS[index.active]}` : ""}
          </p>

          {index.caseStudies.length > 0 && (
            <section aria-labelledby="case-studies" className="mt-16">
              <h2
                id="case-studies"
                className="font-serif text-[1.75rem] leading-tight font-medium lg:text-[2.125rem]"
              >
                Case studies
              </h2>
              <ol className="border-border mt-6 border-t">
                {index.caseStudies.map((s) => (
                  <li
                    key={s.slug}
                    className="border-border grid gap-4 border-b py-8 md:grid-cols-[1fr_14rem] md:gap-10"
                  >
                    <div>
                      <p className="text-muted font-sans text-sm">
                        {visibilityLabel[s.visibility]}
                      </p>
                      <h3 className="mt-2 font-serif text-2xl leading-snug font-medium [overflow-wrap:break-word]">
                        <Link href={`/work/${s.slug}`}>{s.title}</Link>
                      </h3>
                      <p className="mt-3 max-w-[62ch]">{s.outcome}</p>
                      <TagList tags={s.tags} />
                    </div>
                    <p className="font-sans text-sm md:text-right">
                      <span className="figure text-text block text-2xl">
                        {s.headlineMetric.value}
                      </span>
                      <span className="text-text block">
                        {s.headlineMetric.label}
                      </span>
                      <span className="text-muted mt-1 block">
                        {s.headlineMetric.context}
                      </span>
                      <HeadlineSource study={s} />
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {index.projects.length > 0 && (
            <section aria-labelledby="projects" className="mt-20">
              <h2
                id="projects"
                className="font-serif text-[1.75rem] leading-tight font-medium lg:text-[2.125rem]"
              >
                Other projects
              </h2>
              <ul className="border-border mt-6 border-t">
                {index.projects.map((p) => (
                  <li
                    key={p.slug}
                    className="border-border grid gap-2 border-b py-6 md:grid-cols-[1fr_auto] md:gap-10"
                  >
                    <div>
                      <h3 className="font-sans text-lg font-semibold">
                        {p.title}
                      </h3>
                      <p className="mt-2 max-w-[62ch]">{p.summary}</p>
                      <TagList tags={p.tags} />
                    </div>
                    <p className="text-muted flex flex-wrap gap-x-4 font-sans text-sm md:flex-col md:items-end">
                      <span>{p.year}</span>
                      {p.visibility === "private" ? (
                        <>
                          <span>Private work</span>
                          <Link
                            href={`/contact?topic=${p.slug}`}
                            className="inline-flex min-h-11 items-center md:min-h-7"
                          >
                            Request a walkthrough
                          </Link>
                        </>
                      ) : (
                        p.repoUrl && (
                          <ExternalLink href={p.repoUrl}>
                            Repository
                          </ExternalLink>
                        )
                      )}
                      {p.liveUrl && (
                        <ExternalLink href={p.liveUrl}>Live app</ExternalLink>
                      )}
                      {p.liveUrl && p.sleeps && (
                        <span>May take about 30 s to wake</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-04" />
        </div>
      </div>
    </>
  );
}
