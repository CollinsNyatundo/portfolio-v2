import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Copy rules (docs/04 §1, task 5.5): no em dashes in visible copy and none
 * of the banned buzzwords, across every content file and page.
 */
const BANNED = [
  /\bpassionate\b/i,
  /\bninja\b/i,
  /\brockstar\b/i,
  /\bcutting[- ]edge\b/i,
  /\bleverag(e|es|ed|ing)\b/i,
  /\bproduction[- ]grade\b/i, // AGENTS.md rule 1: only if real users run it
];

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === ".generated" ? [] : files(path, ext);
    return ext.test(name) ? [path] : [];
  });
}

const sources = [
  ...files("content", /\.(mdx|ts)$/),
  ...files("app", /\.tsx$/),
  ...files("components", /\.tsx$/),
];

describe("copy rules", () => {
  it("checks a real set of files", () => {
    expect(sources.length).toBeGreaterThan(30);
  });

  it("uses no em dashes", () => {
    const hits = sources.filter((f) => readFileSync(f, "utf8").includes("—"));
    expect(hits).toEqual([]);
  });

  it("uses none of the banned words", () => {
    const hits: string[] = [];
    for (const f of sources) {
      const text = readFileSync(f, "utf8");
      for (const re of BANNED) if (re.test(text)) hits.push(`${f}: ${re}`);
    }
    expect(hits).toEqual([]);
  });
});
