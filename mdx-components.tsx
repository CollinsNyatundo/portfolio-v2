import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Callout, Figure } from "@/components/case-study/parts";
import {
  ComplianceGuardPipeline,
  FraudPipeline,
  LegalAiPipeline,
} from "@/components/diagrams/fraud-pipeline";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

/** Stable anchor ids so every section can be deep-linked (docs/03 §6). */
export function anchorId(children: ReactNode): string {
  return textOf(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function H2({ children }: ComponentPropsWithoutRef<"h2">) {
  const id = anchorId(children);
  return (
    <h2
      id={id}
      className="font-display group mt-14 scroll-mt-24 text-2xl leading-tight lg:text-3xl"
    >
      {children}
      <a
        href={`#${id}`}
        className="text-muted ml-3 font-sans text-base font-normal no-underline opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        #<span className="sr-only">Link to this section</span>
      </a>
    </h2>
  );
}

function A({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
  const external = /^https?:\/\//.test(href);
  return external ? (
    <a href={href} rel="noopener noreferrer" target="_blank" {...rest}>
      {children}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  ) : (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

const components: MDXComponents = {
  h2: H2,
  h3: (props) => (
    <h3 className="font-display mt-8 text-xl leading-snug" {...props} />
  ),
  p: (props) => <p className="mt-5 max-w-[65ch]" {...props} />,
  ul: (props) => (
    <ul className="mt-5 max-w-[65ch] list-disc space-y-2 pl-6" {...props} />
  ),
  ol: (props) => (
    <ol className="mt-5 max-w-[65ch] list-decimal space-y-2 pl-6" {...props} />
  ),
  a: A,
  // Code blocks scroll inside themselves (focusable for keyboard users)
  // instead of widening the page.
  pre: (props) => (
    <pre
      tabIndex={0}
      className="bg-surface-2 relative my-6 max-w-[65ch] overflow-x-auto rounded-[2px] p-4 font-mono text-sm"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="bg-surface-2 rounded-[2px] px-1 text-[0.9em] [overflow-wrap:anywhere]"
      {...props}
    />
  ),
  Callout,
  Figure,
  FraudPipeline,
  LegalAiPipeline,
  ComplianceGuardPipeline,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
