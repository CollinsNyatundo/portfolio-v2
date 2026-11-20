/**
 * Pure architectural pipeline diagram specs (facts from each case study's
 * evidence). Shared by the SVG diagram components and the build-time
 * assistant corpus compiler so spoken text and diagram captions never drift.
 */

// The shape is defined and validated in content/schema.ts (rule 14);
// scripts/build-content.ts checks these specs on every content build.
import type { DiagramSpec } from "./schema.ts";

export type { DiagramSpec, DiagramStep } from "./schema.ts";

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
    "A question first passes a jurisdiction guard. It is embedded with Voyage, and vector and full-text candidates are fused in Postgres with reciprocal rank fusion. In parallel, a language model picks up to 10 Acts from the 60 nearest the question, and their best passages join the candidates. Voyage reranks them all, keeping a slot for each picked Act. An evidence floor returns nothing rather than weak matches, and a citation check flags any section that doesn't exist in the corpus. Answers are generated with Gemini or NVIDIA NIM, with fallback, inside the firm's row-level security.",
  steps: [
    { title: "Question", detail: "jurisdiction guard first" },
    {
      title: "Candidates",
      detail: "pgvector and full-text, fused with RRF",
    },
    {
      title: "Act router",
      detail: "an LLM picks up to 10 of the 60 nearest Acts",
    },
    {
      title: "Rerank",
      detail: "Voyage rerank; each picked Act keeps a slot",
    },
    { title: "Evidence floor", detail: "returns nothing below 0.45" },
    { title: "Citation check", detail: "flags sections not in the corpus" },
  ],
  notes: [
    "Router: Claude Haiku 5.5 via OpenRouter, with fallback.",
    "Generation: Gemini or NVIDIA NIM, with fallback.",
    "Every query runs under the firm's row-level security.",
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

export const GEO_AI_PIPELINE_SPEC: DiagramSpec = {
  id: "geo-ai-pipeline",
  caseStudySlug: "geo-ai-cropland-mapping",
  title: "How a labelled point becomes a prediction",
  description:
    "Satellite rows are aggregated by location, and each labelled point is matched to its nearest pixels with a BallTree search, falling back to rounded coordinates where coverage is thin. Vegetation and water indices and a radar ratio are added to the raw bands, and the 40 most informative features are kept. RandomForest, XGBoost, LightGBM and CatBoost are tuned with Optuna and stacked, with a small neural network on top.",
  steps: [
    { title: "Satellite rows", detail: "aggregated by location" },
    {
      title: "Point matching",
      detail: "BallTree search for the nearest pixels",
    },
    {
      title: "Features",
      detail: "bands plus NDVI, NDWI, EVI, SAVI, radar",
    },
    { title: "Selection", detail: "the 40 most informative features" },
    {
      title: "Stacked ensemble",
      detail: "four tree models, a small neural net on top",
    },
  ],
  notes: [
    "Fallback: rounded coordinates where coverage is thin.",
    "Tuning: Optuna for each tree model.",
    "Class imbalance: oversampling was tried.",
  ],
};

export const PRODUCTION_TEMPLATE_PIPELINE_SPEC: DiagramSpec = {
  id: "production-template-pipeline",
  caseStudySlug: "production-ai-template",
  title: "How one query is answered",
  description:
    "A request reaches a FastAPI service, which sets tenant, user and session scope from the authenticated principal and ignores any scope the caller sends. Input filters run, then a ReAct-style loop routes the question, may split it, calls permission-gated tools and reranks the results, capped at five turns. Model and search calls sit behind circuit breakers. Output filters run before the answer returns, and OpenTelemetry traces each step.",
  steps: [
    { title: "Request", detail: "FastAPI; input filters, upload limits" },
    {
      title: "Scope",
      detail: "tenant, user, session from the login",
    },
    {
      title: "ReAct loop",
      detail: "route, split, permission-gated tools, rerank",
    },
    {
      title: "Turn cap",
      detail: "at five turns it answers, no more calls",
    },
    { title: "Answer", detail: "output filters before it returns" },
  ],
  notes: [
    "Model and search calls sit behind circuit breakers.",
    "URLs are checked against private addresses.",
    "OpenTelemetry traces each step.",
  ],
};

/** Keys are the exact MDX tag names the corpus compiler resolves. */
export const DIAGRAM_SPECS: Record<string, DiagramSpec> = {
  FraudPipeline: FRAUD_PIPELINE_SPEC,
  LegalAiPipeline: LEGAL_AI_PIPELINE_SPEC,
  ComplianceGuardPipeline: COMPLIANCE_GUARD_PIPELINE_SPEC,
  GeoAiPipeline: GEO_AI_PIPELINE_SPEC,
  ProductionTemplatePipeline: PRODUCTION_TEMPLATE_PIPELINE_SPEC,
};
