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

/** How each tag reads in the UI (filter chips, card tags). */
export const TAG_LABELS: Record<Tag, string> = {
  "ai-engineering": "AI engineering",
  ml: "ML",
  llm: "LLM",
  retrieval: "Retrieval",
  evaluation: "Evaluation",
  data: "Data",
  mlops: "MLOps",
  security: "Security",
  web: "Web",
  fintech: "Fintech",
  legaltech: "Legaltech",
  agritech: "Agritech",
};
