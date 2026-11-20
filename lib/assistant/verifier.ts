import { getChunk, getFact, isVerifiedRoute } from "./corpus.ts";
import { factToPublicCard, type PackedContext } from "./retriever.ts";
import { providerOutputSchema } from "./schema.ts";
import type {
  AssistantResponse,
  PublicEvidenceRef,
  PublicFactCard,
} from "./types.ts";

const BANNED_PROSE = [
  /\u2014/, // em dash forbidden by copy rules (04 §1)
  /\bpassionate\b/i,
  /\bninja\b/i,
  /\brockstar\b/i,
  /\bcutting[- ]edge\b/i,
  /\bleverag(e|es|ed|ing)\b/i,
  /\bproduction[- ]grade\b/i,
];

const UNSAFE_OR_UNTRUSTED_TEXT = [
  /<\/?[a-z!][^>]*>/i,
  /(?:javascript|data|vbscript):/i,
  /\]\(https?:\/\//i,
  /https?:\/\/\S+/i,
  /(?:sk-or-|gsk_|AIza|sk-proj-|re_[A-Za-z0-9]{12,}|UPSTASH_REDIS|TURNSTILE_SECRET|BEGIN [A-Z ]*PRIVATE KEY)/,
  /(?:\+254\s?\d{6,}|\b07\d{2}[\s-]?\d{6}\b)/,
];

export function normalizeBlockTypography(block: {
  heading?: string;
  text: string;
  chunkIds: string[];
}): { heading?: string; text: string; chunkIds: string[] } {
  let heading = block.heading?.trim();
  let text = block.text.trim();

  if (heading) {
    heading = heading
      .replace(/^[*_#\s]+/, "")
      .replace(/[*_#\s:]+$/, "")
      .trim();
  } else {
    // Check for leading bold pseudo-heading: **Heading:** or **Heading**\n
    const boldMatch = text.match(
      /^\*\*([^*\n]{2,80})\*\*(?::\s*|\s*[\r\n]+\s*|\s+)/,
    );
    if (boldMatch) {
      heading = boldMatch[1].trim().replace(/[:\s]+$/, "");
      text = text.slice(boldMatch[0].length).trim();
    } else {
      // Check for leading markdown heading: ### Heading\n or ## Heading\n
      const hashMatch = text.match(
        /^#{1,4}\s+([^\r\n]{2,80})(?:\s*[\r\n]+\s*)/,
      );
      if (hashMatch) {
        heading = hashMatch[1].trim().replace(/[:\s]+$/, "");
        text = text.slice(hashMatch[0].length).trim();
      }
    }
  }

  return {
    heading: heading && heading.length > 0 ? heading : undefined,
    text,
    chunkIds: block.chunkIds,
  };
}

function violatesTextPolicy(text: string): string | null {
  for (const re of BANNED_PROSE) {
    if (re.test(text)) return `copy_policy:${re.source}`;
  }
  for (const re of UNSAFE_OR_UNTRUSTED_TEXT) {
    if (re.test(text)) return `unsafe_text:${re.source}`;
  }
  return null;
}

export type VerifyResult =
  | {
      ok: true;
      response: Extract<AssistantResponse, { mode: "generated" }>;
      citationCount: number;
      factCount: number;
    }
  | {
      ok: false;
      reason: string;
    };

/**
 * Deterministically validates provider JSON output against the current
 * packed context, rejects invalid/unsafe responses to retrieval fallback
 * without mutating prose, and hydrates trusted routes and verbatim Fact Cards.
 */
export function verifyAndHydrate(
  rawJson: string,
  packed: PackedContext,
): VerifyResult {
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawJson);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  const parsed = providerOutputSchema.safeParse(decoded);
  if (!parsed.success) {
    return { ok: false, reason: "schema_mismatch" };
  }

  const output = parsed.data;
  output.blocks = output.blocks.map(normalizeBlockTypography);

  // Validate text safety & copy rules across every block and follow-up.
  for (const block of output.blocks) {
    if (block.heading) {
      const headingIssue = violatesTextPolicy(block.heading);
      if (headingIssue) return { ok: false, reason: `heading_${headingIssue}` };
    }
    const textIssue = violatesTextPolicy(block.text);
    if (textIssue) return { ok: false, reason: textIssue };
    for (const cid of block.chunkIds) {
      if (!packed.allowedChunkIds.has(cid)) {
        return { ok: false, reason: `unpacked_chunk:${cid}` };
      }
      const chunk = getChunk(cid);
      if (!chunk || !isVerifiedRoute(chunk.route)) {
        return { ok: false, reason: `unverified_chunk_route:${cid}` };
      }
    }
  }

  for (const fid of output.factIds) {
    if (!packed.allowedFactIds.has(fid)) {
      return { ok: false, reason: `unpacked_fact:${fid}` };
    }
  }

  for (const followUp of output.followUps) {
    const issue = violatesTextPolicy(followUp);
    if (issue) return { ok: false, reason: `followup_${issue}` };
  }

  // Hydrate server-owned ordered evidence references (1-based).
  const evidenceByChunkId = new Map<string, PublicEvidenceRef>();
  const evidence: PublicEvidenceRef[] = [];

  for (const block of output.blocks) {
    for (const cid of block.chunkIds) {
      if (evidenceByChunkId.has(cid)) continue;
      const chunk = getChunk(cid)!;
      const publicExt =
        chunk.visibility === "private"
          ? undefined
          : chunk.evidenceLinks.find((e) => e.url && !e.private);
      const ref: PublicEvidenceRef = {
        index: evidence.length + 1,
        chunkId: chunk.id,
        title: chunk.title,
        section: chunk.section,
        route: chunk.route,
        visibility: chunk.visibility,
        externalUrl: publicExt?.url ?? null,
        externalLabel:
          chunk.visibility === "private"
            ? "Private work"
            : (publicExt?.label ?? null),
      };
      evidenceByChunkId.set(cid, ref);
      evidence.push(ref);
    }
  }

  const hydratedBlocks = output.blocks.map((block) => {
    const indices = Array.from(
      new Set(block.chunkIds.map((cid) => evidenceByChunkId.get(cid)!.index)),
    ).sort((a, b) => a - b);
    return {
      heading: block.heading,
      text: block.text,
      evidenceIndices: indices,
    };
  });

  // Hydrate verbatim Fact Cards (max 6): preserve cited facts while ensuring
  // at least up to 2 limit/callout caveats accompany any cited metrics/demo.
  const factCards: PublicFactCard[] = [];
  const seenFacts = new Set<string>();
  const pushFact = (fid: string, maxCap = 6) => {
    if (seenFacts.has(fid) || factCards.length >= maxCap) return;
    const fact = getFact(fid);
    if (!fact || !isVerifiedRoute(fact.route)) return;
    seenFacts.add(fid);
    factCards.push(factToPublicCard(fact));
  };

  for (const fid of output.factIds) pushFact(fid, 4);

  const attachedIds: string[] = [];
  for (const ref of evidence) {
    const chunk = getChunk(ref.chunkId);
    if (!chunk) continue;
    if (
      chunk.kind === "case_study_metrics" ||
      chunk.kind === "case_study_limits" ||
      chunk.kind === "demo"
    ) {
      attachedIds.push(...chunk.factIds);
    }
  }
  // Attach limits/callouts first into reserved slots, then fill remaining metric slots.
  for (const fid of attachedIds) {
    const f = getFact(fid);
    if (f && (f.kind === "limit" || f.kind === "callout")) pushFact(fid, 6);
  }
  for (const fid of attachedIds) {
    pushFact(fid, 6);
  }

  return {
    ok: true,
    citationCount: evidence.length,
    factCount: factCards.length,
    response: {
      mode: "generated",
      verdict: output.inPortfolio ? "answered" : "not_in_portfolio",
      blocks: hydratedBlocks,
      facts: factCards,
      evidence,
      followUps: output.followUps,
      activeEntitySlug: packed.activeEntitySlug,
      notice:
        "Drafted from portfolio content. Verify claims in the linked evidence.",
    },
  };
}
