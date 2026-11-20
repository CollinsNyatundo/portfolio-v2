/**
 * Build-time AST corpus compiler for the v2 portfolio assistant (D-33).
 *
 * Reads ONLY validated public content, projects strictly allowed fields
 * (filtering publication status and private repo URLs independently), parses
 * MDX bodies via remark AST without code evaluation (D-29), compiles typed
 * FactUnits and citeable Manifest chunks, validates every route against a
 * closed Route Registry, precomputes BM25F statistics, and writes atomically
 * to `content/.generated/assistant-corpus.json`.
 *
 *   node scripts/build-assistant-corpus.ts
 *   node scripts/build-assistant-corpus.ts --check
 */
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import matter from "gray-matter";
import type { Content, Heading, Node, Root } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { focusAreas, principles } from "../content/about.ts";
import { skills } from "../content/cv.ts";
import { DIAGRAM_SPECS, type DiagramSpec } from "../content/diagrams.ts";
import {
  certifications,
  experience,
  recognition,
} from "../content/experience.ts";
import { demos, projects } from "../content/projects.ts";
import {
  CASE_STUDY_SECTIONS,
  caseStudyFrontmatter,
  certification as certificationSchema,
  demo as demoSchema,
  experience as experienceSchema,
  focusArea as focusAreaSchema,
  noteFrontmatter,
  principle as principleSchema,
  project as projectSchema,
  recognition as recognitionSchema,
  skillGroup as skillGroupSchema,
  type CaseStudyFrontmatter,
  type Certification,
  type Demo,
  type Experience,
  type FocusArea,
  type NoteFrontmatter,
  type Principle,
  type Project,
  type Recognition,
  type SkillGroup,
} from "../content/schema.ts";
import { site } from "../content/site.ts";
import { TAG_LABELS } from "../content/tags.ts";
import { estimateTokens, tokenize } from "../lib/assistant/tokenize.ts";
import type {
  AssistantCorpus,
  CorpusChunk,
  FactUnit,
  PublicEvidenceLink,
  Visibility,
} from "../lib/assistant/types.ts";

export const CORPUS_SCHEMA_VERSION = 1;
export const MAX_CORPUS_BYTES = 512 * 1024;

const PHONE_PATTERN = /(?:\+254\s?\d{6,}|\b07\d{2}[\s-]?\d{6}\b)/;
const SITE_URL = "https://collinsnyagaka.com";

export class CorpusError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Assistant corpus error:\n  - ${problems.join("\n  - ")}`);
    this.problems = problems;
  }
}

export type PublicSiteProjection = {
  name: string;
  fullName: string;
  title: string;
  location: string;
  timeZone: string;
  utcOffsetLabel: string;
  availability: string;
  availabilityNote: string;
  email: string;
  links: {
    linkedin: string;
    github: string;
    company: string;
  };
  cvPath: string;
  positioning: string;
};

export type CorpusBuildOptions = {
  contentDir?: string;
  siteData?: PublicSiteProjection;
  focusAreasData?: FocusArea[];
  principlesData?: Principle[];
  skillsData?: SkillGroup[];
  experienceData?: Experience[];
  certificationsData?: Certification[];
  recognitionData?: Recognition[];
  projectsData?: Project[];
  demosData?: Demo[];
  diagramsData?: Record<string, DiagramSpec>;
};

/** Exact anchor ID algorithm shared with `mdx-components.tsx` (docs/03 §6). */
export function anchorId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mdxFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .sort()
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

type MdxAttribute = {
  type?: string;
  name?: string;
  value?: unknown;
};

type MdxJsxNode = Node & {
  name?: string | null;
  attributes?: MdxAttribute[];
  children?: Content[];
};

function attrString(node: MdxJsxNode, attrName: string): string | null {
  const attr = (node.attributes ?? []).find((a) => a.name === attrName);
  if (!attr) return null;
  if (typeof attr.value === "string") return attr.value;
  return null;
}

const SUPPORTED_JSX_TAGS = new Set([
  "Metrics",
  "Limits",
  "Callout",
  "Figure",
  "FraudPipeline",
  "LegalAiPipeline",
  "ComplianceGuardPipeline",
]);

type ExtractedCallout = {
  title: string;
  kind: string;
  section: string;
  text: string;
};

type ExtractedSection = {
  heading: string;
  anchor: string;
  text: string;
  callouts: ExtractedCallout[];
};

function assertNoUnsupportedConstructs(
  node: Node,
  where: string,
  diagrams: Record<string, DiagramSpec>,
): void {
  if (
    node.type === "mdxjsEsm" ||
    node.type === "mdxFlowExpression" ||
    node.type === "mdxTextExpression" ||
    node.type === "html"
  ) {
    throw new CorpusError([
      `${where}: unsupported MDX/HTML construct "${node.type}"`,
    ]);
  }
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    const jsx = node as MdxJsxNode;
    const tag = jsx.name ?? "(fragment)";
    if (!SUPPORTED_JSX_TAGS.has(tag) && !(tag in diagrams)) {
      throw new CorpusError([`${where}: unsupported JSX element <${tag}>`]);
    }
    for (const attr of jsx.attributes ?? []) {
      if (attr.type === "mdxJsxExpressionAttribute") {
        throw new CorpusError([
          `${where}: expression attribute on <${tag}> is not supported`,
        ]);
      }
      if (attr.value && typeof attr.value !== "string") {
        throw new CorpusError([
          `${where}: non-string attribute "${attr.name}" on <${tag}> is not supported`,
        ]);
      }
    }
  }
  const maybeParent = node as { children?: Node[] };
  if (Array.isArray(maybeParent.children)) {
    for (const child of maybeParent.children) {
      assertNoUnsupportedConstructs(child, where, diagrams);
    }
  }
}

function renderDiagramText(spec: DiagramSpec): string {
  const stepLines = spec.steps.map(
    (s, idx) => `Step ${idx + 1}: ${s.title} (${s.detail})`,
  );
  const noteLines = spec.notes.map((n) => `Diagram note: ${n}`);
  return [
    `Diagram "${spec.title}": ${spec.description}`,
    ...stepLines,
    ...noteLines,
  ].join("\n");
}

function extractNodeText(
  node: Content,
  ctx: {
    where: string;
    section: string;
    metricsText: string;
    limitsText: string;
    diagrams: Record<string, DiagramSpec>;
    callouts: ExtractedCallout[];
  },
): string {
  if (node.type === "yaml") return "";
  if (node.type === "code") {
    return node.value.trim();
  }
  if (node.type === "inlineCode") {
    return node.value;
  }
  if (node.type === "text") {
    return node.value;
  }
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    const jsx = node as MdxJsxNode;
    const tag = jsx.name ?? "";
    if (tag === "Metrics") return ctx.metricsText;
    if (tag === "Limits") return ctx.limitsText;
    if (tag in ctx.diagrams) {
      return renderDiagramText(ctx.diagrams[tag]);
    }
    if (tag === "Figure") {
      const caption = attrString(jsx, "caption") ?? "";
      const inner = (jsx.children ?? [])
        .map((c) => extractNodeText(c, ctx))
        .filter(Boolean)
        .join("\n");
      return [caption ? `Figure caption: ${caption}` : "", inner]
        .filter(Boolean)
        .join("\n");
    }
    if (tag === "Callout") {
      const title = attrString(jsx, "title") ?? "Note";
      const kind = attrString(jsx, "kind") ?? "caveat";
      const body = (jsx.children ?? [])
        .map((c) => extractNodeText(c, ctx))
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      ctx.callouts.push({ title, kind, section: ctx.section, text: body });
      return `Callout (${kind} - ${title}): ${body}`;
    }
  }
  if (node.type === "list") {
    return node.children
      .map(
        (item) =>
          `- ${item.children
            .map((c) => extractNodeText(c, ctx))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()}`,
      )
      .join("\n");
  }
  if (node.type === "table") {
    return node.children
      .map((row) =>
        row.children
          .map((cell) =>
            cell.children
              .map((c) => extractNodeText(c, ctx))
              .join(" ")
              .replace(/\s+/g, " ")
              .trim(),
          )
          .join(" | "),
      )
      .join("\n");
  }
  if ("children" in node && Array.isArray(node.children)) {
    return (node.children as Content[])
      .map((c) => extractNodeText(c, ctx))
      .join(node.type === "blockquote" ? " " : "")
      .replace(/\s+/g, " ")
      .trim();
  }
  return mdastToString(node).replace(/\s+/g, " ").trim();
}

const mdxProcessor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm)
  .use(remarkMdx);

export function extractMdxSections(
  body: string,
  opts: {
    where: string;
    metricsText?: string;
    limitsText?: string;
    diagrams?: Record<string, DiagramSpec>;
  },
): ExtractedSection[] {
  const tree = mdxProcessor.parse(body) as Root;
  const diagrams = opts.diagrams ?? DIAGRAM_SPECS;
  assertNoUnsupportedConstructs(tree, opts.where, diagrams);

  const sections: ExtractedSection[] = [];
  let currentHeading = "Overview";
  let currentParts: string[] = [];
  let currentCallouts: ExtractedCallout[] = [];

  const flush = () => {
    const text = currentParts.filter(Boolean).join("\n\n").trim();
    if (text || currentCallouts.length > 0) {
      sections.push({
        heading: currentHeading,
        anchor: anchorId(currentHeading),
        text,
        callouts: currentCallouts,
      });
    }
    currentParts = [];
    currentCallouts = [];
  };

  for (const child of tree.children) {
    if (child.type === "yaml") continue;
    if (child.type === "heading" && (child as Heading).depth === 2) {
      flush();
      currentHeading = mdastToString(child).replace(/\s+/g, " ").trim();
      continue;
    }
    const piece = extractNodeText(child, {
      where: opts.where,
      section: currentHeading,
      metricsText: opts.metricsText ?? "",
      limitsText: opts.limitsText ?? "",
      diagrams,
      callouts: currentCallouts,
    });
    if (piece) currentParts.push(piece);
  }
  flush();
  return sections;
}

function projectSite(
  raw: typeof site | PublicSiteProjection,
): PublicSiteProjection {
  return {
    name: String(raw.name),
    fullName: String(raw.fullName),
    title: String(raw.title),
    location: String(raw.location),
    timeZone: String(raw.timeZone),
    utcOffsetLabel: String(raw.utcOffsetLabel),
    availability: String(raw.availability),
    availabilityNote: String(raw.availabilityNote),
    email: String(raw.email),
    links: {
      linkedin: String(raw.links.linkedin),
      github: String(raw.links.github),
      company: String(raw.links.company),
    },
    cvPath: String(raw.cvPath),
    positioning: String(raw.positioning),
  };
}

function projectEvidenceList(
  visibility: Visibility,
  raw: CaseStudyFrontmatter["evidence"],
): PublicEvidenceLink[] {
  if (visibility === "private") {
    return raw.map((e) => ({
      label: e.label,
      url: null,
      private: true,
    }));
  }
  return raw.map((e) => ({
    label: e.label,
    url: e.private ? null : e.url,
    private: e.private,
  }));
}

function toTermFreq(tokens: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tokens) {
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

function buildChunk(params: {
  id: string;
  kind: CorpusChunk["kind"];
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
}): CorpusChunk {
  const titleTokens = tokenize(
    [params.title, ...params.entities, ...params.tags].join(" "),
  );
  const sectionTokens = tokenize(params.section);
  const textTokens = tokenize(params.text);
  return {
    ...params,
    estimatedTokens: estimateTokens(params.text),
    fields: {
      titleTf: toTermFreq(titleTokens),
      sectionTf: toTermFreq(sectionTokens),
      textTf: toTermFreq(textTokens),
      titleLen: titleTokens.length,
      sectionLen: sectionTokens.length,
      textLen: textTokens.length,
    },
  };
}

function demoPageRoute(slug: string): string {
  return slug === "ml-systems-search"
    ? "/demos/ml-systems-search"
    : `/demos/${slug}`;
}

export function buildAssistantCorpus(
  rootDir: string,
  options: CorpusBuildOptions = {},
): AssistantCorpus {
  const contentDir = options.contentDir ?? join(rootDir, "content");
  const problems: string[] = [];

  const siteProj = projectSite(options.siteData ?? site);
  const diagrams = options.diagramsData ?? DIAGRAM_SPECS;

  const rawCaseStudies: { fm: CaseStudyFrontmatter; body: string }[] = [];
  for (const file of mdxFiles(join(contentDir, "case-studies"))) {
    const where = `case-studies/${basename(file)}`;
    const parsed = matter(readFileSync(file, "utf8"));
    const check = caseStudyFrontmatter.safeParse(parsed.data);
    if (!check.success) {
      problems.push(`${where}: invalid frontmatter`);
      continue;
    }
    if (!check.data.published) continue;
    rawCaseStudies.push({ fm: check.data, body: parsed.content });
  }
  rawCaseStudies.sort((a, b) => a.fm.order - b.fm.order);

  const rawNotes: { fm: NoteFrontmatter; body: string }[] = [];
  for (const file of mdxFiles(join(contentDir, "notes"))) {
    const where = `notes/${basename(file)}`;
    const parsed = matter(readFileSync(file, "utf8"));
    const check = noteFrontmatter.safeParse(parsed.data);
    if (!check.success) {
      problems.push(`${where}: invalid frontmatter`);
      continue;
    }
    if (check.data.draft) continue;
    rawNotes.push({ fm: check.data, body: parsed.content });
  }
  rawNotes.sort((a, b) => b.fm.published.localeCompare(a.fm.published));

  const rawProjects = options.projectsData ?? projects;
  const visibleProjects: Project[] = [];
  for (const p of rawProjects) {
    const check = projectSchema.safeParse(p);
    if (!check.success) {
      problems.push(
        `project ${String((p as { slug?: unknown }).slug)}: invalid`,
      );
      continue;
    }
    if (check.data.archived) continue;
    // Project schema allows repoUrl even on private projects; strip it strictly here.
    visibleProjects.push({
      ...check.data,
      repoUrl:
        check.data.visibility === "private" ? undefined : check.data.repoUrl,
    });
  }

  const rawExp = options.experienceData ?? experience;
  const visibleExperience: Experience[] = [];
  for (const e of rawExp) {
    const check = experienceSchema.safeParse(e);
    if (!check.success) {
      problems.push(
        `experience ${String((e as { org?: unknown }).org)}: invalid`,
      );
      continue;
    }
    if (check.data.visible) visibleExperience.push(check.data);
  }

  const visibleCerts = (options.certificationsData ?? certifications).filter(
    (c) => certificationSchema.safeParse(c).success,
  );
  const visibleRecognition = (options.recognitionData ?? recognition).filter(
    (r) => recognitionSchema.safeParse(r).success,
  );
  const visibleSkills = (options.skillsData ?? skills).filter(
    (s) => skillGroupSchema.safeParse(s).success,
  );
  const visiblePrinciples = (options.principlesData ?? principles).filter(
    (p) => principleSchema.safeParse(p).success,
  );

  // Match app/about/page.tsx computed focusArea visibility.
  const usedTags = new Set([
    ...rawCaseStudies.flatMap((c) => c.fm.tags),
    ...visibleProjects.flatMap((p) => p.tags),
  ]);
  const visibleFocusAreas = (options.focusAreasData ?? focusAreas).filter(
    (f) => focusAreaSchema.safeParse(f).success && usedTags.has(f.tag),
  );

  const visibleDemos = (options.demosData ?? demos).filter(
    (d) => demoSchema.safeParse(d).success,
  );

  // Build closed Route Registry from public published routes only.
  const routeSet = new Set<string>([
    "/",
    "/work",
    "/about",
    "/about#focus",
    "/about#method",
    "/about#experience",
    "/about#recognition",
    "/about#education",
    "/demos",
    "/notes",
    "/cv",
    "/contact",
  ]);
  for (const { fm } of rawCaseStudies) {
    routeSet.add(`/work/${fm.slug}`);
    routeSet.add(`/work/${fm.slug}#evidence`);
    for (const secName of CASE_STUDY_SECTIONS) {
      routeSet.add(`/work/${fm.slug}#${anchorId(secName)}`);
    }
    routeSet.add(`/contact?topic=${fm.slug}`);
  }
  for (const p of visibleProjects) {
    routeSet.add(`/work#${p.slug}`);
    routeSet.add(`/contact?topic=${p.slug}`);
  }
  for (const d of visibleDemos) {
    routeSet.add(demoPageRoute(d.slug));
  }
  for (const { fm } of rawNotes) {
    routeSet.add(`/notes/${fm.slug}`);
  }

  const facts: FactUnit[] = [];
  const chunks: CorpusChunk[] = [];
  const manifestChunkIds: string[] = [];

  // 1. Compile Case Studies (AST + typed FactUnits)
  for (const { fm, body } of rawCaseStudies) {
    const evLinks = projectEvidenceList(fm.visibility, fm.evidence);
    const studyRoute = `/work/${fm.slug}`;
    const studyFactIds: string[] = [];
    const metricFactIds: string[] = [];
    const limitFactIds: string[] = [];

    fm.metrics.forEach((m, idx) => {
      const id = `fact:${fm.slug}:metric:${idx + 1}`;
      metricFactIds.push(id);
      studyFactIds.push(id);
      facts.push({
        id,
        kind: "metric",
        entitySlug: fm.slug,
        label: `${fm.title} - ${m.name}`,
        value: m.value,
        datasetOrContext: m.dataset,
        caveat: m.caveat,
        visibility: fm.visibility,
        route: `${studyRoute}#evaluation`,
        evidenceLinks: evLinks,
      });
    });

    fm.limits.forEach((limit, idx) => {
      const id = `fact:${fm.slug}:limit:${idx + 1}`;
      limitFactIds.push(id);
      studyFactIds.push(id);
      facts.push({
        id,
        kind: "limit",
        entitySlug: fm.slug,
        label: `${fm.title} - Limit ${idx + 1}`,
        value: "Limit",
        datasetOrContext: "Stated system constraint or scope limit",
        caveat: limit,
        visibility: fm.visibility,
        route: `${studyRoute}#limits`,
        evidenceLinks: evLinks,
      });
    });

    const metricsSummary = fm.metrics
      .map(
        (m) =>
          `${m.name}: ${m.value}. Measured on: ${m.dataset}. Caveat: ${m.caveat}`,
      )
      .join("\n");
    const limitsSummary = fm.limits.map((l) => `- ${l}`).join("\n");

    const sections = extractMdxSections(body, {
      where: `case-studies/${fm.slug}.mdx`,
      metricsText: metricsSummary,
      limitsText: limitsSummary,
      diagrams,
    });

    // Overview chunk
    const publicRepoLine =
      fm.visibility !== "private" && fm.repoUrl
        ? `Public repository: ${fm.repoUrl}.`
        : "Repository visibility: Private work (no public source repository; walkthroughs can be requested via Contact).";
    const liveLine = fm.liveUrl ? `Live application URL: ${fm.liveUrl}.` : "";
    const demoLine = fm.demo
      ? `Interactive demo on this portfolio: ${demoPageRoute(fm.demo)}.`
      : "";
    const evidenceSummary = evLinks
      .map((e) =>
        e.url ? `- ${e.label} (${e.url})` : `- ${e.label} (Private work)`,
      )
      .join("\n");

    const overviewText = [
      `Case study: ${fm.title}`,
      `Outcome: ${fm.outcome}`,
      `Role: ${fm.role}. Period: ${fm.period.start} to ${fm.period.end}. Domain: ${fm.domain}.`,
      `Stack: ${fm.stack.join(", ")}.`,
      `Headline metric: ${fm.headlineMetric.label} = ${fm.headlineMetric.value} (${fm.headlineMetric.context}).`,
      publicRepoLine,
      liveLine,
      demoLine,
      `Evidence items:\n${evidenceSummary}`,
    ]
      .filter(Boolean)
      .join("\n");

    chunks.push(
      buildChunk({
        id: `case:${fm.slug}:overview`,
        kind: "case_study_section",
        slug: fm.slug,
        title: fm.title,
        section: "Overview and Evidence",
        route: studyRoute,
        visibility: fm.visibility,
        evidenceLinks: evLinks,
        factIds: [...metricFactIds.slice(0, 2), ...limitFactIds.slice(0, 2)],
        tags: [...fm.tags, fm.domain],
        entities: [fm.slug, fm.title, ...fm.stack],
        priority: 3,
        text: overviewText,
      }),
    );

    for (const sec of sections) {
      const secRoute = `${studyRoute}#${sec.anchor}`;
      routeSet.add(secRoute);

      const calloutFactIds: string[] = [];
      sec.callouts.forEach((callout, idx) => {
        const id = `fact:${fm.slug}:callout:${sec.anchor}:${idx + 1}`;
        calloutFactIds.push(id);
        studyFactIds.push(id);
        facts.push({
          id,
          kind: "callout",
          entitySlug: fm.slug,
          label: `${fm.title} - ${callout.title}`,
          value: "Caveat",
          datasetOrContext: `${sec.heading} callout`,
          caveat: callout.text,
          visibility: fm.visibility,
          route: secRoute,
          evidenceLinks: evLinks,
        });
      });

      const isMetricsSec =
        sec.heading === "Evaluation" || sec.heading === "Results";
      const isLimitsSec = sec.heading === "Limits";
      const isSecuritySec = sec.heading === "Security";
      const chunkKind: CorpusChunk["kind"] = isMetricsSec
        ? "case_study_metrics"
        : isLimitsSec
          ? "case_study_limits"
          : "case_study_section";

      const securityMetricIds = isSecuritySec
        ? fm.metrics
            .map((m, idx) => ({ m, id: metricFactIds[idx] }))
            .filter(({ m }) =>
              /(security|tenant|probe|audit|bandit|mypy|sanction|pep)/i.test(
                `${m.name} ${m.dataset} ${m.caveat}`,
              ),
            )
            .map(({ id }) => id)
        : [];

      const attachedFactIds = isMetricsSec
        ? [...metricFactIds, ...limitFactIds, ...calloutFactIds]
        : isLimitsSec
          ? [...limitFactIds, ...calloutFactIds]
          : isSecuritySec
            ? [...securityMetricIds, ...calloutFactIds]
            : calloutFactIds;

      chunks.push(
        buildChunk({
          id: `case:${fm.slug}:${sec.anchor}`,
          kind: chunkKind,
          slug: fm.slug,
          title: fm.title,
          section: sec.heading,
          route: secRoute,
          visibility: fm.visibility,
          evidenceLinks: evLinks,
          factIds: attachedFactIds,
          tags: [...fm.tags, fm.domain],
          entities: [fm.slug, fm.title, ...fm.stack],
          priority: isMetricsSec || isLimitsSec ? 4 : 3,
          text: `${fm.title} (${sec.heading}):\n${sec.text}`,
        }),
      );
    }
  }

  // 2. Compile Notes (AST)
  for (const { fm, body } of rawNotes) {
    const noteRoute = `/notes/${fm.slug}`;
    const sections = extractMdxSections(body, {
      where: `notes/${fm.slug}.mdx`,
      diagrams,
    });
    const noteBody = sections
      .map((s) =>
        s.heading === "Overview" ? s.text : `## ${s.heading}\n${s.text}`,
      )
      .join("\n\n");
    const relatedFacts = fm.caseStudy
      ? facts.filter((f) => f.entitySlug === fm.caseStudy).map((f) => f.id)
      : [];

    chunks.push(
      buildChunk({
        id: `note:${fm.slug}`,
        kind: "note",
        slug: fm.slug,
        title: fm.title,
        section: "Technical note",
        route: noteRoute,
        visibility: "public",
        evidenceLinks: [
          { label: `Technical note: ${fm.title}`, url: null, private: false },
        ],
        factIds: relatedFacts.slice(0, 4),
        tags: [...fm.tags, "note"],
        entities: [fm.slug, fm.title, ...(fm.caseStudy ? [fm.caseStudy] : [])],
        priority: 3,
        text: `Technical note: ${fm.title}\nPublished: ${fm.published}\nSummary: ${fm.summary}\n\n${noteBody}`,
      }),
    );
  }

  // 3. Compile Secondary Projects
  for (const p of visibleProjects) {
    const projectRoute = `/work#${p.slug}`;
    const evLinks: PublicEvidenceLink[] =
      p.visibility === "private"
        ? [
            {
              label: "Private work (request a walkthrough)",
              url: null,
              private: true,
            },
          ]
        : [
            ...(p.repoUrl
              ? [
                  {
                    label: `${p.title} repository`,
                    url: p.repoUrl,
                    private: false,
                  },
                ]
              : []),
            ...(p.liveUrl
              ? [
                  {
                    label: `${p.title} live app`,
                    url: p.liveUrl,
                    private: false,
                  },
                ]
              : []),
          ];
    const lines = [
      `Project: ${p.title} (${p.year})`,
      `Summary: ${p.summary}`,
      `Tags: ${p.tags.map((t) => TAG_LABELS[t]).join(", ")}.`,
      p.visibility === "private"
        ? "Visibility: Private work. Code is private; walkthroughs can be requested on Contact."
        : p.repoUrl
          ? `Repository: ${p.repoUrl}`
          : "",
      p.liveUrl
        ? `Live URL: ${p.liveUrl}${p.sleeps ? " (may take about 30 s to wake)" : ""}`
        : "",
    ].filter(Boolean);

    chunks.push(
      buildChunk({
        id: `project:${p.slug}`,
        kind: "project",
        slug: p.slug,
        title: p.title,
        section: "Project index",
        route: projectRoute,
        visibility: p.visibility,
        evidenceLinks: evLinks,
        factIds: [],
        tags: [...p.tags, "project"],
        entities: [p.slug, p.title],
        priority: 2,
        text: lines.join("\n"),
      }),
    );
  }

  // 4. Compile Demos
  for (const d of visibleDemos) {
    const dRoute = demoPageRoute(d.slug);
    const factId = `fact:demo:${d.slug}`;
    const statusNote =
      d.slug === "ml-systems-search"
        ? "Interactive BM25 SQLite FTS5 search page is available at /demos/ml-systems-search (linked to the ML Systems MCP server project card)."
        : `Status: ${d.status}.`;
    facts.push({
      id: factId,
      kind: "demo_spec",
      entitySlug: d.caseStudy,
      label: `${d.title} - Model card`,
      value: d.slug === "fraud" ? "Live demo" : "Interactive search",
      datasetOrContext: `${d.modelCard.data}. Method: ${d.modelCard.split}.`,
      caveat: d.modelCard.limits.join(" "),
      visibility: "public",
      route: dRoute,
      evidenceLinks: [],
    });

    chunks.push(
      buildChunk({
        id: `demo:${d.slug}`,
        kind: "demo",
        slug: d.slug,
        title: d.title,
        section: "Demo and model card",
        route: dRoute,
        visibility: "public",
        evidenceLinks: [],
        factIds: [factId],
        tags: ["demo"],
        entities: [d.slug, d.title, d.caseStudy],
        priority: 3,
        text: [
          `Demo: ${d.title}`,
          `Summary: ${d.summary}`,
          statusNote,
          `Data: ${d.modelCard.data}`,
          `Split / method: ${d.modelCard.split}`,
          d.modelCard.metrics.length
            ? `Metrics: ${d.modelCard.metrics.join("; ")}`
            : "",
          `Limits: ${d.modelCard.limits.join(" ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    );
  }

  // 5. About Narrative, Focus Areas & Principles
  const aboutPath = join(contentDir, "about.mdx");
  const aboutBody = matter(readFileSync(aboutPath, "utf8")).content;
  const aboutSections = extractMdxSections(aboutBody, {
    where: "about.mdx",
    diagrams,
  });
  chunks.push(
    buildChunk({
      id: "about:narrative",
      kind: "about",
      slug: "about",
      title: "About Collins Nyagaka",
      section: "Background and engineering focus",
      route: "/about",
      visibility: "public",
      evidenceLinks: [],
      factIds: [],
      tags: ["about", "background"],
      entities: ["collins", "nyagaka", "jkuat", "kra", "flyrank"],
      priority: 3,
      text: aboutSections.map((s) => s.text).join("\n\n"),
    }),
  );

  chunks.push(
    buildChunk({
      id: "about:principles-focus",
      kind: "about",
      slug: "about",
      title: "How Collins works and focus areas",
      section: "Principles and focus areas",
      route: "/about#method",
      visibility: "public",
      evidenceLinks: [],
      factIds: [],
      tags: ["method", "principles", ...visibleFocusAreas.map((f) => f.tag)],
      entities: [
        "method",
        "principles",
        ...visibleFocusAreas.map((f) => f.title),
      ],
      priority: 3,
      text: [
        "Working principles:",
        ...visiblePrinciples.map(
          (p, idx) => `${idx + 1}. ${p.title}: ${p.body}`,
        ),
        "",
        "Focus areas:",
        ...visibleFocusAreas.map((f) => `- ${f.title}: ${f.body}`),
      ].join("\n"),
    }),
  );

  // 6. Citeable Manifest Chunks (complete, non-lossy facts with provenance)
  const addManifest = (
    id: string,
    title: string,
    section: string,
    route: string,
    text: string,
    tags: string[],
    entities: string[],
    factIds: string[] = [],
  ) => {
    manifestChunkIds.push(id);
    chunks.push(
      buildChunk({
        id,
        kind: "manifest",
        slug: "manifest",
        title,
        section,
        route,
        visibility: "public",
        evidenceLinks: [],
        factIds,
        tags,
        entities,
        priority: 2,
        text,
      }),
    );
  };

  addManifest(
    "manifest:identity",
    "Identity, Availability and Contact",
    "Portfolio identity",
    "/contact",
    [
      `Name: ${siteProj.name} (full name: ${siteProj.fullName}).`,
      `Headline role: ${siteProj.title}.`,
      `Location and time zone: ${siteProj.location} (${siteProj.timeZone}, ${siteProj.utcOffsetLabel}).`,
      `Availability: ${siteProj.availability} - ${siteProj.availabilityNote}.`,
      `Positioning: ${siteProj.positioning}`,
      `Email: ${siteProj.email} (or use /contact; replies within 2 working days EAT).`,
      `Phone: Not published on the portfolio.`,
      `CV: HTML version at /cv and PDF download at ${siteProj.cvPath}.`,
      `Links: GitHub ${siteProj.links.github}, LinkedIn ${siteProj.links.linkedin}.`,
      `Freelance or business projects: routed through TundoTech Systems (${siteProj.links.company}).`,
    ].join("\n"),
    ["contact", "availability", "identity", "cv"],
    [
      "collins",
      "nyagaka",
      "nairobi",
      "kenya",
      "email",
      "cv",
      "tundotech",
      "availability",
    ],
  );

  addManifest(
    "manifest:skills",
    "Technical Skills (CV)",
    "Technical skills",
    "/cv",
    visibleSkills.map((g) => `${g.group}: ${g.items.join(", ")}.`).join("\n"),
    ["skills", "cv", "stack"],
    visibleSkills.flatMap((g) => [g.group, ...g.items]),
  );

  const expFactIds: string[] = [];
  visibleExperience.forEach((e, idx) => {
    const id = `fact:experience:${idx + 1}`;
    expFactIds.push(id);
    facts.push({
      id,
      kind: "role",
      entitySlug: "experience",
      label: `${e.role} at ${e.org}`,
      value: `${e.start} to ${e.end}`,
      datasetOrContext: `${e.type}, ${e.location}${e.remote ? " (remote)" : ""}`,
      caveat: e.bullets.join(" "),
      visibility: "public",
      route: "/about#experience",
      evidenceLinks: [],
    });
  });

  addManifest(
    "manifest:experience",
    "Experience Timeline",
    "Experience",
    "/about#experience",
    visibleExperience
      .map(
        (e) =>
          `${e.role} at ${e.org} (${e.start} to ${e.end}, ${e.type}, ${e.location}): ${e.bullets.join(" ")}`,
      )
      .join("\n"),
    ["experience", "roles", "career"],
    visibleExperience.flatMap((e) => [e.org, e.role]),
    expFactIds,
  );

  addManifest(
    "manifest:education",
    "Education and Certifications",
    "Education and certifications",
    "/about#education",
    visibleCerts
      .map((c) => `${c.kind}: ${c.name}, ${c.issuer} (${c.issued})`)
      .join("\n"),
    ["education", "certifications", "degree"],
    visibleCerts.flatMap((c) => [c.name, c.issuer]),
  );

  const recFactIds: string[] = [];
  visibleRecognition.forEach((r, idx) => {
    const id = `fact:recognition:${idx + 1}`;
    recFactIds.push(id);
    facts.push({
      id,
      kind: "recognition",
      entitySlug: r.caseStudy ?? "recognition",
      label: r.title,
      value: r.awarded,
      datasetOrContext: `Issuer: ${r.issuer}`,
      caveat: r.summary,
      visibility: "public",
      route: "/about#recognition",
      evidenceLinks: [{ label: r.title, url: r.url, private: false }],
    });
  });

  addManifest(
    "manifest:recognition",
    "Outside Recognition",
    "Recognition",
    "/about#recognition",
    visibleRecognition
      .map(
        (r) =>
          `${r.title} (${r.issuer}, ${r.awarded}): ${r.summary} Proof: ${r.url}`,
      )
      .join("\n"),
    ["recognition", "xerj", "awards"],
    visibleRecognition.flatMap((r) => [r.title, r.issuer]),
    recFactIds,
  );

  addManifest(
    "manifest:work-index",
    "Case Studies, Projects, Demos and Notes Index",
    "Portfolio index",
    "/work",
    [
      "Published case studies:",
      ...rawCaseStudies.map(
        ({ fm }) =>
          `- ${fm.title} (/work/${fm.slug}, visibility: ${fm.visibility}, headline: ${fm.headlineMetric.label} ${fm.headlineMetric.value})`,
      ),
      "Secondary projects:",
      ...visibleProjects.map(
        (p) =>
          `- ${p.title} (/work#${p.slug}, ${p.year}, visibility: ${p.visibility})`,
      ),
      "Interactive demos:",
      "- Fraud-score explorer (/demos/fraud)",
      "- ML Systems reference search (/demos/ml-systems-search)",
      "Technical notes:",
      ...rawNotes.map(({ fm }) => `- ${fm.title} (/notes/${fm.slug})`),
    ].join("\n"),
    ["index", "work", "projects", "demos", "notes"],
    [
      ...rawCaseStudies.map((c) => c.fm.slug),
      ...visibleProjects.map((p) => p.slug),
      ...rawNotes.map((n) => n.fm.slug),
    ],
  );

  // Validation checks across all built artifacts
  const seenChunkIds = new Set<string>();
  for (const c of chunks) {
    if (seenChunkIds.has(c.id)) problems.push(`duplicate chunk id: ${c.id}`);
    seenChunkIds.add(c.id);
    if (!routeSet.has(c.route)) {
      problems.push(`chunk ${c.id} has unverified route: ${c.route}`);
    }
  }
  const seenFactIds = new Set<string>();
  for (const f of facts) {
    if (seenFactIds.has(f.id)) problems.push(`duplicate fact id: ${f.id}`);
    seenFactIds.add(f.id);
    if (!routeSet.has(f.route)) {
      problems.push(`fact ${f.id} has unverified route: ${f.route}`);
    }
  }

  // Compute BM25F IDF & average field lengths
  const totalDocs = chunks.length;
  const df = new Map<string, number>();
  let sumTitle = 0;
  let sumSection = 0;
  let sumText = 0;

  for (const c of chunks) {
    sumTitle += c.fields.titleLen;
    sumSection += c.fields.sectionLen;
    sumText += c.fields.textLen;
    const uniqueDocTerms = new Set([
      ...Object.keys(c.fields.titleTf),
      ...Object.keys(c.fields.sectionTf),
      ...Object.keys(c.fields.textTf),
    ]);
    for (const term of uniqueDocTerms) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const idf: Record<string, number> = {};
  for (const [term, count] of [...df.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    idf[term] = Number(
      Math.log(1 + (totalDocs - count + 0.5) / (count + 0.5)).toFixed(6),
    );
  }

  const entitySlugs = [
    ...rawCaseStudies.map((c) => c.fm.slug),
    ...visibleProjects.map((p) => p.slug),
    ...rawNotes.map((n) => n.fm.slug),
    ...visibleDemos.map((d) => d.slug),
  ];

  const baseCorpus: Omit<AssistantCorpus, "contentHash"> = {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    siteUrl: SITE_URL,
    entitySlugs,
    routeRegistry: [...routeSet].sort(),
    manifestChunkIds,
    facts,
    chunks,
    bm25f: {
      idf,
      avgFieldLen: {
        title: totalDocs ? Number((sumTitle / totalDocs).toFixed(4)) : 1,
        section: totalDocs ? Number((sumSection / totalDocs).toFixed(4)) : 1,
        text: totalDocs ? Number((sumText / totalDocs).toFixed(4)) : 1,
      },
      totalDocs,
    },
  };

  const canonical = JSON.stringify(baseCorpus);
  if (PHONE_PATTERN.test(canonical)) {
    problems.push("corpus output contains a phone number pattern");
  }
  if (canonical.includes("\u2014")) {
    problems.push("corpus output contains an em dash");
  }
  const byteSize = Buffer.byteLength(canonical, "utf8");
  if (byteSize > MAX_CORPUS_BYTES) {
    problems.push(
      `corpus size ${byteSize} bytes exceeds limit ${MAX_CORPUS_BYTES}`,
    );
  }

  if (problems.length > 0) throw new CorpusError(problems);

  const contentHash = createHash("sha256").update(canonical).digest("hex");
  return {
    ...baseCorpus,
    contentHash,
  };
}

if (import.meta.main) {
  const root = join(import.meta.dirname, "..");
  try {
    const corpus = buildAssistantCorpus(root);
    const json = JSON.stringify(corpus) + "\n";
    if (!process.argv.includes("--check")) {
      const outDir = join(root, "content", ".generated");
      mkdirSync(outDir, { recursive: true });
      const tmpPath = join(outDir, "assistant-corpus.json.tmp");
      const targetPath = join(outDir, "assistant-corpus.json");
      writeFileSync(tmpPath, json, "utf8");
      renameSync(tmpPath, targetPath);
    }
    console.log(
      `assistant corpus ok: ${corpus.chunks.length} chunks, ${corpus.facts.length} facts, ${Buffer.byteLength(json, "utf8")} bytes (hash ${corpus.contentHash.slice(0, 12)})`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
