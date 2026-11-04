/** The allow-list of tags (docs/05 §2). Filters on /work use these. */
export const TAGS = [
  "ai-engineering",
  "ml",
  "llm",
  "retrieval",
  "evaluation",
  "data",
  "mlops",
  "security",
  "web",
  "fintech",
  "legaltech",
  "agritech",
] as const;

export type Tag = (typeof TAGS)[number];
