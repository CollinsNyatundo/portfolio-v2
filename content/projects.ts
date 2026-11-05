import type { Demo, Project } from "./schema.ts";

/**
 * Secondary project cards (docs/05 §2). Only projects approved in the private
 * content inventory appear here (AGENTS.md rule 6). Summaries carry no figures:
 * numbers belong in case studies, next to their dataset and source.
 */
export const projects: Project[] = [
  {
    slug: "ml-systems-mcp-server",
    title: "Machine Learning Systems Reference MCP Server",
    summary:
      "A read-only FastMCP server that makes an adapted open ML systems textbook searchable from AI assistants, with CI on Ubuntu and Windows.",
    tags: ["ai-engineering", "retrieval", "llm"],
    visibility: "public",
    repoUrl:
      "https://github.com/CollinsNyatundo/machine-learning-systems-plugin",
    year: 2026,
  },
  {
    slug: "customer-churn-ml-system",
    title: "Customer Churn ML System",
    summary:
      "Reproducible churn modelling with validation-based model and threshold selection, MLflow tracking, FastAPI serving and drift checks.",
    tags: ["ml", "mlops", "evaluation"],
    visibility: "public",
    repoUrl: "https://github.com/CollinsNyatundo/customer-churn-ml-system",
    year: 2026,
  },
  {
    slug: "deep-research-agent",
    title: "Deep Research Agent",
    summary:
      "An iterative web-research agent with workspace-isolated notes, document ingestion and exportable reports.",
    tags: ["ai-engineering", "llm", "retrieval"],
    visibility: "public",
    repoUrl: "https://github.com/CollinsNyatundo/deepresearchagent",
    year: 2026,
  },
  {
    slug: "dspy-sentiment-analyzer",
    title: "Structured LLM Sentiment Analysis with DSPy",
    summary:
      "Structured sentiment analysis and a multi-turn dialogue agent built with DSPy, with experiments tracked in MLflow.",
    tags: ["llm", "evaluation"],
    visibility: "public",
    repoUrl: "https://github.com/CollinsNyatundo/sentiment-analyzer",
    year: 2026,
  },
  {
    slug: "demand-forecasting-system",
    title: "Demand Forecasting System",
    summary:
      "A demand forecasting system with published documentation of its data pipeline and models.",
    tags: ["ml", "data"],
    visibility: "public",
    repoUrl: "https://github.com/CollinsNyatundo/demandforecastingsystem-v2",
    liveUrl: "https://freelance-4888ed08.mintlify.app/",
    year: 2026,
  },
  {
    slug: "bank-customer-segmentation",
    title: "Bank Customer Segmentation",
    summary:
      "K-Means segmentation of bank customers on demographic and transaction data to target personalised offers.",
    tags: ["ml", "data", "fintech"],
    visibility: "public",
    repoUrl:
      "https://github.com/CollinsNyatundo/Bank-Customer-Segmentation-and-Personalization",
    year: 2024,
  },
  {
    slug: "movielens-recommender",
    title: "MovieLens Recommender System",
    summary:
      "Five recommendation approaches compared with ranking and rating metrics, including a hybrid for cold-start users (Moringa School project).",
    tags: ["ml", "evaluation"],
    visibility: "public",
    repoUrl: "https://github.com/CollinsNyatundo/movielens_recommender_system",
    year: 2025,
  },
];

/**
 * Live demos (D-08). The fraud demo is live, which also shows home Act IV.
 * The search demo works on its page, but stays "offline" here: a live demo
 * must point at a published case study, and the MCP server is a project card.
 */
export const demos: Demo[] = [
  {
    slug: "fraud",
    title: "Fraud-score explorer",
    summary:
      "Score a real credit-card transaction and see the decision and its five strongest reasons.",
    endpoint: "/api/demos/fraud/score",
    status: "live",
    caseStudy: "creditcard-fraud",
    modelCard: {
      data: "ULB credit-card transactions (284,807 rows, 0.17% fraud), PCA-anonymised, CC BY-NC-SA 4.0",
      split: "Chronological train, validation and holdout splits",
      metrics: [
        "F1, precision, recall and ROC-AUC on the time-ordered holdout",
      ],
      limits: [
        "A 2013 European dataset; not representative of Kenyan card traffic.",
        "Scores need the previous ten transactions, so samples come with their history.",
      ],
    },
    recordedExample: "/demos/fraud/recorded-example.json",
  },
  {
    slug: "ml-systems-search",
    title: "ML Systems reference search",
    summary:
      "Search an adapted open textbook on machine learning systems, the same index the MCP server uses.",
    endpoint: "/api/demos/mlsys/search",
    status: "offline",
    caseStudy: "ml-systems-mcp-server",
    modelCard: {
      data: "Adapted edition of V. J. Reddi's Machine Learning Systems, CC BY-NC-SA 4.0",
      split: "Not applicable (BM25 keyword retrieval, no training)",
      metrics: [],
      limits: ["Keyword search: it matches words, not meaning."],
    },
    recordedExample: "/demos/ml-systems-search/recorded-example.json",
  },
];
