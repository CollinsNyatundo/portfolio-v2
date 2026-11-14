import type { Metadata } from "next";
import Link from "next/link";
import { BenchObject } from "@/components/bench-object";
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
        <span className="caveat">Evidence: Private work</span>
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
          className={`inline-flex min-h-11 items-center rounded-[2px] border px-3.5 font-sans text-sm no-underline lg:min-h-9 ${
            on
              ? "bg-surface border-text text-text font-semibold"
              : "bg-surface/60 border-border text-muted hover:border-text hover:text-text"
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
      <Folio title="Work" currentPath="/work" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-12">
        <main id="main" className="mx-auto max-w-6xl pt-12 lg:pt-16">
          <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
            Work
          </h1>
          <p className="mt-4 max-w-[62ch] font-serif text-xl">
            Case studies show how each system was tested and where it falls
            short. Every figure comes with the data it was measured on, or a{" "}
            <span className="caveat">Private work</span> label.
          </p>

          <nav aria-label="Filter by tag" className="mt-8">
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
            <section aria-labelledby="case-studies" className="mt-12">
              <h2
                id="case-studies"
                className="font-display text-2xl leading-tight lg:text-3xl"
              >
                Case studies
              </h2>
              <ol className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {index.caseStudies.map((s) => (
                  <li
                    key={s.slug}
                    className="bg-surface border-border flex flex-col justify-between rounded-[2px] border p-5"
                  >
                    <div>
                      <BenchObject slug={s.slug} />
                      <p className="text-muted mt-4 font-sans text-xs">
                        {s.visibility === "private" ? (
                          <span className="caveat">
                            {visibilityLabel[s.visibility]}
                          </span>
                        ) : (
                          visibilityLabel[s.visibility]
                        )}
                      </p>
                      <h3 className="font-display mt-2 text-2xl leading-snug [overflow-wrap:break-word]">
                        <Link href={`/work/${s.slug}`}>{s.title}</Link>
                      </h3>
                      <p className="mt-2 font-serif text-base">{s.outcome}</p>
                      <TagList tags={s.tags} />
                    </div>
                    <p className="border-border mt-6 border-t pt-4 font-sans text-sm">
                      <span className="figure text-text block text-2xl font-semibold">
                        {s.headlineMetric.value}
                      </span>
                      <span className="text-text block">
                        {s.headlineMetric.label}
                      </span>
                      <span className="text-muted mt-1 block text-xs">
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
            <section aria-labelledby="projects" className="mt-16">
              <h2
                id="projects"
                className="font-display text-2xl leading-tight lg:text-3xl"
              >
                Other projects
              </h2>
              <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {index.projects.map((p) => (
                  <li
                    key={p.slug}
                    className="bg-surface border-border flex flex-col justify-between rounded-[2px] border p-5"
                  >
                    <div>
                      <h3 className="font-display text-xl leading-snug">
                        {p.title}
                      </h3>
                      <p className="mt-2 font-serif text-base">{p.summary}</p>
                      <TagList tags={p.tags} />
                    </div>
                    <p className="border-border text-muted mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 font-sans text-sm">
                      <span className="figure">{p.year}</span>
                      {p.visibility === "private" ? (
                        <>
                          <span className="caveat">Private work</span>
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
                        <span className="caveat">
                          May take about 30 s to wake
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
        <div className="mx-auto max-w-6xl">
          <Colophon updated="2026-11-04" />
        </div>
      </div>
    </>
  );
}
