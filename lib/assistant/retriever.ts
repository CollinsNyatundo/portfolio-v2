import { getChunk, getCorpus, getFact, getManifestChunks } from "./corpus.ts";
import type { HistoryTurn } from "./schema.ts";
import { estimateTokens, expandQueryTokens, tokenize } from "./tokenize.ts";
import type {
  AssistantCorpus,
  CorpusChunk,
  FactUnit,
  PublicEvidenceRef,
  PublicFactCard,
  RetrievalExcerpt,
} from "./types.ts";

export const DEFAULT_STARTERS = [
  "How does LegalAI Kenya refuse weak answers?",
  "What happened on the fraud model holdout and why no lightgbm at runtime?",
  "Is Collins available for remote AI and ML engineering roles?",
] as const;

const MAX_PACKED_TOKENS = 4200;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PORTFOLIO_ANCHORS = new Set([
  "collins",
  "nyagaka",
  "nyatundo",
  "tundotech",
  "legalai",
  "legalai-kenya",
  "complianceguard",
  "creditcard-fraud",
  "creditcard",
  "fraud",
  "cropland",
  "geo-ai-cropland-mapping",
  "phase5",
  "production-ai-template",
  "mlsys",
  "ml-systems-mcp-server",
  "ml-systems-search",
  "deepresearchagent",
  "deep-research-agent",
  "customer-churn-ml-system",
  "churn",
  "sentiment-analyzer",
  "dspy-sentiment-analyzer",
  "demand-forecasting-system",
  "bank-customer-segmentation",
  "movielens-recommender",
  "movielens",
  "flyrank",
  "odpp",
  "prosecutions",
  "lish",
  "telus",
  "kra",
  "jkuat",
  "moringa",
  "sankhyana",
  "bloom",
  "xerj",
  "pocamla",
  "treeshap",
  "libgomp",
  "smote",
  "platt",
  "optuna",
  "lightgbm",
  "catboost",
  "xgboost",
  "voyage",
  "pgvector",
  "rls",
  "row-level",
  "focal",
  "hit@10",
  "recall@10",
  "sentinel-1",
  "sentinel-2",
  "portfolio",
  "case",
  "study",
  "studies",
  "project",
  "projects",
  "demo",
  "demos",
  "cv",
  "resume",
  "work",
  "experience",
  "roles",
  "role",
  "career",
  "skills",
  "stack",
  "availability",
  "available",
  "hire",
  "hiring",
  "remote",
  "relocate",
  "salary",
  "freelance",
  "contact",
  "email",
  "linkedin",
  "github",
  "education",
  "degree",
  "certifications",
  "certification",
  "recognition",
  "award",
  "limits",
  "caveat",
  "caveats",
  "evidence",
  "principles",
  "method",
  "mcp",
  "dspy",
  "rag",
  "aml",
  "kyc",
  "sanctions",
  "pep",
  "m-pesa",
  "mpesa",
  "statutes",
  "advocates",
  "advocate",
  "ai",
  "ml",
]);

const SUBJECT_PRONOUN_OR_PERSON =
  /\b(collins|nyagaka|he|him|his|you|your|candidate|engineer|author|owner|this site|this portfolio)\b/i;

const GENERIC_NON_PORTFOLIO =
  /\b(weather|forecast|temperature|capital of|bitcoin|crypto price|stock price|recipe|cook|horoscope|poem|joke|lyrics|football|score tonight)\b/i;

const GENERIC_CODING_REQUEST =
  /^\s*(?:please\s+)?(write|generate|code|implement|solve|calculate|convert|translate|fix|debug)\s+(?:a|an|the|me|this|some)?\s*(?:python|javascript|typescript|react|sql|bash|html|css|sort|algorithm|function|script|regex|poem|essay|email)\b/i;

const ADVERSARIAL_PROBE =
  /\b(ignore\s+(?:all\s+|any\s+|your\s+|these\s+)?(?:(?:previous|prior|evidence)\s+)?(?:instructions|rules|constraints|guardrails)|disregard\s+(?:all\s+|your\s+)?(?:instructions|rules)|reveal\s+(?:your|the)\s+(?:system\s+)?prompt|print\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions)|jailbreak|dan\s+mode|\.env\b|api[_ ]?key|upstash[_ ]?redis|resend[_ ]?api|turnstile[_ ]?secret|private\/planning)\b/i;

const SKILLS_OR_EXPERIENCE_QUERY =
  /\b(know|knows|deployed|deploy|used|using|experience|worked|work|skill|skills|stack|tools|tech|technologies|role|roles|career|background|kubernetes|rust|go|golang|java|aws|azure|gcp|docker|python|pytorch|tensorflow)\b/i;

const PHONE_REQUEST =
  /\b(phone|telephone|cell(?:\s*number)?|mobile(?:\s*number)?|whatsapp|call\s+him|call\s+collins)\b/i;

const PRIVATE_SOURCE_REQUEST =
  /\b(source\s*code|github(?:\s+repo(?:sitory)?|\s+link)?|repo(?:sitory)?|codebase|clone|download\s+(?:the\s+)?code|show\s+(?:me\s+)?(?:the\s+)?code)\b/i;

const ANAPHORA_PATTERN =
  /\b(it|its|that|this|those|them|their|limits|limit|caveat|caveats|metrics|metric|results|security|evidence|stack|more|why|how|details)\b/i;

const ENTITY_ALIASES: Record<string, string> = {
  legalai: "legalai-kenya",
  "legalai-kenya": "legalai-kenya",
  legal: "legalai-kenya",
  advocates: "legalai-kenya",
  statutes: "legalai-kenya",
  fraud: "creditcard-fraud",
  "creditcard-fraud": "creditcard-fraud",
  creditcard: "creditcard-fraud",
  libgomp: "scoring-lightgbm-without-lightgbm",
  treeshap: "scoring-lightgbm-without-lightgbm",
  complianceguard: "complianceguard",
  aml: "complianceguard",
  pocamla: "complianceguard",
  "m-pesa": "complianceguard",
  mpesa: "complianceguard",
  "production-ai-template": "production-ai-template",
  template: "production-ai-template",
  cropland: "geo-ai-cropland-mapping",
  "geo-ai-cropland-mapping": "geo-ai-cropland-mapping",
  satellite: "geo-ai-cropland-mapping",
  smote: "oversampling-before-the-split",
  "oversampling-before-the-split": "oversampling-before-the-split",
  "scoring-lightgbm-without-lightgbm": "scoring-lightgbm-without-lightgbm",
  tundotech: "tundotech-systems",
  "tundotech-systems": "tundotech-systems",
  "ml-systems-mcp-server": "ml-systems-mcp-server",
  "ml-systems-search": "ml-systems-search",
  mlsys: "ml-systems-search",
  mcp: "ml-systems-mcp-server",
  churn: "customer-churn-ml-system",
  "customer-churn-ml-system": "customer-churn-ml-system",
  deepresearchagent: "deep-research-agent",
  "deep-research-agent": "deep-research-agent",
  dspy: "dspy-sentiment-analyzer",
  "dspy-sentiment-analyzer": "dspy-sentiment-analyzer",
  forecasting: "demand-forecasting-system",
  "demand-forecasting-system": "demand-forecasting-system",
  segmentation: "bank-customer-segmentation",
  "bank-customer-segmentation": "bank-customer-segmentation",
  movielens: "movielens-recommender",
  "movielens-recommender": "movielens-recommender",
};

const PRIVATE_ENTITY_SLUGS = new Set([
  "legalai-kenya",
  "complianceguard",
  "tundotech-systems",
]);

const CASE_STUDY_SLUGS = new Set([
  "legalai-kenya",
  "creditcard-fraud",
  "complianceguard",
  "production-ai-template",
  "geo-ai-cropland-mapping",
]);

export function detectMentionedEntities(text: string): string[] {
  const tokens = tokenize(text);
  const found = new Set<string>();
  for (const t of tokens) {
    const slug = ENTITY_ALIASES[t];
    if (slug) found.add(slug);
  }
  return [...found];
}

export function pageSlugFromContext(
  pageContext: string | undefined,
): string | null {
  if (!pageContext) return null;
  const workMatch = /^\/work\/([a-z0-9-]+)$/.exec(pageContext);
  if (workMatch) return workMatch[1];
  const noteMatch = /^\/notes\/([a-z0-9-]+)$/.exec(pageContext);
  if (noteMatch) return noteMatch[1];
  if (pageContext === "/demos/fraud") return "creditcard-fraud";
  if (pageContext === "/demos/ml-systems-search") return "ml-systems-search";
  return null;
}

export function resolveActiveEntity(params: {
  question: string;
  pageContext?: string;
  activeEntitySlug?: string | null;
  history?: HistoryTurn[];
}): string[] {
  const direct = detectMentionedEntities(params.question);
  if (direct.length > 0) return direct;

  if (ANAPHORA_PATTERN.test(params.question)) {
    if (params.activeEntitySlug) return [params.activeEntitySlug];
    if (params.history) {
      for (let i = params.history.length - 1; i >= 0; i--) {
        if (params.history[i].role === "user") {
          const fromHistory = detectMentionedEntities(
            params.history[i].content,
          );
          if (fromHistory.length > 0) return fromHistory;
        }
      }
    }
    const pageSlug = pageSlugFromContext(params.pageContext);
    if (pageSlug) return [pageSlug];
  }
  return [];
}

function bm25fScore(
  chunk: CorpusChunk,
  weightedTerms: Map<string, number>,
  corpus: AssistantCorpus,
): number {
  const k1 = 1.2;
  const b = 0.5;
  const wTitle = 3.0;
  const wSection = 2.0;
  const wText = 1.0;

  const avgTitle = Math.max(1, corpus.bm25f.avgFieldLen.title);
  const avgSection = Math.max(1, corpus.bm25f.avgFieldLen.section);
  const avgText = Math.max(1, corpus.bm25f.avgFieldLen.text);

  let score = 0;
  for (const [term, qWeight] of weightedTerms) {
    const idf = corpus.bm25f.idf[term];
    if (!idf) continue;

    const tfTitle = chunk.fields.titleTf[term] ?? 0;
    const tfSection = chunk.fields.sectionTf[term] ?? 0;
    const tfText = chunk.fields.textTf[term] ?? 0;
    if (tfTitle === 0 && tfSection === 0 && tfText === 0) continue;

    const normTitle =
      tfTitle === 0
        ? 0
        : (wTitle * tfTitle) / (1 - b + b * (chunk.fields.titleLen / avgTitle));
    const normSection =
      tfSection === 0
        ? 0
        : (wSection * tfSection) /
          (1 - b + b * (chunk.fields.sectionLen / avgSection));
    const normText =
      tfText === 0
        ? 0
        : (wText * tfText) / (1 - b + b * (chunk.fields.textLen / avgText));

    const pseudoTf = normTitle + normSection + normText;
    score += qWeight * idf * ((pseudoTf * (k1 + 1)) / (pseudoTf + k1));
  }
  return score;
}

export type ScopeDecision =
  | {
      kind: "deterministic_refusal";
      verdict: "out_of_scope";
      reason: "out_of_scope";
      summary: string;
      excerpts: RetrievalExcerpt[];
      facts: PublicFactCard[];
      evidence: PublicEvidenceRef[];
      followUps: string[];
    }
  | {
      kind: "deterministic_boundary";
      verdict: "answered" | "not_in_portfolio";
      reason: "boundary_policy";
      summary: string;
      excerpts: RetrievalExcerpt[];
      facts: PublicFactCard[];
      evidence: PublicEvidenceRef[];
      followUps: string[];
      activeEntitySlug: string | null;
    }
  | {
      kind: "in_scope";
      activeEntities: string[];
    };

export function classifyScope(params: {
  question: string;
  pageContext?: string;
  activeEntitySlug?: string | null;
  history?: HistoryTurn[];
}): ScopeDecision {
  const q = params.question.trim();

  if (ADVERSARIAL_PROBE.test(q)) {
    return {
      kind: "deterministic_refusal",
      verdict: "out_of_scope",
      reason: "out_of_scope",
      summary:
        "I only answer questions about Collins Nyagaka's published portfolio, case studies, technical notes, skills, and availability.",
      excerpts: [],
      facts: [],
      evidence: [],
      followUps: [...DEFAULT_STARTERS],
    };
  }

  if (PHONE_REQUEST.test(q)) {
    const idChunk = getChunk("manifest:identity");
    return {
      kind: "deterministic_boundary",
      verdict: "not_in_portfolio",
      reason: "boundary_policy",
      summary:
        "Collins does not publish his phone number on the portfolio. You can email him at cnyagakan@gmail.com or reach him via the Contact page.",
      excerpts: idChunk
        ? [
            {
              title: idChunk.title,
              section: idChunk.section,
              snippet:
                "Phone: Not published on the portfolio. Email: cnyagakan@gmail.com (replies within 2 working days EAT).",
              route: "/contact",
              visibility: "public",
            },
          ]
        : [],
      facts: [],
      evidence: idChunk
        ? [
            {
              index: 1,
              chunkId: idChunk.id,
              title: idChunk.title,
              section: idChunk.section,
              route: "/contact",
              visibility: "public",
              externalUrl: null,
              externalLabel: null,
            },
          ]
        : [],
      followUps: [
        "How can I contact Collins or download his CV?",
        "Is Collins available for remote roles?",
      ],
      activeEntitySlug: null,
    };
  }

  const activeEntities = resolveActiveEntity(params);

  // Explicit request for source code of a private-visibility project/case study.
  if (
    PRIVATE_SOURCE_REQUEST.test(q) &&
    activeEntities.length === 1 &&
    PRIVATE_ENTITY_SLUGS.has(activeEntities[0])
  ) {
    const slug = activeEntities[0];
    const overview =
      getChunk(`case:${slug}:overview`) ?? getChunk(`project:${slug}`);
    const route = CASE_STUDY_SLUGS.has(slug)
      ? `/work/${slug}`
      : `/work#${slug}`;
    return {
      kind: "deterministic_boundary",
      verdict: "answered",
      reason: "boundary_policy",
      summary: `${overview?.title ?? slug} is marked Private work, so no source code or GitHub repository is public. You can read its architecture and evaluation notes on ${route} or request a walkthrough via Contact.`,
      excerpts: overview
        ? [
            {
              title: overview.title,
              section: overview.section,
              snippet: overview.text.slice(0, 320),
              route,
              visibility: "private",
            },
          ]
        : [],
      facts: [],
      evidence: [
        ...(overview
          ? [
              {
                index: 1,
                chunkId: overview.id,
                title: overview.title,
                section: overview.section,
                route,
                visibility: "private" as const,
                externalUrl: null,
                externalLabel: "Private work",
              },
            ]
          : []),
        {
          index: overview ? 2 : 1,
          chunkId: "manifest:identity",
          title: "Request a walkthrough",
          section: "Contact",
          route: `/contact?topic=${slug}`,
          visibility: "public",
          externalUrl: null,
          externalLabel: null,
        },
      ],
      followUps: [
        `What are the main limits of ${overview?.title ?? slug}?`,
        "Which repositories on the portfolio are public?",
      ],
      activeEntitySlug: slug,
    };
  }

  if (GENERIC_NON_PORTFOLIO.test(q) && activeEntities.length === 0) {
    return {
      kind: "deterministic_refusal",
      verdict: "out_of_scope",
      reason: "out_of_scope",
      summary:
        "I only answer questions about Collins Nyagaka's public portfolio, projects, engineering methods, and availability.",
      excerpts: [],
      facts: [],
      evidence: [],
      followUps: [...DEFAULT_STARTERS],
    };
  }

  const tokens = tokenize(q);
  const hasPortfolioAnchor = tokens.some((t) => PORTFOLIO_ANCHORS.has(t));
  const hasSubjectOrPerson = SUBJECT_PRONOUN_OR_PERSON.test(q);
  const hasHistoryFollowUp =
    activeEntities.length > 0 && ANAPHORA_PATTERN.test(q);

  if (
    GENERIC_CODING_REQUEST.test(q) &&
    activeEntities.length === 0 &&
    !hasSubjectOrPerson
  ) {
    return {
      kind: "deterministic_refusal",
      verdict: "out_of_scope",
      reason: "out_of_scope",
      summary:
        "I cannot act as a general coding assistant. Ask me about Collins Nyagaka's projects, metrics, security checks, or experience instead.",
      excerpts: [],
      facts: [],
      evidence: [],
      followUps: [...DEFAULT_STARTERS],
    };
  }

  if (
    activeEntities.length === 0 &&
    !hasPortfolioAnchor &&
    !hasSubjectOrPerson &&
    !hasHistoryFollowUp
  ) {
    return {
      kind: "deterministic_refusal",
      verdict: "out_of_scope",
      reason: "out_of_scope",
      summary:
        "That looks outside Collins Nyagaka's portfolio. Ask about his case studies, live demos, engineering methods, experience, or availability.",
      excerpts: [],
      facts: [],
      evidence: [],
      followUps: [...DEFAULT_STARTERS],
    };
  }

  return { kind: "in_scope", activeEntities };
}

export type PackedContext = {
  chunks: CorpusChunk[];
  facts: FactUnit[];
  allowedChunkIds: Set<string>;
  allowedFactIds: Set<string>;
  activeEntitySlug: string | null;
  topScores: { id: string; score: number }[];
  estimatedTokens: number;
};

export function factToPublicCard(fact: FactUnit): PublicFactCard {
  const firstPublic = fact.evidenceLinks.find((e) => e.url && !e.private);
  return {
    id: fact.id,
    entitySlug: fact.entitySlug,
    label: fact.label,
    value: fact.value,
    datasetOrContext: fact.datasetOrContext,
    caveat: fact.caveat,
    visibility: fact.visibility,
    route: fact.route,
    evidenceUrl:
      fact.visibility === "private" ? null : (firstPublic?.url ?? null),
    evidenceLabel:
      fact.visibility === "private"
        ? "Private work"
        : (firstPublic?.label ?? null),
  };
}

export function retrieveAndPack(params: {
  question: string;
  pageContext?: string;
  activeEntitySlug?: string | null;
  history?: HistoryTurn[];
}): PackedContext {
  const corpus = getCorpus();
  const baseTokens = tokenize(params.question);
  const expanded = expandQueryTokens(baseTokens);
  const activeEntities = resolveActiveEntity(params);
  const pageSlug = pageSlugFromContext(params.pageContext);

  const weightedTerms = new Map<string, number>();
  for (const t of baseTokens) weightedTerms.set(t, 1.0);
  for (const t of expanded) {
    if (!weightedTerms.has(t)) weightedTerms.set(t, 0.7);
  }
  if (activeEntities.length > 0 && baseTokens.length <= 6) {
    for (const slug of activeEntities) {
      for (const t of tokenize(slug)) {
        if (!weightedTerms.has(t)) weightedTerms.set(t, 0.85);
      }
    }
  }

  const scored = corpus.chunks
    .map((chunk) => {
      let score = bm25fScore(chunk, weightedTerms, corpus);
      if (activeEntities.includes(chunk.slug)) score += 2.2;
      if (pageSlug && chunk.slug === pageSlug) score += 0.6;
      score += chunk.priority * 0.05;
      return { chunk, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.chunk.id.localeCompare(b.chunk.id);
    });

  const selected: CorpusChunk[] = [];
  const selectedIds = new Set<string>();
  const addChunk = (c: CorpusChunk | undefined) => {
    if (!c || selectedIds.has(c.id)) return;
    selectedIds.add(c.id);
    selected.push(c);
  };

  // Always include compact identity + work-index manifest anchors so general
  // recruiter questions never miss canonical facts.
  addChunk(getChunk("manifest:identity"));
  addChunk(getChunk("manifest:work-index"));
  if (SKILLS_OR_EXPERIENCE_QUERY.test(params.question)) {
    addChunk(getChunk("manifest:skills"));
    addChunk(getChunk("manifest:experience"));
  }

  // Guarantee multi-entity diversity when comparing projects.
  for (const entity of activeEntities) {
    const entityChunks = scored
      .filter((s) => s.chunk.slug === entity)
      .slice(0, 3);
    for (const ec of entityChunks) addChunk(ec.chunk);
  }

  // Add top BM25F results with per-entity diversity cap (max 3 per slug
  // unless directly named) so one multi-section study cannot crowd out others.
  const perSlugCount = new Map<string, number>();
  for (const c of selected) {
    perSlugCount.set(c.slug, (perSlugCount.get(c.slug) ?? 0) + 1);
  }
  for (const s of scored) {
    if (selected.length >= 10) break;
    if (s.score <= 0.25 && selected.length >= 5) break;
    const count = perSlugCount.get(s.chunk.slug) ?? 0;
    const cap = activeEntities.includes(s.chunk.slug) ? 4 : 2;
    if (s.chunk.kind !== "manifest" && count >= cap) continue;
    addChunk(s.chunk);
    perSlugCount.set(s.chunk.slug, count + 1);
  }

  // Fallback to manifests if query matched broadly (e.g. "AI", "ML").
  if (selected.length < 4) {
    for (const m of getManifestChunks()) addChunk(m);
  }

  // D-05 Evidence-Coupled Retrieval: whenever a case study's metrics/results or
  // overview chunk is an active entity or among the top 5 non-manifest chunks,
  // deterministically co-include its Limits chunk.
  const topNonManifestIds = new Set(
    selected
      .filter((c) => c.kind !== "manifest")
      .slice(0, 5)
      .map((c) => c.id),
  );
  const coupledLimits: CorpusChunk[] = [];
  for (const c of selected) {
    if (
      (activeEntities.includes(c.slug) || topNonManifestIds.has(c.id)) &&
      (c.kind === "case_study_metrics" ||
        c.id.endsWith(":overview") ||
        c.id.endsWith(":results")) &&
      CASE_STUDY_SLUGS.has(c.slug)
    ) {
      const limitsChunk = getChunk(`case:${c.slug}:limits`);
      if (limitsChunk && !selectedIds.has(limitsChunk.id)) {
        coupledLimits.push(limitsChunk);
      }
    }
  }
  for (const lc of coupledLimits) addChunk(lc);

  const scoreById = new Map(scored.map((s) => [s.chunk.id, s.score]));

  // Collect attached FactUnits for selected chunks, preserving required limits.
  const computeFactTokens = () => {
    const fids = new Set<string>();
    for (const c of selected) {
      for (const fid of c.factIds) fids.add(fid);
    }
    let total = 0;
    for (const fid of fids) {
      const f = getFact(fid);
      if (f) total += estimateTokens(`${f.label} ${f.value} ${f.caveat}`);
    }
    return total;
  };

  const totalPackedTokens = () =>
    selected.reduce((sum, c) => sum + c.estimatedTokens, 0) +
    computeFactTokens();

  // Enforce measured token ceiling by trimming lowest-scoring non-pinned chunks
  // (never dropping manifest:identity, top-3 scored chunks, or active entity limits).
  const topScoredIds = new Set(scored.slice(0, 3).map((s) => s.chunk.id));
  // A question that names a section of an active project ("compare the
  // evaluation of X and Y") keeps that section, even when it is long.
  const questionLower = params.question.toLowerCase();
  const namedSectionIds = new Set(
    selected
      .filter(
        (c) =>
          c.kind !== "manifest" &&
          activeEntities.includes(c.slug) &&
          c.section.length > 3 &&
          new RegExp(`\\b${escapeRegExp(c.section.toLowerCase())}\\b`).test(
            questionLower,
          ),
      )
      .map((c) => c.id),
  );
  while (totalPackedTokens() > MAX_PACKED_TOKENS && selected.length > 3) {
    let dropIdx = -1;
    let lowestScore = Infinity;
    for (let i = 0; i < selected.length; i++) {
      const c = selected[i];
      if (
        c.id === "manifest:identity" ||
        topScoredIds.has(c.id) ||
        (c.kind === "case_study_limits" && activeEntities.includes(c.slug)) ||
        namedSectionIds.has(c.id)
      ) {
        continue;
      }
      const s = scoreById.get(c.id) ?? 0;
      if (s < lowestScore) {
        lowestScore = s;
        dropIdx = i;
      }
    }
    if (dropIdx === -1) break;
    selected.splice(dropIdx, 1);
  }

  // Recompute allowed facts strictly from remaining selected chunks so no orphan
  // facts sit outside packed chunks.
  const finalFacts = new Map<string, FactUnit>();
  for (const c of selected) {
    for (const fid of c.factIds) {
      const f = getFact(fid);
      if (f) finalFacts.set(f.id, f);
    }
  }

  const primarySlug =
    activeEntities[0] ??
    selected.find((c) => c.slug !== "manifest" && c.slug !== "about")?.slug ??
    null;

  return {
    chunks: selected,
    facts: [...finalFacts.values()],
    allowedChunkIds: new Set(selected.map((c) => c.id)),
    allowedFactIds: new Set(finalFacts.keys()),
    activeEntitySlug: primarySlug,
    topScores: scored.slice(0, 5).map((s) => ({
      id: s.chunk.id,
      score: Number(s.score.toFixed(3)),
    })),
    estimatedTokens:
      selected.reduce((sum, c) => sum + c.estimatedTokens, 0) +
      [...finalFacts.values()].reduce(
        (sum, f) => sum + estimateTokens(`${f.label} ${f.value} ${f.caveat}`),
        0,
      ),
  };
}

export function buildRetrievalFallbackResponse(params: {
  packed: PackedContext;
  reason:
    | "configured_retrieval"
    | "budget_reached"
    | "provider_unavailable"
    | "verification_fallback";
  question: string;
}): {
  mode: "retrieval_only";
  verdict: "answered";
  reason:
    | "configured_retrieval"
    | "budget_reached"
    | "provider_unavailable"
    | "verification_fallback";
  summary: string;
  excerpts: RetrievalExcerpt[];
  facts: PublicFactCard[];
  evidence: PublicEvidenceRef[];
  followUps: string[];
  activeEntitySlug: string | null;
} {
  // Prefer substantive non-manifest chunks first for human-readable excerpts,
  // while preserving attached limits/facts (R4).
  const contentChunks = params.packed.chunks.filter(
    (c) => c.kind !== "manifest",
  );
  const ordered = (
    contentChunks.length > 0 ? contentChunks : params.packed.chunks
  ).slice(0, 3);

  const excerpts: RetrievalExcerpt[] = ordered.map((c) => ({
    title: c.title,
    section: c.section,
    snippet: c.text.slice(0, 340),
    route: c.route,
    visibility: c.visibility,
  }));

  const evidence: PublicEvidenceRef[] = ordered.map((c, idx) => {
    const publicExt =
      c.visibility === "private"
        ? undefined
        : c.evidenceLinks.find((e) => e.url && !e.private);
    return {
      index: idx + 1,
      chunkId: c.id,
      title: c.title,
      section: c.section,
      route: c.route,
      visibility: c.visibility,
      externalUrl: publicExt?.url ?? null,
      externalLabel:
        c.visibility === "private"
          ? "Private work"
          : (publicExt?.label ?? null),
    };
  });

  const facts: PublicFactCard[] = [];
  const seenFact = new Set<string>();
  for (const c of ordered) {
    for (const fid of c.factIds) {
      if (seenFact.has(fid)) continue;
      const f = params.packed.facts.find((x) => x.id === fid);
      if (f) {
        seenFact.add(fid);
        facts.push(factToPublicCard(f));
      }
      if (facts.length >= 4) break;
    }
    if (facts.length >= 4) break;
  }

  const reasonPrefix: Record<typeof params.reason, string> = {
    configured_retrieval:
      "Retrieval mode is active. Here are the matching portfolio sections and recorded facts.",
    budget_reached:
      "Today's generation budget is reached, so here are the matching portfolio sections directly.",
    provider_unavailable:
      "Live answer generation is temporarily unavailable. Here are the matching portfolio sections directly.",
    verification_fallback:
      "The generated draft did not pass grounding checks, so here are the matching portfolio sections directly.",
  };

  return {
    mode: "retrieval_only",
    verdict: "answered",
    reason: params.reason,
    summary: reasonPrefix[params.reason],
    excerpts,
    facts,
    evidence,
    followUps: [...DEFAULT_STARTERS].slice(0, 2),
    activeEntitySlug: params.packed.activeEntitySlug,
  };
}
