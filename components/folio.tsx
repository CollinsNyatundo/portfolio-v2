import Link from "next/link";
import { CvLink } from "./cv-link";
import { site } from "@/content/site";
import { showNotes } from "@/lib/content";
import { ThemeToggle } from "./theme-toggle";

type FolioProps = {
  /** Optional section or page label. */
  marker?: string;
  /** Current section or page title. */
  title?: string;
  /** Path of the page itself; its section link gets aria-current (docs/03 §6). */
  currentPath?: string;
};

const sections = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/demos", label: "Demos" },
  { href: "/notes", label: "Notes" },
] as const;

function FolioLinks({ currentPath }: { currentPath?: string }) {
  return (
    <ul className="flex flex-col gap-1.5 font-sans text-sm">
      {sections
        // Notes appears only once at least two exist (docs/03 §2).
        .filter((section) => section.href !== "/notes" || showNotes())
        .map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              aria-current={section.href === currentPath ? "page" : undefined}
              className="text-text inline-flex min-h-11 items-center no-underline hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline lg:min-h-0"
            >
              {section.label}
            </Link>
          </li>
        ))}
      <li>
        <Link
          href="/contact"
          aria-current={currentPath === "/contact" ? "page" : undefined}
          className="inline-flex min-h-11 items-center font-medium aria-[current=page]:font-semibold aria-[current=page]:underline lg:min-h-0"
        >
          Contact
        </Link>
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
 * The folio sits in the left bench margin on wide screens and collapses to a
 * top strip with a disclosure menu on small screens.
 */
export function Folio({ title, currentPath }: FolioProps) {
  return (
    <nav
      aria-label="Site"
      className="border-border bg-bg border-b px-4 py-3 sm:px-6 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-56 lg:flex-col lg:justify-between lg:border-r lg:border-b-0 lg:px-7 lg:py-8"
    >
      <div className="flex items-baseline justify-between gap-4 lg:block">
        <Link
          href="/"
          className="font-display text-text text-base no-underline"
        >
          {site.name}
        </Link>
        {title && (
          <p className="text-muted mt-0 font-sans text-sm lg:mt-2">{title}</p>
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
