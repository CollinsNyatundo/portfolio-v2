import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AGENTS.md hard rule 12: the scroll-craft engine is vendored unmodified.
const dir = join(process.cwd(), "public", "vendor", "scrollcraft");

const recorded = readFileSync(join(dir, "SHA256SUMS"), "utf8")
  .trim()
  .split("\n")
  .map((line) => {
    const [hash, name] = line.trim().split(/\s+\*?/);
    return { hash, name };
  });

describe("vendored scroll-craft engine", () => {
  it("records both engine files", () => {
    expect(recorded.map((r) => r.name).sort()).toEqual([
      "scrollcraft.css",
      "scrollcraft.js",
    ]);
  });

  it.each(recorded)("$name matches its recorded hash", ({ hash, name }) => {
    const actual = createHash("sha256")
      .update(readFileSync(join(dir, name)))
      .digest("hex");
    expect(actual).toBe(hash);
  });
});
