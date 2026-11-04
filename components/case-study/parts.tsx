import type { ReactNode } from "react";
import type { CaseStudyFrontmatter } from "@/content/schema";

type Metric = CaseStudyFrontmatter["metrics"][number];
type Evidence = CaseStudyFrontmatter["evidence"][number];

/** Metric · Value · Dataset or split · Caveat (docs/04 §5). */
export function MetricTable({ metrics }: { metrics: Metric[] }) {
  return (
    // Focusable so keyboard users can scroll the table on narrow screens.
    <div
      className="my-8 overflow-x-auto"
      role="region"
      aria-label="Results table"
      tabIndex={0}
    >
      <table className="w-full min-w-[36rem] border-collapse font-sans text-sm">
        <caption className="sr-only">
          Measured results with the data each was measured on and its caveat
        </caption>
        <thead>
          <tr className="border-border text-muted border-b text-left">
            <th scope="col" className="py-2 pr-4 font-medium">
              Metric
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              Value
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Measured on
            </th>
            <th scope="col" className="py-2 font-medium">
              Caveat
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.name} className="border-border border-b align-top">
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                {m.name}
              </th>
              <td className="figure py-3 pr-4 text-right whitespace-nowrap">
                {m.value}
              </td>
              <td className="text-muted py-3 pr-4">{m.dataset}</td>
              <td className="text-muted py-3">{m.caveat}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LimitsList({ limits }: { limits: string[] }) {
  return (
    <ul className="my-6 list-disc space-y-2 pl-6">
      {limits.map((limit) => (
        <li key={limit}>{limit}</li>
      ))}
    </ul>
  );
}

/** Every claim's source: an exact file, or a "Private work" label. */
export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <ul className="my-6 space-y-2 font-sans text-sm">
      {evidence.map((e) => (
        <li key={e.label} className="flex gap-2">
          <span aria-hidden="true" className="text-muted">
            ↳
          </span>
          {e.url ? (
            <a href={e.url} rel="noopener noreferrer" target="_blank">
              {e.label}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          ) : (
            <span>
              {e.label} <span className="text-muted">(Private work)</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Callout({
  title,
  kind = "caveat",
  children,
}: {
  title: string;
  kind?: "caveat" | "security";
  children: ReactNode;
}) {
  return (
    <aside
      className={`my-8 border-l-2 py-1 pl-5 ${kind === "security" ? "border-primary" : "border-warning"}`}
    >
      <p className="font-sans text-sm font-semibold">
        {kind === "security" ? "Security · " : "Caveat · "}
        {title}
      </p>
      <div className="mt-2 [&>p]:mt-0">{children}</div>
    </aside>
  );
}

export function Figure({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="border-border my-10 border-y py-6">
      <div className="text-text">{children}</div>
      <figcaption className="text-muted mt-4 font-sans text-sm">
        {caption}
      </figcaption>
    </figure>
  );
}
