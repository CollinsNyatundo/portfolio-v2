import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicEvidenceRef } from "@/lib/assistant/types.ts";

/**
 * Editorial typography renderer for assistant answers (v2, D-33).
 *
 * Guarantees:
 * 1. Zero raw markdown asterisks (**) or pseudo-headers appear in rendered text.
 * 2. Proper typographic hierarchy: Newsreader serif for titles, Geist sans for
 *    body text, Geist mono for inline code/metrics, and `.figure` citation badges.
 * 3. Zero external runtime dependencies (< 1.5 KB uncompressed, ~400 B gzipped).
 * 4. Zero `dangerouslySetInnerHTML` or dynamic code evaluation (strict CSP nonce).
 */

export function parseInlineFormatting(
  rawText: string,
  keyPrefix = "inline",
): ReactNode[] {
  const clean = rawText.replaceAll("```", "");
  const tokenRegex = /(`([^`]+)`|\*\*([^*]+)\*\*)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      const textPiece = clean
        .slice(lastIndex, match.index)
        .replaceAll("**", "");
      if (textPiece) nodes.push(textPiece);
    }

    if (match[2] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${match.index}`}
          className="bg-bg/80 border-border text-text rounded border px-1 py-0.5 font-mono text-xs"
        >
          {match[2]}
        </code>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <strong
          key={`${keyPrefix}-bold-${match.index}`}
          className="text-text font-semibold"
        >
          {match[3]}
        </strong>,
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < clean.length) {
    const trailing = clean.slice(lastIndex).replaceAll("**", "");
    if (trailing) nodes.push(trailing);
  }

  return nodes.length > 0 ? nodes : [clean.replaceAll("**", "")];
}

type ParsedBlockUnit =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

function parseBlockText(text: string): ParsedBlockUnit[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const units: ParsedBlockUnit[] = [];
  let currentList: string[] | null = null;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      units.push({ type: "list", items: currentList });
      currentList = null;
    }
  };

  for (const line of lines) {
    // Subheading: ### Heading or ## Heading
    const subMatch = line.match(/^#{2,4}\s+([^\r\n]+)$/);
    if (subMatch) {
      flushList();
      units.push({
        type: "subheading",
        text: subMatch[1].replace(/[*#:]+$/g, "").trim(),
      });
      continue;
    }

    // Bullet items: - item or * item
    const listMatch = line.match(/^[-*•]\s+([^\r\n]+)$/);
    if (listMatch) {
      if (!currentList) currentList = [];
      currentList.push(listMatch[1].trim());
      continue;
    }

    // Standalone bold line acting as a subheading: **Subheading**
    const boldLineMatch = line.match(/^\*\*([^*\n]{2,80})\*\*[:]?$/);
    if (boldLineMatch) {
      flushList();
      units.push({
        type: "subheading",
        text: boldLineMatch[1].trim(),
      });
      continue;
    }

    flushList();
    units.push({ type: "paragraph", text: line });
  }

  flushList();
  return units.length > 0 ? units : [{ type: "paragraph", text }];
}

export function AssistantRichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const units = parseBlockText(text);

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {units.map((unit, idx) => {
        if (unit.type === "subheading") {
          return (
            <h5
              key={idx}
              className="text-muted mt-2.5 mb-1 font-serif text-xs font-semibold tracking-wider uppercase"
            >
              {unit.text}
            </h5>
          );
        }
        if (unit.type === "list") {
          return (
            <ul key={idx} className="my-1.5 list-disc space-y-1 pl-4 text-sm">
              {unit.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {parseInlineFormatting(item, `list-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="text-text font-sans text-sm leading-relaxed">
            {parseInlineFormatting(unit.text, `p-${idx}`)}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantRichBlock({
  heading,
  text,
  evidenceIndices,
  evidence,
  onNavigate,
}: {
  heading?: string;
  text: string;
  evidenceIndices: number[];
  evidence: PublicEvidenceRef[];
  onNavigate?: () => void;
}) {
  const units = parseBlockText(text);

  const evidenceCitations =
    evidenceIndices.length > 0 ? (
      <span className="ml-1 inline-block whitespace-nowrap">
        {evidenceIndices.map((evIdx) => {
          const ref = evidence.find((e) => e.index === evIdx);
          if (!ref) return null;
          return (
            <Link
              key={evIdx}
              href={ref.route}
              onClick={onNavigate}
              aria-label={`Evidence ${evIdx}: ${ref.title}, ${ref.section}`}
              className="figure ml-1 font-mono text-xs no-underline hover:underline"
            >
              [{evIdx}]
            </Link>
          );
        })}
      </span>
    ) : null;

  return (
    <section className="space-y-1.5">
      {heading && (
        <h4 className="text-text mt-3 mb-1 font-serif text-sm font-semibold tracking-wide first:mt-0">
          {heading}
        </h4>
      )}

      {units.map((unit, idx) => {
        const isLastUnit = idx === units.length - 1;

        if (unit.type === "subheading") {
          return (
            <h5
              key={idx}
              className="text-muted mt-2.5 mb-1 font-serif text-xs font-semibold tracking-wider uppercase"
            >
              {unit.text}
            </h5>
          );
        }

        if (unit.type === "list") {
          return (
            <ul key={idx} className="my-1.5 list-disc space-y-1 pl-4 text-sm">
              {unit.items.map((item, itemIdx) => {
                const isLastItem =
                  isLastUnit && itemIdx === unit.items.length - 1;
                return (
                  <li key={itemIdx} className="leading-relaxed">
                    {parseInlineFormatting(
                      item,
                      `block-list-${idx}-${itemIdx}`,
                    )}
                    {isLastItem && evidenceCitations}
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={idx} className="text-text font-sans text-sm leading-relaxed">
            {parseInlineFormatting(unit.text, `block-p-${idx}`)}
            {isLastUnit && evidenceCitations}
          </p>
        );
      })}
    </section>
  );
}
