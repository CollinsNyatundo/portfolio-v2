import type { Metadata } from "next";
import Link from "next/link";
import { Colophon } from "@/components/colophon";
import { Folio } from "@/components/folio";
import { skills } from "@/content/cv";
import type { Experience } from "@/content/schema";
import { mailtoHref, site } from "@/content/site";
import {
  certifications,
  evidenceSource,
  publishedCaseStudies,
  visibleExperience,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "CV",
  description: `CV of ${site.name}, ${site.title} in ${site.location}.`,
  alternates: { canonical: "/cv" },
};

const typeLabel: Record<Experience["type"], string> = {
  "full-time": "Full-time",
  internship: "Internship",
  contract: "Contract",
  freelance: "Freelance",
};

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
  "border-border mt-10 border-b pb-1 font-sans text-sm font-semibold tracking-wide uppercase print:mt-4";

/**
 * The CV as a web page (task 4.10, P1). Built from the same content data as
 * the rest of the site; the phone number stays off (showPhone is false).
 * Printing hides the folio and colophon so it fits two A4 pages.
 */
export default function CvPage() {
  const studies = publishedCaseStudies();
  return (
    <>
      <div className="print:hidden">
        <Folio marker="Record" title="CV" />
      </div>
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-16 print:m-0 print:p-0">
        <main
          id="main"
          className="mx-auto max-w-4xl pt-20 lg:pt-32 print:max-w-none print:pt-0 print:text-[9.5pt] print:leading-snug"
        >
          <header>
            <h1 className="font-serif text-[2.25rem] leading-tight font-medium sm:text-[2.5rem] print:text-[20pt]">
              {site.fullName}
            </h1>
            <p className="mt-1 text-lg print:text-[11pt]">{site.title}</p>
            <p className="text-muted mt-2 font-sans text-sm [overflow-wrap:anywhere] print:text-[8.5pt]">
              {site.location} · <a href={mailtoHref}>{site.email}</a> ·{" "}
              <a href={site.links.linkedin}>
                linkedin.com/in/collinsnyagaka001
              </a>{" "}
              · <a href={site.links.github}>github.com/CollinsNyatundo</a>
            </p>
            <p className="mt-4 font-sans text-sm print:hidden">
              <a href={site.cvPath} download>
                Download the PDF
              </a>{" "}
              · <Link href="/work">See the work</Link>
            </p>
          </header>

          <section aria-labelledby="profile">
            <h2 id="profile" className={h2}>
              Profile
            </h2>
            <p className="mt-3 max-w-[70ch] print:mt-1">{site.positioning}</p>
          </section>

          <section aria-labelledby="skills">
            <h2 id="skills" className={h2}>
              Technical skills
            </h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr] print:mt-1 print:grid-cols-[7.5rem_1fr] print:gap-y-0.5">
              {skills.map((g) => (
                <div key={g.group} className="contents">
                  <dt className="font-sans text-sm font-semibold print:text-[9pt]">
                    {g.group}
                  </dt>
                  <dd>{g.items.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="experience">
            <h2 id="experience" className={h2}>
              Experience
            </h2>
            <ol className="mt-3 space-y-4 print:mt-1 print:space-y-1.5">
              {visibleExperience().map((e) => (
                <li key={`${e.org}-${e.start}`} className="break-inside-avoid">
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <h3 className="font-semibold">
                      {e.role}{" "}
                      <span className="text-muted font-normal italic">
                        · {e.org}
                      </span>
                    </h3>
                    <p className="text-muted font-sans text-sm print:text-[8.5pt]">
                      {formatMonth(e.start)} to {formatMonth(e.end)} ·{" "}
                      {typeLabel[e.type]} · {e.location}
                    </p>
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {e.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="work">
            <h2 id="work" className={h2}>
              Selected work
            </h2>
            <ul className="mt-3 space-y-3 print:mt-1 print:space-y-1">
              {studies.map((s) => (
                <li key={s.slug} className="break-inside-avoid">
                  <h3 className="font-semibold">
                    <Link href={`/work/${s.slug}`}>{s.title}</Link>{" "}
                    {s.visibility === "private" && (
                      <span className="text-muted font-sans text-xs font-normal">
                        (Private work)
                      </span>
                    )}
                  </h3>
                  <p>
                    {s.outcome}{" "}
                    <span className="text-muted font-sans text-sm print:text-[8.5pt]">
                      {(() => {
                        const e = evidenceSource(s);
                        return e ? (
                          <a href={e.url}>Evidence</a>
                        ) : (
                          "Evidence: Private work"
                        );
                      })()}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="education">
            <h2 id="education" className={h2}>
              Education and certifications
            </h2>
            <ul className="mt-3 space-y-1 print:mt-1 print:space-y-0">
              {certifications.map((c) => (
                <li
                  key={c.name}
                  className="flex flex-wrap justify-between gap-x-4"
                >
                  <span>
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-muted">, {c.issuer}</span>
                  </span>
                  <span className="text-muted font-sans text-sm print:text-[8.5pt]">
                    {formatMonth(c.issued)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </main>
        <div className="mx-auto max-w-4xl print:hidden">
          <Colophon updated="2026-11-04" />
        </div>
      </div>
    </>
  );
}
