import type { SkillGroup } from "./schema.ts";

/**
 * Technical skills for the /cv page (task 4.10). Same groups and wording as
 * the public CV PDF in public/cv/, so the two never disagree.
 */
export const skills: SkillGroup[] = [
  {
    group: "Machine learning",
    items: [
      "Python",
      "SQL",
      "scikit-learn",
      "LightGBM",
      "XGBoost",
      "CatBoost",
      "PyTorch",
      "Optuna",
      "SHAP",
      "imbalanced learning (SMOTE)",
      "probability calibration",
      "anomaly detection (Isolation Forest, River)",
    ],
  },
  {
    group: "AI engineering",
    items: [
      "RAG",
      "hybrid (vector + full-text) search with reranking",
      "retrieval evaluation",
      "agent and tool loops",
      "multi-agent orchestration",
      "DSPy",
      "LangChain",
      "MCP",
      "Voyage AI",
      "Gemini",
      "NVIDIA NIM",
      "OpenAI",
      "OpenRouter",
      "vLLM",
    ],
  },
  {
    group: "Data and serving",
    items: [
      "FastAPI",
      "Express (TypeScript)",
      "PostgreSQL / Supabase (pgvector, row-level security)",
      "Redis",
      "Apache Kafka",
      "Airflow",
      "Kedro",
    ],
  },
  {
    group: "MLOps",
    items: [
      "MLflow",
      "Docker",
      "GitHub Actions CI",
      "OpenTelemetry",
      "gVisor sandboxing",
      "pytest",
    ],
  },
];
