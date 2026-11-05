"use client";

import { useEffect, useRef, useState } from "react";
import type { LedgerEntry } from "@/lib/ledger";

/** The visitor's own demo run (BRIEF: the peak writes to the ledger). */
export type VisitorRun = { value: string; label: string };
export const VISITOR_EVENT = "ledger:visitor";

/** Called by the fraud demo after a successful score. */
export function recordVisitorRun(run: VisitorRun): void {
  window.dispatchEvent(
    new CustomEvent<VisitorRun>(VISITOR_EVENT, { detail: run }),
  );
}

/**
 * The signature move (D-26): a line is added each time a real figure on the
 * page crosses the reading line. Figures opt in with data-ledger-id, and only
 * ids present in `entries` (built from validated content) can appear.
 *
 * The wide-screen margin column is aria-hidden decoration; the colophon table is
 * the accessible version. The narrow-screen strip is a real disclosure button.
 */
export function EvidenceLedger({ entries }: { entries: LedgerEntry[] }) {
  const [seen, setSeen] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  // One line at most: running the demo again replaces it (docs/03 §6).
  const [visitor, setVisitor] = useState<VisitorRun | null>(null);

  useEffect(() => {
    const onRun = (e: Event) =>
      setVisitor((e as CustomEvent<VisitorRun>).detail);
    window.addEventListener(VISITOR_EVENT, onRun);
    return () => window.removeEventListener(VISITOR_EVENT, onRun);
  }, []);
  const known = useRef(new Set(entries.map((e) => e.id)));
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const observe = () => {
      observer?.disconnect();
      const pending = [
        ...document.querySelectorAll<HTMLElement>("[data-ledger-id]"),
      ].filter((t) => !seenRef.current.has(t.dataset.ledgerId ?? ""));
      // Percentage root margins resolve against the viewport's width, so the
      // reading line (60% down the screen) is set in pixels from its height.
      const margin = Math.round(window.innerHeight * 0.4);
      observer = new IntersectionObserver(
        (records) => {
          for (const record of records) {
            if (!record.isIntersecting) continue;
            const id = (record.target as HTMLElement).dataset.ledgerId ?? "";
            observer?.unobserve(record.target);
            if (!known.current.has(id)) continue;
            seenRef.current.add(id);
            setSeen((prev) => (prev.includes(id) ? prev : [...prev, id]));
          }
        },
        { rootMargin: `0px 0px -${margin}px 0px` },
      );
      pending.forEach((t) => observer?.observe(t));
    };
    observe();
    window.addEventListener("resize", observe);
    return () => {
      window.removeEventListener("resize", observe);
      observer?.disconnect();
    };
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
      {visitor && (
        <li key="visitor" className="ledger-line" data-visitor>
          <span className="figure text-primary block text-sm">
            {visitor.value}
          </span>
          <span className="text-primary block text-xs">
            {visitor.label} · you, just now
          </span>
        </li>
      )}
    </ol>
  );
  const count = lines.length + (visitor ? 1 : 0);

  return (
    <>
      {/* Wide screens: a ruled column in the right margin. */}
      <aside
        aria-hidden="true"
        className="border-border fixed top-10 right-8 bottom-10 hidden w-52 overflow-y-auto border-l pl-5 font-sans xl:block"
      >
        <p className="text-muted text-xs [font-variant-caps:all-small-caps]">
          Evidence read · {count}
        </p>
        <div className="mt-4">{list}</div>
      </aside>

      {/* Narrow screens: a collapsed strip at the bottom. */}
      {count > 0 && (
        <section
          aria-label="Evidence read so far"
          className="bg-surface border-border fixed inset-x-0 bottom-0 z-40 border-t px-4 py-2 font-sans xl:hidden"
        >
          <button
            type="button"
            aria-expanded={open}
            aria-controls="evidence-strip-list"
            onClick={() => setOpen((v) => !v)}
            className="text-muted min-h-11 w-full text-left text-sm"
          >
            Evidence · {count}{" "}
            <span aria-hidden="true">{open ? "▾" : "▴"}</span>
          </button>
          <div
            id="evidence-strip-list"
            hidden={!open}
            className="max-h-[40vh] overflow-y-auto pb-3"
          >
            {list}
          </div>
        </section>
      )}
    </>
  );
}
