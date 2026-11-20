export type BoundedJsonBodyResult =
  { ok: true; data: unknown } | { ok: false; status: 400 | 413 };

/**
 * Read a JSON request body with a byte cap and a wall-clock deadline
 * (docs/07 items 74-75). Lives outside the route file because Next.js route
 * modules may export only route handlers and route config.
 *
 * The deadline cancels the reader itself: aborting a controller alone would
 * leave a pending `reader.read()` waiting on a client that stopped sending.
 * Cancelling settles that read with `done: true`, so the aborted flag is
 * re-checked after every read; otherwise a stalled body that already held
 * valid JSON would be parsed and accepted after the deadline.
 */
export async function readBoundedJsonBody(
  req: Request,
  maxBytes: number,
  timeoutMs: number,
): Promise<BoundedJsonBodyResult> {
  if (!req.body) return { ok: false, status: 400 };
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, timeoutMs);
  let total = 0;
  let text = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (timedOut) return { ok: false, status: 400 };
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return { ok: false, status: 400 };
  } finally {
    clearTimeout(timer);
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400 };
  }
}
