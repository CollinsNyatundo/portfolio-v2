/**
 * Pure architectural pipeline diagram specs (facts from each case study's
 * evidence). Shared by the SVG diagram components and the build-time
 * assistant corpus compiler so spoken text and diagram captions never drift.
 */

export type DiagramStep = {
  title: string;
  detail: string;
};

export type DiagramSpec = {
  id: string;
  caseStudySlug: string;
  title: string;
  description: string;
  steps: readonly DiagramStep[];
  notes: readonly string[];
};

export const FRAUD_PIPELINE_SPEC: DiagramSpec = {
  id: "fraud-pipeline",
  caseStudySlug: "creditcard-fraud",
  title: "How one transaction is scored",
  description:
    "A transaction enters with its time, 28 PCA components and amount. Window features are computed from the previous ten transactions. A LightGBM model trained with focal loss produces a raw score, which becomes a probability through a sigmoid with the training init score, and is compared with the tuned threshold to flag or allow. SHAP contributions explain the score, and the service runs behind FastAPI with Redis and PostgreSQL in Docker.",
  steps: [
    { title: "Transaction", detail: "Time, V1 to V28 (PCA), Amount" },
    {
      title: "Window features",
      detail: "built from the previous 10 transactions",
    },
    {
      title: "LightGBM, focal loss",
      detail: "79 inputs, tuned with Optuna",
    },
    { title: "Probability", detail: "sigmoid(raw score + init score)" },
    { title: "Decision", detail: "flag or allow at the tuned threshold" },
  ],
  notes: [
    "Explanation: SHAP contributions from the same model.",
    "Service: FastAPI, Redis and PostgreSQL in Docker.",
    "Latency: 1.4 ms p95 for the model call alone.",
  ],
};

export const LEGAL_AI_PIPELINE_SPEC: DiagramSpec = {
  id: "legalai-pipeline",
  caseStudySlug: "legalai-kenya",
  title: "How a legal question is answered",
  description:
    "A question first passes a jurisdiction guard. It is embedded with Voyage, and Postgres returns open hybrid candidates (vector and rare-term full-text fused with reciprocal rank fusion) alongside a 60-Act centroid shortlist. An LLM Act router selects governing Acts and pulls passages inside them. Voyage reranks the combined pool, reserving slots for routed Acts and capping each document. The open-search 0.45 evidence floor returns nothing rather than weak matches, and a citation check flags any section that doesn't exist in the retrieved text. Answers are generated with Gemini or NVIDIA NIM, with fallback, inside the firm's row-level security.",
  steps: [
    { title: "Question", detail: "jurisdiction guard first" },
    {
      title: "Candidates",
      detail: "hybrid RRF + LLM-routed Acts",
    },
    {
      title: "Rerank",
      detail: "Voyage rerank, routed slots + doc cap",
    },
    { title: "Evidence floor", detail: "open-search gate below 0.45" },
    { title: "Citation check", detail: "flags sections not in the text" },
  ],
  notes: [
    "Routing: Claude Haiku 5.5 via OpenRouter, with Gemini, Groq, NVIDIA NIM and centroid fallbacks.",
    "Generation: Gemini or NVIDIA NIM, with fallback, under the firm's row-level security.",
  ],
};

export const COMPLIANCE_GUARD_PIPELINE_SPEC: DiagramSpec = {
  id: "complianceguard-pipeline",
  caseStudySlug: "complianceguard",
  title: "How one payment is monitored",
  description:
    "A payment from M-Pesa, CSV or core banking is normalised and ingested through Kafka. 35 typology rules run, alongside behavioural, velocity and anomaly scores from Isolation Forest and River. Sanctions, PEP and other context is added, and the engine scores are fused into one weighted composite score, with four advisory engines recorded at weight 0. Above the threshold a hold is created with a drafted SAR, and an analyst works it through case management with four-eyes approval.",
  steps: [
    {
      title: "Payment event",
      detail: "M-Pesa, CSV or core banking, via Kafka",
    },
    { title: "Typology rules", detail: "35 rules in a versioned registry" },
    {
      title: "Behaviour and anomaly",
      detail: "velocity, Isolation Forest, River",
    },
    {
      title: "Composite score",
      detail: "weighted fusion; advisory ML at weight 0",
    },
    {
      title: "Hold and SAR draft",
      detail: "case, analyst, four-eyes approval",
    },
  ],
  notes: [
    "Context: sanctions, PEP and adverse-media screening.",
    "Every decision is written to a hash-chained audit ledger.",
  ],
};

export const DIAGRAM_SPECS: Record<string, DiagramSpec> = {
  FraudPipeline: FRAUD_PIPELINE_SPEC,
  LegalAiPipeline: LEGAL_AI_PIPELINE_SPEC,
  ComplianceGuardPipeline: COMPLIANCE_GUARD_PIPELINE_SPEC,
};
