import type { FocusArea, Principle } from "./schema.ts";

/**
 * How I work: shared by the home page (chapter II) and /about, so the two
 * never disagree. Every rule points at something a case study shows.
 */
export const principles: Principle[] = [
  {
    title: "Evaluate on data the model hasn't seen",
    body: "Time-ordered splits, held-out questions, and intervals instead of single numbers.",
  },
  {
    title: "Enforce isolation in the database, not the UI",
    body: "Row-level security, tested by attacking it from another tenant.",
  },
  {
    title: "Say what isn't done",
    body: "Every case study ends with its limits, including the targets it missed.",
  },
  {
    title: "Ship with tests and security checks",
    body: "CI runs the evaluation, the secret scan and the accessibility checks on every change.",
  },
];

/**
 * Focus areas (docs/01 F-11). An area appears on /about only once published
 * work carries its tag, so the page never claims a domain it can't show.
 */
export const focusAreas: FocusArea[] = [
  {
    tag: "fintech",
    title: "Fintech",
    body: "Fraud scoring and anti-money-laundering monitoring, built for mobile-money patterns and Kenyan reporting rules.",
  },
  {
    tag: "legaltech",
    title: "Legaltech",
    body: "Legal research that retrieves Kenyan Acts and judgments, checks its citations and refuses weak answers.",
  },
  {
    tag: "agritech",
    title: "Agritech",
    body: "Mapping cropland from satellite imagery.",
  },
];
