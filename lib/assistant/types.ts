/**
 * Shared types for the build-time corpus, typed Fact Units, verified Route
 * Registry, and discriminated POST /api/assistant API contract (docs/05 §5).
 */

export type Visibility = "public" | "partial" | "private";

export type PublicEvidenceLink = {
  label: string;
  url: string | null;
  private: boolean;
};

export type FactUnit = {
  id: string;
  kind: "metric" | "limit" | "callout" | "role" | "recognition" | "demo_spec";
  entitySlug: string;
  label: string;
  value: string;
  datasetOrContext: string;
  caveat: string;
  visibility: Visibility;
  route: string;
  evidenceLinks: PublicEvidenceLink[];
};

export type CorpusChunk = {
  id: string;
  kind:
    | "manifest"
    | "case_study_section"
    | "case_study_metrics"
    | "case_study_limits"
    | "note"
    | "project"
    | "demo"
    | "about"
    | "experience";
  slug: string;
  title: string;
  section: string;
  route: string;
  visibility: Visibility;
  evidenceLinks: PublicEvidenceLink[];
  factIds: string[];
  tags: string[];
  entities: string[];
  priority: number;
  text: string;
  estimatedTokens: number;
  fields: {
    titleTf: Record<string, number>;
    sectionTf: Record<string, number>;
    textTf: Record<string, number>;
    titleLen: number;
    sectionLen: number;
    textLen: number;
  };
};

export type AssistantCorpus = {
  schemaVersion: number;
  contentHash: string;
  siteUrl: string;
  entitySlugs: string[];
  routeRegistry: string[];
  manifestChunkIds: string[];
  facts: FactUnit[];
  chunks: CorpusChunk[];
  bm25f: {
    idf: Record<string, number>;
    avgFieldLen: {
      title: number;
      section: number;
      text: number;
    };
    totalDocs: number;
  };
};

export type PublicFactCard = {
  id: string;
  entitySlug: string;
  label: string;
  value: string;
  datasetOrContext: string;
  caveat: string;
  visibility: Visibility;
  route: string;
  evidenceUrl: string | null;
  evidenceLabel: string | null;
};

export type PublicEvidenceRef = {
  index: number;
  chunkId: string;
  title: string;
  section: string;
  route: string;
  visibility: Visibility;
  externalUrl: string | null;
  externalLabel: string | null;
};

export type RetrievalExcerpt = {
  title: string;
  section: string;
  snippet: string;
  route: string;
  visibility: Visibility;
};

export type AssistantOperationalMode =
  "disabled" | "retrieval_only" | "generation_enabled";

export type AssistantFallbackReason =
  | "configured_retrieval"
  | "budget_reached"
  | "provider_unavailable"
  | "verification_fallback"
  | "out_of_scope"
  | "boundary_policy";

export type AssistantResponse =
  | {
      mode: "generated";
      verdict: "answered" | "not_in_portfolio";
      blocks: {
        heading?: string;
        text: string;
        evidenceIndices: number[];
      }[];
      facts: PublicFactCard[];
      evidence: PublicEvidenceRef[];
      followUps: string[];
      activeEntitySlug: string | null;
      notice: string;
    }
  | {
      mode: "retrieval_only";
      verdict: "answered" | "not_in_portfolio" | "out_of_scope";
      reason: AssistantFallbackReason;
      summary: string;
      excerpts: RetrievalExcerpt[];
      facts: PublicFactCard[];
      evidence: PublicEvidenceRef[];
      followUps: string[];
      activeEntitySlug: string | null;
    };
