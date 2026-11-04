import { describe, expect, it } from "vitest";
import { mailtoHref, site } from "@/content/site";

const visibleStrings = [
  site.name,
  site.title,
  site.location,
  site.availabilityNote,
  site.positioning,
  site.primaryActionLabel,
];

describe("site identity", () => {
  it("uses no em dashes in visible copy (docs/04 §1)", () => {
    for (const text of visibleStrings) expect(text).not.toContain("—");
  });

  it("keeps the positioning to one short sentence", () => {
    expect(site.positioning.length).toBeLessThanOrEqual(160);
  });

  it("never publishes a phone number", () => {
    expect(site.showPhone).toBe(false);
    expect(JSON.stringify(site)).not.toMatch(/\+?254\s?\d/);
  });

  it("links the CV as a PDF under /cv/", () => {
    expect(site.cvPath).toMatch(/^\/cv\/.+\.pdf$/);
  });

  it("pre-fills a subject on the email link", () => {
    expect(mailtoHref).toMatch(/^mailto:[^?]+\?subject=/);
  });
});
