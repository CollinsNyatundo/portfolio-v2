import { describe, expect, it } from "vitest";
import { site } from "@/content/site";
import { contactMailto, contactTopic } from "@/lib/contact";

const studies = [{ slug: "legalai-kenya", title: "LegalAI Kenya" }];
const projects = [
  { slug: "deep-research-agent", title: "Deep Research Agent" },
];

describe("contactTopic", () => {
  it("resolves a known case study or project slug to its title", () => {
    expect(contactTopic("legalai-kenya", studies, projects)).toEqual({
      slug: "legalai-kenya",
      title: "LegalAI Kenya",
    });
    expect(contactTopic("deep-research-agent", studies, projects)?.title).toBe(
      "Deep Research Agent",
    );
  });

  it("falls back to general for unknown, repeated or missing topics", () => {
    expect(contactTopic("<script>", studies, projects)).toBeNull();
    expect(contactTopic(["legalai-kenya"], studies, projects)).toBeNull();
    expect(contactTopic(undefined, studies, projects)).toBeNull();
  });
});

describe("contactMailto", () => {
  it("uses the default subject without a topic", () => {
    expect(contactMailto(null)).toBe(
      `mailto:${site.email}?subject=${encodeURIComponent(`Opportunity for ${site.name}`)}`,
    );
  });

  it("puts only the known title in the subject, encoded", () => {
    const href = contactMailto({
      slug: "legalai-kenya",
      title: "LegalAI Kenya",
    });
    expect(href).toContain(
      encodeURIComponent("Walkthrough request: LegalAI Kenya"),
    );
    expect(href.startsWith(`mailto:${site.email}?subject=`)).toBe(true);
  });
});
