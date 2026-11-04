import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import Narrative from "@/content/about.mdx";
import { focusAreas, principles } from "@/content/about";
import type { Experience } from "@/content/schema";
import { mailtoHref, site } from "@/content/site";
import {
  certifications,
  projects,
  publishedCaseStudies,
  visibleExperience,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Collins Nyagaka, AI and machine-learning engineer in Nairobi: how he works, his experience and certifications.",
};

const typeLabel: Record<Experience["type"], string> = {
  "full-time": "Full-time",
  internship: "Internship",
  contract: "Contract",
  freelance: "Freelance",
};

/** "2024-09" -> "Sep 2024"; "2025" stays "2025" (months are never guessed). */
function formatMonth(value: string): string {
  if (value === "present") return "present";
  if (/^\d{4}$/.test(value)) return value;
  return new Date(`${value}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const h2 =
  "font-serif text-[1.75rem] leading-tight font-medium lg:text-[2.125rem]";

/** About (docs/03 §2, docs/04 §7): narrative, focus, method, experience, education. */
export default function AboutPage() {
  const usedTags = new Set(
    [...publishedCaseStudies(), ...projects.filter((p) => !p.archived)].flatMap(
      (i) => i.tags,
    ),
  );
  const areas = focusAreas.filter((a) => usedTags.has(a.tag));
  const degrees = certifications.filter((c) => c.kind === "degree");
  const certificates = certifications.filter((c) => c.kind === "certificate");

  return (
    <>
      <Folio marker="Profile" title="About" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16">
        <main id="main" className="mx-auto max-w-5xl pt-20 lg:pt-32">
          <h1 className="font-serif text-[2.25rem] leading-[1.05] font-medium tracking-[-0.015em] sm:text-[2.5rem] lg:text-[4rem]">
            About
          </h1>

          <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-16">
            <figure>
              <Image
                src="/images/collins.jpg"
                alt="Collins Nyagaka, smiling, in a black shirt against a grey studio background"
                width={1200}
                height={1200}
                sizes="(min-width: 768px) 300px, 90vw"
                className="h-auto w-full max-w-[20rem]"
                priority
              />
              <figcaption className="text-muted mt-3 font-sans text-sm">
                {site.title}. {site.location}, {site.utcOffsetLabel}.
              </figcaption>
            </figure>
            <div className="text-lg [&>p+p]:mt-5" data-narrative>
              <Narrative />
              <p className="font-sans text-base">
                <a href={mailtoHref}>{site.primaryActionLabel}</a> ·{" "}
                <a href={site.cvPath} download>
                  CV (PDF)
                </a>
              </p>
            </div>
          </div>

          {areas.length > 0 && (
            <section aria-labelledby="focus" className="mt-24">
              <h2 id="focus" className={h2}>
                Focus areas
              </h2>
              <ul className="mt-8 grid gap-8 md:grid-cols-2">
                {areas.map((a) => (
                  <li key={a.tag} className="border-border border-t pt-5">
                    <h3 className="font-serif text-2xl font-medium">
                      {a.title}
                    </h3>
                    <p className="mt-2 max-w-[48ch]">{a.body}</p>
                    <p className="mt-3 font-sans text-sm">
                      <Link href={`/work?tag=${a.tag}`}>
                        See the {a.title.toLowerCase()} work
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="method" className="mt-24">
            <h2 id="method" className={h2}>
              How I work
            </h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-2">
              {principles.map((p) => (
                <li key={p.title} className="border-border border-t pt-5">
                  <h3 className="font-serif text-2xl leading-snug font-medium">
                    {p.title}
                  </h3>
                  <p className="text-muted mt-2">{p.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="experience" className="mt-24">
            <h2 id="experience" className={h2}>
              Experience
            </h2>
            <ol className="border-border mt-8 border-t">
              {visibleExperience().map((e) => (
                <li
                  key={`${e.org}-${e.start}`}
                  className="border-border grid gap-2 border-b py-6 md:grid-cols-[11rem_1fr] md:gap-10"
                >
                  <p className="text-muted font-sans text-sm">
                    <time dateTime={e.start}>{formatMonth(e.start)}</time> to{" "}
                    {e.end === "present" ? (
                      "present"
                    ) : (
                      <time dateTime={e.end}>{formatMonth(e.end)}</time>
                    )}
                  </p>
                  <div>
                    <h3 className="font-sans text-lg font-semibold">
                      {e.role}
                    </h3>
                    <p className="text-muted font-sans text-sm">
                      {e.org} · {typeLabel[e.type]} · {e.location}
                    </p>
                    <ul className="mt-3 max-w-[62ch] list-disc space-y-2 pl-5">
                      {e.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="education" className="mt-24">
            <h2 id="education" className={h2}>
              Education and certifications
            </h2>
            <ul className="border-border mt-8 border-t">
              {[...degrees, ...certificates].map((c) => (
                <li
                  key={c.name}
                  className="border-border grid gap-1 border-b py-4 md:grid-cols-[11rem_1fr] md:gap-10"
                >
                  <p className="text-muted font-sans text-sm">
                    <time dateTime={c.issued}>{formatMonth(c.issued)}</time>
                  </p>
                  <p>
                    {c.credentialUrl ? (
                      <a
                        href={c.credentialUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {c.name}
                        <span className="sr-only"> (opens in new tab)</span>
                      </a>
                    ) : (
                      <span className="font-medium">{c.name}</span>
                    )}
                    <span className="text-muted">, {c.issuer}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-04" />
        </div>
      </div>
    </>
  );
}
