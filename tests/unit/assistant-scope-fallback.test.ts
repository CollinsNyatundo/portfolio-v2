import { describe, expect, it } from "vitest";
import {
  buildRetrievalFallbackResponse,
  classifyScope,
  retrieveAndPack,
} from "@/lib/assistant/retriever";

// Devin review on PR #36.

describe("phone-number boundary", () => {
  it.each([
    "What is Collins's phone number?",
    "Can I call him?",
    "Do you have a mobile number?",
    "whatsapp?",
  ])("still refuses a personal-contact request: %s", (question) => {
    expect(classifyScope({ question })).toMatchObject({
      kind: "deterministic_boundary",
      reason: "boundary_policy",
    });
  });

  it.each([
    "How does ComplianceGuard protect phone numbers?",
    "How does ComplianceGuard handle mobile-money traffic?",
    "Does Collins have experience with mobile money?",
    "How does the AML project treat M-Pesa phone data?",
  ])("answers a project question that mentions phones: %s", (question) => {
    expect(classifyScope({ question }).kind).toBe("in_scope");
  });
});

describe("retrieval fallback excerpts", () => {
  const fallbackFor = (question: string) =>
    buildRetrievalFallbackResponse({
      packed: retrieveAndPack({ question }),
      reason: "configured_retrieval",
      question,
    });

  it("includes the contact details when asked for an email address", () => {
    const res = fallbackFor("What is Collins's email address?");
    expect(res.excerpts.map((e) => e.snippet).join("\n")).toContain(
      "collins@collinsnyagaka.com",
    );
  });

  it("includes the education manifest when asked about a degree", () => {
    const res = fallbackFor("What degree does Collins have?");
    expect(res.evidence.map((e) => e.chunkId)).toContain("manifest:education");
  });

  it("keeps project sections first for a project question", () => {
    const res = fallbackFor("What hit@10 did LegalAI Kenya get?");
    expect(res.evidence[0].chunkId.startsWith("case:legalai-kenya:")).toBe(
      true,
    );
  });
});
