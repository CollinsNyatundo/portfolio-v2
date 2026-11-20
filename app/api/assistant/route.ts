import { readBoundedJsonBody } from "@/lib/assistant/body";
import {
  assistantRuntimeMode,
  deploymentNamespace,
} from "@/lib/assistant/config";
import {
  assistantFieldErrors,
  assistantRequestSchema,
} from "@/lib/assistant/schema";
import { handleAssistantTurn } from "@/lib/assistant/service";
import { assistantIpRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 25;

const MAX_BODY_BYTES = 8 * 1024;
const BODY_READ_TIMEOUT_MS = 3000;

function jsonResponse(
  status: number,
  body: unknown,
  headers: HeadersInit = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function clientIp(req: Request): string {
  // Vercel overwrites x-forwarded-for with the connecting IP (07 §3, S4).
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function hasExactJsonMediaType(header: string | null): boolean {
  if (!header) return false;
  const mediaType = header.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

/**
 * POST /api/assistant (D-33, docs/05 §5, docs/07 §5 items 74-75).
 * Order: disabled kill switch -> same-origin/Fetch-Metadata -> media type ->
 * Content-Length -> IP rate limits -> streaming byte-bounded JSON -> schema ->
 * service (scope gate, retrieval, fail-closed budget, pinned OpenRouter, verify).
 */
export async function POST(req: Request) {
  const mode = assistantRuntimeMode(process.env);
  if (mode === "disabled") {
    return jsonResponse(503, { error: "disabled" });
  }

  // Same-origin CSRF check (07 item 15). No CORS allow headers are emitted.
  const origin = req.headers.get("origin");
  const expectedOrigin = new URL(req.url).origin;
  const fetchSite = req.headers.get("sec-fetch-site");
  if (
    !origin ||
    origin !== expectedOrigin ||
    (fetchSite && fetchSite !== "same-origin")
  ) {
    return jsonResponse(403, { error: "forbidden" });
  }

  if (!hasExactJsonMediaType(req.headers.get("content-type"))) {
    return jsonResponse(415, { error: "unsupported_media_type" });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: "too_large" });
  }

  const ip = clientIp(req);
  const wait = await assistantIpRateLimited(ip, deploymentNamespace());
  if (wait > 0) {
    return jsonResponse(
      429,
      { error: "rate_limited", retryAfterSeconds: wait },
      { "Retry-After": String(wait) },
    );
  }

  const bodyResult = await readBoundedJsonBody(
    req,
    MAX_BODY_BYTES,
    BODY_READ_TIMEOUT_MS,
  );
  if (!bodyResult.ok) {
    if (bodyResult.status === 413) {
      return jsonResponse(413, { error: "too_large" });
    }
    return jsonResponse(400, {
      error: "validation",
      fields: { request: "is not valid JSON" },
    });
  }

  const parsed = assistantRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonResponse(400, {
      error: "validation",
      fields: assistantFieldErrors(parsed.error),
    });
  }

  try {
    const result = await handleAssistantTurn(parsed.data, {
      signal: req.signal,
    });
    // Privacy-safe structured telemetry (07 item 50): never logs questions,
    // answers, IPs, or headers.
    console.info(JSON.stringify(result.telemetry));
    return jsonResponse(200, result.response);
  } catch {
    return jsonResponse(500, { error: "internal" });
  }
}
