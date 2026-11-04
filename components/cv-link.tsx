"use client";

import { track } from "@vercel/analytics";
import type { ReactNode } from "react";
import { site } from "@/content/site";

/**
 * Every CV download link (PRD AC-2): downloads the public PDF and records a
 * cookieless `cv_download` event with where it was clicked. No personal data.
 */
export function CvLink({
  from,
  className,
  children = "CV",
}: {
  /** Where the link sits, e.g. "folio" or "colophon". */
  from: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={site.cvPath}
      download
      className={className}
      onClick={() => track("cv_download", { from })}
    >
      {children}
    </a>
  );
}
