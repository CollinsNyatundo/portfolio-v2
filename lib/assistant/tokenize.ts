/**
 * Shared deterministic tokenizer and domain alias table used by both the
 * build-time corpus compiler and the runtime BM25F retriever. Kept zero-dep
 * and relative-import safe for Node type-stripping scripts.
 */

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "being",
  "by",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you",
  "your",
]);

/**
 * Tokenize text into normalized lowercase terms while preserving numeric ratios
 * (`37/37`), decimals (`0.960`), `@` retrieval metrics (`hit@10`), and
 * hyphenated identifiers (`m-pesa`, `row-level`).
 */
export function tokenize(input: string): string[] {
  const lowered = input.toLowerCase();
  const raw =
    lowered.match(/[a-z0-9]+(?:[._/@-][a-z0-9]+)*/g) ?? ([] as string[]);
  const out: string[] = [];
  for (const token of raw) {
    if (token.length < 2) continue;
    if (!STOP_WORDS.has(token)) out.push(token);
    // Also index split sub-tokens for hyphenated or dotted technical terms
    // (e.g. `hit@10` -> `hit`, `10`; `m-pesa` -> `pesa`), excluding decimals.
    if (/[-/@_]/.test(token)) {
      for (const part of token.split(/[-/@_]+/)) {
        if (part.length >= 2 && !STOP_WORDS.has(part)) {
          out.push(part);
        }
      }
    }
  }
  return out;
}

/**
 * Curated, non-conflating query-time aliases. Only true synonyms or abbreviations
 * are expanded so unrelated domains are never conflated.
 */
const QUERY_SYNONYMS: Record<string, readonly string[]> = {
  aml: ["anti-money-laundering", "pocamla", "complianceguard"],
  kyc: ["complianceguard", "anti-money-laundering"],
  pocamla: ["aml", "anti-money-laundering", "complianceguard"],
  mpesa: ["m-pesa", "mobile-money"],
  "m-pesa": ["mpesa", "mobile-money"],
  rls: ["row-level", "security", "multi-tenant"],
  shap: ["treeshap", "pred_contrib", "contributions"],
  treeshap: ["shap", "pred_contrib", "lightgbm"],
  cv: ["resume", "curriculum"],
  resume: ["cv"],
  cropland: ["geo-ai-cropland-mapping", "sentinel-1", "sentinel-2"],
  satellite: ["geo-ai-cropland-mapping", "sentinel-1", "sentinel-2"],
  legal: ["legalai", "legalai-kenya", "advocates"],
  advocate: ["legalai", "legalai-kenya"],
  advocates: ["legalai", "legalai-kenya"],
  statute: ["acts", "legalai-kenya"],
  fraud: ["creditcard-fraud", "lightgbm"],
  credit: ["creditcard-fraud"],
  libgomp: ["scoring-lightgbm-without-lightgbm", "lightgbm"],
  smote: ["oversampling-before-the-split", "imbalanced"],
  mcp: ["ml-systems-mcp-server", "ml-systems-search"],
  bm25: ["ml-systems-search", "mlsys"],
  fastapi: ["production-ai-template", "complianceguard", "creditcard-fraud"],
  tundotech: ["tundotech-systems", "freelance"],
};

export function expandQueryTokens(tokens: string[]): string[] {
  const expanded = [...tokens];
  const seen = new Set(tokens);
  for (const t of tokens) {
    const aliases = QUERY_SYNONYMS[t];
    if (!aliases) continue;
    for (const alias of aliases) {
      if (!seen.has(alias)) {
        seen.add(alias);
        expanded.push(alias);
      }
    }
  }
  return expanded;
}

/** Estimate tokens conservatively (~3.8 chars/token) for budget packing. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3.8));
}
