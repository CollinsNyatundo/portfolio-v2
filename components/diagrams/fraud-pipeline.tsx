import { Pipeline } from "./pipeline";

/** Scoring path of the credit-card fraud model (facts: the case study's evidence). */
export function FraudPipeline() {
  return (
    <Pipeline
      id="fraud-pipeline"
      title="How one transaction is scored"
      description="A transaction enters with its time, 28 PCA components and amount. Window features are computed from the previous ten transactions. A LightGBM model trained with focal loss produces a raw score, which becomes a probability through a sigmoid with the training init score, and is compared with the tuned threshold to flag or allow. SHAP contributions explain the score, and the service runs behind FastAPI with Redis and PostgreSQL in Docker."
      steps={[
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
      ]}
      notes={[
        "Explanation: SHAP contributions from the same model.",
        "Service: FastAPI, Redis and PostgreSQL in Docker.",
        "Latency: 1.4 ms p95 for the model call alone.",
      ]}
    />
  );
}

/** LegalAI Kenya's retrieval path (facts: the case study's evidence). */
export function LegalAiPipeline() {
  return (
    <Pipeline
      id="legalai-pipeline"
      title="How a legal question is answered"
      description="A question first passes a jurisdiction guard. It is embedded with Voyage, and vector and full-text candidates are fused in Postgres with reciprocal rank fusion. Voyage reranks the candidates. An evidence floor returns nothing rather than weak matches, and a citation check flags any section that doesn't exist in the corpus. Answers are generated with Gemini or NVIDIA NIM, with fallback, inside the firm's row-level security."
      steps={[
        { title: "Question", detail: "jurisdiction guard first" },
        {
          title: "Candidates",
          detail: "pgvector and full-text, fused with RRF",
        },
        {
          title: "Rerank",
          detail: "Voyage rerank, at most 2 chunks per document",
        },
        { title: "Evidence floor", detail: "returns nothing below 0.45" },
        { title: "Citation check", detail: "flags sections not in the corpus" },
      ]}
      notes={[
        "Generation: Gemini or NVIDIA NIM, with fallback.",
        "Every query runs under the firm's row-level security.",
      ]}
    />
  );
}

/** ComplianceGuard's monitoring path (facts: the case study's evidence). */
export function ComplianceGuardPipeline() {
  return (
    <Pipeline
      id="complianceguard-pipeline"
      title="How one payment is monitored"
      description="A payment from M-Pesa, CSV or core banking is normalised and ingested through Kafka. 35 typology rules run, alongside behavioural, velocity and anomaly scores from Isolation Forest and River. Sanctions, PEP and other context is added, and the engine scores are fused into one weighted composite score, with four advisory engines recorded at weight 0. Above the threshold a hold is created with a drafted SAR, and an analyst works it through case management with four-eyes approval."
      steps={[
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
      ]}
      notes={[
        "Context: sanctions, PEP and adverse-media screening.",
        "Every decision is written to a hash-chained audit ledger.",
      ]}
    />
  );
}
