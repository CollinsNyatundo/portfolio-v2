import Link from "next/link";
import { mailtoHref, site } from "@/content/site";

const repoUrl = "https://github.com/CollinsNyatundo/portfolio-v2";

/**
 * Every page ends on a colophon, not a footer that trails off (docs/04 §2).
 * The primary action is running text, never a button island.
 */
export function Colophon({ updated }: { updated: string }) {
  return (
    <footer className="border-border text-muted mt-36 border-t pt-10 pb-16 font-sans text-sm">
      <p className="text-text font-serif text-lg">
        <a href={mailtoHref}>{site.primaryActionLabel}</a> at {site.email}, or
        read the{" "}
        <a href={site.cvPath} download>
          CV (PDF)
        </a>
        .
      </p>
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <li>
          <Link href="/about">About</Link>
        </li>
        <li>
          <a
            href={site.links.linkedin}
            rel="noopener noreferrer"
            target="_blank"
          >
            LinkedIn<span className="sr-only"> (opens in new tab)</span>
          </a>
        </li>
        <li>
          <a href={site.links.github} rel="noopener noreferrer" target="_blank">
            GitHub<span className="sr-only"> (opens in new tab)</span>
          </a>
        </li>
        <li>
          <a href={repoUrl} rel="noopener noreferrer" target="_blank">
            Source of this site
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </li>
      </ul>
      <p className="mt-6">
        {site.location}, {site.utcOffsetLabel}. Last updated{" "}
        <time dateTime={updated}>{updated}</time>.
      </p>
    </footer>
  );
}
