import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Colophon } from "@/components/colophon";
import { FraudDemo } from "@/components/demos/fraud-demo";
import { Folio } from "@/components/folio";
import { caseStudyBySlug, demos } from "@/lib/content";

const demo = demos.find((d) => d.slug === "fraud")!;
const study = caseStudyBySlug(demo.caseStudy);

export const metadata: Metadata = {
  title: demo.title,
  description: demo.summary,
  alternates: { canonical: "/demos/fraud" },
};

const h2 = "font-display text-xl leading-snug";

/** Demo page (docs/04 §7): what it does, the surface, how it works, model card. */
export default function FraudDemoPage() {
  return (
    <>
      <Folio title={demo.title} currentPath="/demos" />
      <div className="px-4 sm:px-6 lg:ml-56 lg:px-12">
        <main id="main" className="mx-auto max-w-5xl pt-12 lg:pt-16">
          <p className="text-muted font-sans text-sm">
            <Link href="/demos">Demos</Link>
          </p>
          <h1 className="font-display mt-3 text-3xl leading-[1.05] sm:text-4xl lg:text-5xl">
            {demo.title}
          </h1>
          <p className="mt-4 max-w-[62ch] font-serif text-xl">{demo.summary}</p>

          <section
            aria-label="Demo"
            className="bg-surface border-border mt-8 rounded-[2px] border p-5 sm:p-6"
          >
            <Suspense fallback={null}>
              <FraudDemo />
            </Suspense>
          </section>

          <details className="bg-surface border-border mt-8 rounded-[2px] border p-5 sm:p-6">
            <summary className="font-display cursor-pointer text-xl">
              How it works
            </summary>
            <div className="mt-4 max-w-[65ch] space-y-4 font-serif">
              <p>
                The function rebuilds the model&apos;s 79 inputs from the
                transaction you send and the 10 transactions before it, exactly
                as the training pipeline did. A test checks that it gives the
                same probability as the original pipeline on 1,000 held-out
                rows.
              </p>
              <p>
                The LightGBM model returns a margin. The probability is the
                sigmoid of that margin plus the training init score, then the
                project&apos;s Platt calibration; the decision compares the
                calibrated value with the tuned threshold. The five reasons are
                the model&apos;s own feature contributions, in log-odds units.
              </p>
              <p>
                The model time is the in-process inference alone; the round trip
                includes the network. Nothing you enter is stored.
              </p>
            </div>
          </details>

          <section
            aria-labelledby="card"
            className="bg-surface border-border mt-8 rounded-[2px] border p-5 sm:p-6"
          >
            <h2 id="card" className={h2}>
              Model card
            </h2>
            <dl className="mt-4 grid gap-4 md:grid-cols-[10rem_1fr]">
              <dt className="text-muted font-sans text-sm">Data</dt>
              <dd>{demo.modelCard.data}</dd>
              <dt className="text-muted font-sans text-sm">Split</dt>
              <dd>{demo.modelCard.split}</dd>
              <dt className="text-muted font-sans text-sm">Measured</dt>
              <dd>
                <ul className="list-disc space-y-1 pl-5">
                  {demo.modelCard.metrics.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </dd>
              <dt className="text-muted font-sans text-sm">Limits</dt>
              <dd>
                <ul className="list-disc space-y-1.5 pl-5">
                  {demo.modelCard.limits.map((l) => (
                    <li key={l}>
                      <span className="caveat-note">{l}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>
            {study && (
              <p className="mt-6 font-sans text-sm">
                <Link href={`/work/${study.slug}`}>Read the case study</Link>
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
              </p>
            )}
          </section>
        </main>
        <div className="mx-auto max-w-5xl">
          <Colophon updated="2026-11-04" />
        </div>
      </div>
    </>
  );
}
