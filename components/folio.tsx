import Link from "next/link";
import { CvLink } from "./cv-link";
import { mailtoHref, site } from "@/content/site";
import { ThemeToggle } from "./theme-toggle";

type FolioProps = {
  /** Small-caps label, e.g. a chapter number ("I") or a section name. */
  marker?: string;
  /** Current chapter or page title. */
  title?: string;
  /** Path of the page itself; its section link gets aria-current (docs/03 §6). */
  currentPath?: string;
};

const sections = [
  { href: "/work", label: "Work" },
  { href: "/demos", label: "Demos" },
  { href: "/notes", label: "Notes" },
] as const;

function FolioLinks({ currentPath }: { currentPath?: string }) {
  return (
    <ul className="flex flex-col gap-1 font-sans text-sm">
      {sections.map((section) => (
        <li key={section.href}>
          <Link
            href={section.href}
            aria-current={section.href === currentPath ? "page" : undefined}
            className="text-text inline-flex min-h-11 items-center no-underline hover:underline lg:min-h-0"
          >
            {section.label}
          </Link>
        </li>
      ))}
      <li>
        <a
          href={mailtoHref}
          className="inline-flex min-h-11 items-center font-medium lg:min-h-0"
        >
          {site.primaryActionLabel}
        </a>
      </li>
      <li>
        <CvLink
          from="folio"
          className="inline-flex min-h-11 items-center lg:min-h-0"
        />
      </li>
    </ul>
  );
}

/**
 * The folio replaces a header bar (chaptered editorial grammar, docs/04 §2):
 * a margin column on wide screens, a slim top line that expands on small ones.
 */
export function Folio({ marker, title, currentPath }: FolioProps) {
  return (
    <nav
      aria-label="Site"
      className="border-border border-b px-4 py-3 sm:px-6 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-56 lg:flex-col lg:justify-between lg:border-r lg:border-b-0 lg:px-8 lg:py-10"
    >
      <div className="flex items-baseline justify-between gap-4 lg:block">
        <Link
          href="/"
          className="text-text font-sans text-sm font-semibold tracking-tight no-underline"
        >
          {site.name}
        </Link>
        {(marker || title) && (
          <p className="text-muted mt-0 font-sans text-sm lg:mt-6">
            {marker && (
              <span className="mr-2 [font-variant-caps:all-small-caps]">
                {marker}
              </span>
            )}
            {title}
          </p>
        )}
        <details className="lg:hidden">
          <summary className="min-h-11 cursor-pointer font-sans text-sm leading-[2.75rem]">
            Menu
          </summary>
          <div className="mt-2 pb-2">
            <FolioLinks currentPath={currentPath} />
            <div className="text-muted mt-3 font-sans text-sm">
              <p>
                {site.location} · {site.utcOffsetLabel}
              </p>
              <ThemeToggle />
            </div>
          </div>
        </details>
      </div>

      <div className="hidden lg:block">
        <FolioLinks currentPath={currentPath} />
      </div>

      <div className="text-muted hidden font-sans text-sm lg:block">
        <p>
          {site.location} · {site.utcOffsetLabel}
        </p>
        <p>{site.availabilityNote}</p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
