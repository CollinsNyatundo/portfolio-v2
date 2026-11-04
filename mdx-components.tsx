import type { MDXComponents } from "mdx/types";

/**
 * Required by @next/mdx in the App Router. Case-study components (metric
 * table, evidence pill, callouts, diagram) are added here in M3.2.
 */
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
