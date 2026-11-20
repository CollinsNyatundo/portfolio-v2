import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AssistantRichBlock,
  AssistantRichText,
  parseInlineFormatting,
} from "@/components/assistant/assistant-rich-text";
import { normalizeBlockTypography } from "@/lib/assistant/verifier";
import type { PublicEvidenceRef } from "@/lib/assistant/types";

describe("assistant typography engine (v2, D-33)", () => {
  describe("normalizeBlockTypography", () => {
    it("extracts leading **Heading:** pseudo-headers into block.heading and trims text", () => {
      const input = {
        text: "**Architecture & Multi-Tenancy:** Collins enforces tenant isolation at the database layer using strict row-level security.",
        chunkIds: ["case:legalai-kenya:security"],
      };

      const normalized = normalizeBlockTypography(input);
      expect(normalized.heading).toBe("Architecture & Multi-Tenancy");
      expect(normalized.text).toBe(
        "Collins enforces tenant isolation at the database layer using strict row-level security.",
      );
      expect(normalized.text).not.toContain("**");
    });

    it("extracts markdown ### Heading\\n into block.heading and trims text", () => {
      const input = {
        text: "### Scoring Latency\nThe p95 inference latency is 1.4 ms in-process on CPU.",
        chunkIds: ["case:fraud:approach"],
      };

      const normalized = normalizeBlockTypography(input);
      expect(normalized.heading).toBe("Scoring Latency");
      expect(normalized.text).toBe(
        "The p95 inference latency is 1.4 ms in-process on CPU.",
      );
    });

    it("cleans accidental wrapping asterisks and colons from existing heading", () => {
      const input = {
        heading: "**Held-out Evaluation:**",
        text: "The model achieved 0.960 hit@10 on 200 held-out legal questions.",
        chunkIds: ["case:legalai-kenya:evaluation"],
      };

      const normalized = normalizeBlockTypography(input);
      expect(normalized.heading).toBe("Held-out Evaluation");
      expect(normalized.text).toBe(
        "The model achieved 0.960 hit@10 on 200 held-out legal questions.",
      );
    });

    it("preserves continuous prose when no heading is present", () => {
      const input = {
        text: "Collins has not published benchmark numbers for unreleased models.",
        chunkIds: ["case:fraud:limits"],
      };

      const normalized = normalizeBlockTypography(input);
      expect(normalized.heading).toBeUndefined();
      expect(normalized.text).toBe(
        "Collins has not published benchmark numbers for unreleased models.",
      );
    });
  });

  describe("parseInlineFormatting", () => {
    it("converts inline code spans to code elements", () => {
      const nodes = parseInlineFormatting("Latency was `1.4 ms` p95.");
      const html = renderToStaticMarkup(<>{nodes}</>);
      expect(html).toContain("<code");
      expect(html).toContain("1.4 ms</code>");
      expect(html).toContain("font-mono");
      expect(html).not.toContain("`");
    });

    it("converts bold spans to strong elements and strips stray asterisks", () => {
      const nodes = parseInlineFormatting(
        "The pipeline utilizes **TreeSHAP** and **LightGBM**.",
      );
      const html = renderToStaticMarkup(<>{nodes}</>);
      expect(html).toContain("<strong");
      expect(html).toContain("TreeSHAP</strong>");
      expect(html).toContain("LightGBM</strong>");
      expect(html).not.toContain("**");
    });

    it("strips dangling or unclosed asterisks without throwing", () => {
      const nodes = parseInlineFormatting(
        "A single unclosed **dangling marker text.",
      );
      const html = renderToStaticMarkup(<>{nodes}</>);
      expect(html).not.toContain("**");
      expect(html).toContain("A single unclosed dangling marker text.");
    });
  });

  describe("AssistantRichBlock component", () => {
    const mockEvidence: PublicEvidenceRef[] = [
      {
        index: 1,
        chunkId: "case:fraud:results",
        title: "Credit Card Fraud Detection",
        section: "Results & Trade-offs",
        route: "/work/creditcard-fraud#results",
        visibility: "public",
        externalUrl: "https://github.com/CollinsNyatundo/creditcard-fraud",
        externalLabel: "GitHub",
      },
    ];

    it("renders heading with editorial serif font and attaches evidence link", () => {
      const html = renderToStaticMarkup(
        <AssistantRichBlock
          heading="Inference Latency"
          text="The model scores samples in `1.4 ms` p95 without an external API."
          evidenceIndices={[1]}
          evidence={mockEvidence}
        />,
      );

      // Must have semantic h4 with font-serif
      expect(html).toContain("<h4");
      expect(html).toContain("font-serif");
      expect(html).toContain("Inference Latency");

      // Must render code span
      expect(html).toContain("<code");
      expect(html).toContain("1.4 ms");

      // Must have evidence link [1]
      expect(html).toContain("[1]");
      expect(html).toContain('href="/work/creditcard-fraud#results"');

      // Must NOT contain raw asterisks
      expect(html).not.toContain("**");
    });

    it("renders bullet lists cleanly with disc bullets and no raw dashes", () => {
      const textWithBullets = `Key limitations:
- No SOC 2 certification
- Pre-pilot evaluation on synthetic data only`;

      const html = renderToStaticMarkup(
        <AssistantRichBlock
          heading="Security & Limits"
          text={textWithBullets}
          evidenceIndices={[]}
          evidence={[]}
        />,
      );

      expect(html).toContain("<ul");
      expect(html).toContain("<li");
      expect(html).toContain("No SOC 2 certification");
      expect(html).toContain("Pre-pilot evaluation on synthetic data only");
      expect(html).not.toContain("- No SOC 2");
      expect(html).not.toContain("**");
    });
  });

  describe("AssistantRichText component (retrieval mode)", () => {
    it("renders summary text without raw asterisks", () => {
      const html = renderToStaticMarkup(
        <AssistantRichText text="Direct excerpts from **Collins Nyagaka**'s published projects." />,
      );

      expect(html).toContain("<strong");
      expect(html).toContain("Collins Nyagaka</strong>");
      expect(html).not.toContain("**");
    });
  });
});
