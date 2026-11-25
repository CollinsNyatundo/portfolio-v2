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

describe("aws/aws-emulator note scope and packing", () => {
  it.each([
    [
      "What did the aws/aws-emulator tests find?",
      "/notes/testing-aws-emulator-v1-0-604",
    ],
    ["What did the AWS emulator tests find?", "/notes"],
    ["What did the aws/aws-emulator tests find?", undefined],
  ])(
    "treats first-turn AWS emulator question as in scope: %s (%s)",
    (question, pageContext) => {
      const decision = classifyScope({ question, pageContext });
      expect(decision.kind).toBe("in_scope");
      const packed = retrieveAndPack({ question, pageContext });
      expect(
        packed.allowedChunkIds.has("note:testing-aws-emulator-v1-0-604"),
      ).toBe(true);
      expect(packed.estimatedTokens).toBeLessThanOrEqual(4200);
    },
  );

  it("keeps generic AWS and standalone s3vectors pricing or coding questions out of scope", () => {
    for (const question of [
      "How much does AWS S3 Standard storage cost per gigabyte?",
      "How much does s3vectors cost per gigabyte?",
      "How much does an S3 Vectors vector bucket cost?",
      "Write a Python script to create an S3 Vectors index and query it by cosine distance",
      "Write a Python script to benchmark S3 Vectors cosine queries",
    ]) {
      const decision = classifyScope({ question });
      expect(decision.kind, question).toBe("deterministic_refusal");
    }
  });

  it.each([
    [
      "Did the s3vectors benchmark return the expected tenant metadata?",
      "/notes/testing-aws-emulator-v1-0-604",
    ],
    [
      "Did the s3vectors benchmark return the expected tenant metadata?",
      undefined,
    ],
    [
      "What was the measured S3 Vectors latency?",
      "/notes/testing-aws-emulator-v1-0-604",
    ],
    ["What was the measured S3 Vectors latency?", undefined],
    [
      "Translate the Python S3 Vectors test results into plain English",
      undefined,
    ],
  ])(
    "answers s3vectors benchmark questions without admitting standalone pricing or codegen: %s (%s)",
    (question, pageContext) => {
      const decision = classifyScope({ question, pageContext });
      expect(decision.kind).toBe("in_scope");
      const packed = retrieveAndPack({ question, pageContext });
      expect(
        packed.allowedChunkIds.has("note:testing-aws-emulator-v1-0-604"),
      ).toBe(true);
      expect(packed.estimatedTokens).toBeLessThanOrEqual(4200);
    },
  );

  it("stays within the 4200-token packing target for named-note Terraform queries", () => {
    const packed = retrieveAndPack({
      question: "What Terraform issues did Collins hit with aws/aws-emulator?",
    });
    expect(
      packed.allowedChunkIds.has("note:testing-aws-emulator-v1-0-604"),
    ).toBe(true);
    expect(packed.estimatedTokens).toBeLessThanOrEqual(4200);
  });

  it.each([
    "What other technologies does Collins know besides the AWS emulator?",
    "What databases has Collins used besides the AWS emulator?",
    "What frameworks has Collins worked with besides the AWS emulator?",
  ])(
    "retains manifest:skills for explicit skills questions: %s",
    (question) => {
      const packed = retrieveAndPack({ question });
      expect(packed.allowedChunkIds.has("manifest:skills")).toBe(true);
      expect(packed.estimatedTokens).toBeLessThanOrEqual(4200);
    },
  );

  it("retains both requested Results sections when comparing two case studies", () => {
    const packed = retrieveAndPack({
      question: "Compare the results of LegalAI Kenya and creditcard-fraud",
    });
    expect(packed.allowedChunkIds.has("case:legalai-kenya:results")).toBe(true);
    expect(packed.allowedChunkIds.has("case:creditcard-fraud:results")).toBe(
      true,
    );
    expect(packed.estimatedTokens).toBeLessThanOrEqual(4200);
  });
});
