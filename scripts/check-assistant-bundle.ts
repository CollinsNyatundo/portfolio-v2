/**
 * Post-build client bundle audit (docs/07 items 06, 65; docs/02 §8; D-33).
 *
 * Scans ALL compiled `.next/static` JS chunks (including lazy-loaded chunks
 * such as the assistant drawer) to prove:
 * 1. Zero secret key patterns or synthetic CI secret sentinels enter client JS.
 * 2. Zero server-only assistant prompt/corpus/provider modules enter client JS.
 * 3. Launcher and drawer sit in separate split chunks (lazy drawer <= click).
 * 4. Launcher JS delta stays <= 3 KB gzipped (or <= 90 KB total initial budget).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const SECRET_PATTERNS: RegExp[] = [
  /sk-or-v1-[A-Za-z0-9_-]{12,}/,
  /sk-or-[A-Za-z0-9_-]{12,}/,
  /gsk_[A-Za-z0-9]{16,}/,
  /AIza[0-9A-Za-z_-]{25,}/,
  /sk-proj-[A-Za-z0-9_-]{16,}/,
  /re_[A-Za-z0-9]{20,}/,
  /TURNSTILE_SECRET_KEY/,
  /UPSTASH_REDIS_REST_TOKEN/,
  /KV_REST_API_TOKEN/,
  /ASSISTANT_LLM_API_KEY/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

const SERVER_ONLY_MARKERS = [
  "openrouter.ai/api/v1/chat/completions",
  "You are the portfolio assistant for Collins Nyagaka",
  "portfolio_evidence",
  "schemaVersion",
  "bm25f",
];

function collectJsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectJsFiles(full));
    } else if (name.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const root = process.cwd();
  const staticDir = join(root, ".next", "static");
  const files = collectJsFiles(staticDir);
  if (files.length === 0) {
    console.error("check:bundle failed: no JS chunks found under .next/static");
    process.exit(1);
  }

  const problems: string[] = [];
  const sentinel = process.env.CI_SECRET_SENTINEL?.trim();
  const launcherChunks: { file: string; gzipBytes: number }[] = [];
  const drawerChunks: { file: string; gzipBytes: number }[] = [];

  for (const file of files) {
    const rel = relative(root, file).replaceAll("\\", "/");
    const raw = readFileSync(file);
    const content = raw.toString("utf8");

    for (const re of SECRET_PATTERNS) {
      if (re.test(content)) {
        problems.push(`${rel}: matched secret pattern ${re.source}`);
      }
    }
    if (sentinel && content.includes(sentinel)) {
      problems.push(`${rel}: leaked CI_SECRET_SENTINEL`);
    }
    for (const marker of SERVER_ONLY_MARKERS) {
      if (content.includes(marker)) {
        problems.push(`${rel}: leaked server-only marker "${marker}"`);
      }
    }

    const gzipBytes = gzipSync(raw).byteLength;
    if (content.includes("Ask about Collins's portfolio")) {
      launcherChunks.push({ file: rel, gzipBytes });
    }
    if (content.includes("Ask the portfolio")) {
      drawerChunks.push({ file: rel, gzipBytes });
    }
  }

  if (launcherChunks.length === 0) {
    problems.push("could not locate compiled assistant launcher chunk");
  }
  if (drawerChunks.length === 0) {
    problems.push("could not locate compiled lazy assistant drawer chunk");
  }

  for (const l of launcherChunks) {
    if (drawerChunks.some((d) => d.file === l.file)) {
      problems.push(
        `launcher and drawer share chunk ${l.file}; lazy split is broken`,
      );
    }
  }

  const LAUNCHER_MAX_GZIP_BYTES = 3072;
  const launcherTotalGz = launcherChunks.reduce(
    (sum, c) => sum + c.gzipBytes,
    0,
  );
  const drawerTotalGz = drawerChunks.reduce((sum, c) => sum + c.gzipBytes, 0);

  if (launcherTotalGz > LAUNCHER_MAX_GZIP_BYTES) {
    problems.push(
      `launcher chunk ${launcherTotalGz}B gz exceeds ${LAUNCHER_MAX_GZIP_BYTES}B gz budget`,
    );
  }

  if (problems.length > 0) {
    console.error(`check:bundle failed:\n  - ${problems.join("\n  - ")}`);
    process.exit(1);
  }

  console.log(
    `check:bundle ok: scanned ${files.length} JS chunks (0 secret/server leaks); launcher=${launcherTotalGz}B gz (${launcherChunks.length} chunk), lazy-drawer=${drawerTotalGz}B gz (${drawerChunks.length} chunk)`,
  );
}

main();
