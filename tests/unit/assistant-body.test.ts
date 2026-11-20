import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readBoundedJsonBody } from "@/lib/assistant/body";

// Codex review P2 on PR #36: a client that starts a body and then stalls
// must get a 400 at the deadline, not hold the function open.
const TIMEOUT_MS = 3000;
const MAX_BYTES = 8 * 1024;
const encoder = new TextEncoder();

function streamRequest(stream: ReadableStream<Uint8Array>) {
  return new Request("https://collinsnyagaka.com/api/assistant", {
    method: "POST",
    body: stream,
    // Required by undici for streaming request bodies.
    duplex: "half",
  } as RequestInit);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("readBoundedJsonBody", () => {
  it("parses a complete body", async () => {
    const result = await readBoundedJsonBody(
      new Request("https://x.test", {
        method: "POST",
        body: '{"question":"x"}',
      }),
      MAX_BYTES,
      TIMEOUT_MS,
    );
    expect(result).toEqual({ ok: true, data: { question: "x" } });
  });

  it("returns 400 when valid JSON arrives and the stream then stalls", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"question":"x"}'));
        // Never closes.
      },
      cancel() {
        cancelled = true;
      },
    });

    const pending = readBoundedJsonBody(
      streamRequest(stream),
      MAX_BYTES,
      TIMEOUT_MS,
    );
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await expect(pending).resolves.toEqual({ ok: false, status: 400 });
    expect(cancelled).toBe(true);
  });

  it("returns 400 when the stream closes only after the deadline", async () => {
    let close: (() => void) | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"question":"x"}'));
        close = () => {
          try {
            controller.close();
          } catch {
            // Already cancelled by the timeout.
          }
        };
      },
    });

    const pending = readBoundedJsonBody(
      streamRequest(stream),
      MAX_BYTES,
      TIMEOUT_MS,
    );
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS + 1);
    close?.();
    await expect(pending).resolves.toEqual({ ok: false, status: 400 });
  });

  it("returns 413 when the body exceeds the byte limit", async () => {
    const result = await readBoundedJsonBody(
      new Request("https://x.test", {
        method: "POST",
        body: `{"question":"${"a".repeat(MAX_BYTES)}"}`,
      }),
      MAX_BYTES,
      TIMEOUT_MS,
    );
    expect(result).toEqual({ ok: false, status: 413 });
  });

  it("returns 400 for malformed JSON and for a missing body", async () => {
    expect(
      await readBoundedJsonBody(
        new Request("https://x.test", { method: "POST", body: "{" }),
        MAX_BYTES,
        TIMEOUT_MS,
      ),
    ).toEqual({ ok: false, status: 400 });
    expect(
      await readBoundedJsonBody(
        new Request("https://x.test", { method: "POST" }),
        MAX_BYTES,
        TIMEOUT_MS,
      ),
    ).toEqual({ ok: false, status: 400 });
  });
});
