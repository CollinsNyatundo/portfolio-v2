import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Published photos must not leak camera or location metadata (docs/07 §7).
const dir = join(process.cwd(), "public", "images");
const photos = readdirSync(dir).filter((name) => /\.(jpe?g)$/i.test(name));

describe("published photos", () => {
  it("includes the headshot", () => {
    expect(photos).toContain("collins.jpg");
  });

  it.each(photos)("%s carries no EXIF block", (name) => {
    const bytes = readFileSync(join(dir, name));
    expect(bytes.includes(Buffer.from("Exif\0\0", "latin1"))).toBe(false);
  });

  it.each(photos)("%s stays under 300 KB", (name) => {
    expect(statSync(join(dir, name)).size).toBeLessThan(300 * 1024);
  });
});
