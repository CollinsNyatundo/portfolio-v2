/**
 * Content models (docs/05-CONTENT-SCHEMA.md §2), validated at build time by
 * scripts/build-content.ts. Relative imports only: this file also runs under
 * plain Node (type stripping), which doesn't know the "@/" alias.
 */
import { z } from "zod";
import { TAGS } from "./tags.ts";

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use YYYY-MM");
const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use kebab-case (a-z, 0-9, hyphens)");
const tag = z.enum(TAGS);
const https = z.url({ protocol: /^https$/ });

export const visibility = z.enum(["public", "private", "partial"]);

const metric = z.strictObject({
  name: z.string().min(1),
  value: z.string().min(1),
  dataset: z.string().min(1, "every number needs its dataset or split (D-05)"),
  caveat: z.string().min(1, "every number needs a stated caveat (D-05)"),
  /** Show this figure in the evidence ledger (D-26). */
  ledger: z.boolean().optional(),
  ledgerLabel: z.string().min(1).max(32).optional(),
});

const evidence = z
  .strictObject({
    label: z.string().min(1),
    url: https.nullable(),
    private: z.boolean(),
  })
  .refine((e) => e.url !== null || e.private, {
    message: "evidence without a URL must be marked private",
  });

export const caseStudyFrontmatter = z
  .strictObject({
    slug,
    title: z.string().min(1).max(60),
    outcome: z.string().min(1).max(140),
    role: z.string().min(1),
    period: z.strictObject({
      start: yearMonth,
      end: z.union([yearMonth, z.literal("present")]),
    }),
    domain: z.enum(["fintech", "legaltech", "agritech", "ai-infra", "ml"]),
    tags: z.array(tag).min(1).max(6),
    stack: z.array(z.string().min(1)).min(1).max(12),
    visibility,
    repoUrl: https.optional(),
    liveUrl: https.optional(),
    sleeps: z.boolean().optional(),
    demo: slug.optional(),
    video: z
      .strictObject({
        src: z.string(),
        captions: z.string(),
        poster: z.string(),
      })
      .optional(),
    headlineMetric: z.strictObject({
      label: z.string().min(1),
      value: z.string().min(1),
      context: z.string().min(1),
    }),
    metrics: z.array(metric).min(1),
    evidence: z.array(evidence).min(2),
    limits: z.array(z.string().min(1)).min(1),
    featured: z.boolean().default(false),
    order: z.number().int().nonnegative(),
    published: z.boolean(),
    updated: z.iso.date(),
  })
  .refine((c) => c.visibility !== "private" || c.repoUrl === undefined, {
    message: "private case studies must not link a repo (D-19)",
    path: ["repoUrl"],
  })
  .refine((c) => c.visibility === "private" || c.repoUrl !== undefined, {
    message: "public and partial case studies need a repoUrl",
    path: ["repoUrl"],
  });

export const noteFrontmatter = z.strictObject({
  slug,
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(160),
  published: z.iso.date(),
  updated: z.iso.date().optional(),
  tags: z.array(tag).min(1).max(6),
  caseStudy: slug.optional(),
  draft: z.boolean(),
});

export const project = z.strictObject({
  slug,
  title: z.string().min(1).max(60),
  summary: z.string().min(1).max(140),
  tags: z.array(tag).min(1).max(6),
  visibility,
  repoUrl: https.optional(),
  liveUrl: https.optional(),
  sleeps: z.boolean().optional(),
  year: z.number().int().min(2019).max(2100),
  archived: z.boolean().optional(),
});

export const demo = z.strictObject({
  slug,
  title: z.string().min(1).max(60),
  summary: z.string().min(1).max(160),
  endpoint: z.string().startsWith("/api/demos/"),
  status: z.enum(["live", "degraded", "offline"]),
  caseStudy: slug,
  modelCard: z.strictObject({
    data: z.string().min(1),
    split: z.string().min(1),
    metrics: z.array(z.string().min(1)),
    limits: z.array(z.string().min(1)).min(1),
  }),
  recordedExample: z.string().startsWith("/"),
});

export const experience = z.strictObject({
  org: z.string().min(1),
  role: z.string().min(1),
  type: z.enum(["full-time", "internship", "contract", "freelance"]),
  start: yearMonth,
  end: z.union([yearMonth, z.literal("present")]),
  location: z.string().min(1),
  remote: z.boolean(),
  bullets: z.array(z.string().min(1)).min(1).max(4),
  visible: z.boolean(),
});

/** A focus area on /about (docs/01 F-11); shown only once work carries its tag. */
export const focusArea = z.strictObject({
  tag,
  title: z.string().min(1).max(40),
  body: z.string().min(1).max(160),
});

/** One "How I work" rule, shared by the home page and /about. */
export const principle = z.strictObject({
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(140),
});

/** One group of technical skills on /cv, mirroring the CV PDF. */
export const skillGroup = z.strictObject({
  group: z.string().min(1).max(40),
  items: z.array(z.string().min(1).max(80)).min(1).max(20),
});

export const certification = z.strictObject({
  name: z.string().min(1),
  issuer: z.string().min(1),
  /** YYYY-MM, or YYYY when the month isn't on record (never guessed). */
  issued: z.union([yearMonth, z.string().regex(/^\d{4}$/, "use YYYY")]),
  credentialUrl: https.optional(),
  kind: z.enum(["degree", "certificate"]),
});

export type CaseStudyFrontmatter = z.infer<typeof caseStudyFrontmatter>;
export type NoteFrontmatter = z.infer<typeof noteFrontmatter>;
export type Project = z.infer<typeof project>;
export type Demo = z.infer<typeof demo>;
export type Experience = z.infer<typeof experience>;
export type FocusArea = z.infer<typeof focusArea>;
export type SkillGroup = z.infer<typeof skillGroup>;
export type Principle = z.infer<typeof principle>;
export type Certification = z.infer<typeof certification>;

/** Body sections every case study must have, in this order (docs/05 §2). */
export const CASE_STUDY_SECTIONS = [
  "Problem",
  "Constraints",
  "Approach",
  "Evaluation",
  "Results",
  "Security",
  "Limits",
  "What I'd do next",
] as const;
