"use client";

import { useEffect, useRef, useState } from "react";
import type { LedgerEntry } from "@/lib/ledger";

/**
 * The signature move (D-26): a line is added each time a real figure on the
 * page crosses the reading line. Figures opt in with data-ledger-id, and only
 * ids present in `entries` (built from validated content) can appear.
 *
 * The margin copy is aria-hidden; the colophon table is the accessible version.
 */
export function EvidenceLedger({ entries }: { entries: LedgerEntry[] }) {
  const [seen, setSeen] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const known = useRef(new Set(entries.map((e) => e.id)));

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>("[data-ledger-id]");
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (!record.isIntersecting) continue;
          const id = (record.target as HTMLElement).dataset.ledgerId ?? "";
          observer.unobserve(record.target);
          if (!known.current.has(id)) continue;
          setSeen((prev) => (prev.includes(id) ? prev : [...prev, id]));
        }
      },
      // The reading line: a figure counts once it passes 60% of the viewport.
      { rootMargin: "0px 0px -40% 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  const lines = seen
    .map((id) => entries.find((e) => e.id === id))
    .filter((e): e is LedgerEntry => Boolean(e));

  const list = (
    <ol className="space-y-3">
      {lines.map((e) => (
        <li key={e.id} className="ledger-line">
          <span className="figure text-text block text-sm">{e.value}</span>
          <span className="text-muted block text-xs">
            {e.label} · {e.project}
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      {/* Wide screens: a ruled column in the right margin. */}
      <aside
        aria-hidden="true"
        className="border-border fixed top-10 right-8 bottom-10 hidden w-52 overflow-y-auto border-l pl-5 font-sans xl:block"
      >
        <p className="text-muted text-xs [font-variant-caps:all-small-caps]">
          Evidence read · {lines.length}
        </p>
        <div className="mt-4">{list}</div>
      </aside>

      {/* Narrow screens: a collapsed strip at the bottom. */}
      {lines.length > 0 && (
        <div
          aria-hidden="true"
          className="bg-surface border-border fixed inset-x-0 bottom-0 z-40 border-t px-4 py-2 font-sans xl:hidden"
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((v) => !v)}
            className="text-muted min-h-11 w-full text-left text-sm"
          >
            Evidence · {lines.length} {open ? "▾" : "▴"}
          </button>
          {open && (
            <div className="max-h-[40vh] overflow-y-auto pb-3">{list}</div>
          )}
        </div>
      )}
    </>
  );
}
