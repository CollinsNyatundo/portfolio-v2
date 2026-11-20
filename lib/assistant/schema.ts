import { z } from "zod";

export const historyTurnSchema = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(800),
});

export const assistantRequestSchema = z.strictObject({
  question: z
    .string()
    .trim()
    .min(2, "must be at least 2 characters")
    .max(500, "must be at most 500 characters"),
  pageContext: z
    .string()
    .regex(/^\/[a-z0-9/_-]{0,80}$/, "must be an internal route path")
    .optional(),
  activeEntitySlug: z
    .string()
    .regex(/^[a-z0-9-]{1,60}$/, "must be a valid slug")
    .nullable()
    .optional(),
  history: z.array(historyTurnSchema).max(4).optional(),
});

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type HistoryTurn = z.infer<typeof historyTurnSchema>;

export const providerBlockSchema = z.strictObject({
  heading: z.string().trim().max(80).optional(),
  text: z.string().trim().min(1).max(700),
  chunkIds: z.array(z.string().min(1).max(120)).min(1).max(6),
});

export const providerOutputSchema = z.strictObject({
  inPortfolio: z.boolean(),
  blocks: z.array(providerBlockSchema).min(1).max(6),
  factIds: z.array(z.string().min(1).max(120)).max(6),
  followUps: z.array(z.string().trim().min(4).max(120)).max(3),
});

export type ProviderOutput = z.infer<typeof providerOutputSchema>;

export const OPENROUTER_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    inPortfolio: { type: "boolean" },
    blocks: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          heading: {
            type: "string",
            description:
              "Optional section title or subheader in plain text (short, title-case, no markdown asterisks or colons)",
          },
          text: { type: "string" },
          chunkIds: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: { type: "string" },
          },
        },
        required: ["text", "chunkIds"],
        additionalProperties: false,
      },
    },
    factIds: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
    followUps: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
  },
  required: ["inPortfolio", "blocks", "factIds", "followUps"],
  additionalProperties: false,
} as const;

export function assistantFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys" && issue.keys.length > 0) {
      for (const k of issue.keys) {
        if (!out[k]) out[k] = "is not allowed";
      }
      continue;
    }
    const key = String(issue.path[0] ?? "request");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
