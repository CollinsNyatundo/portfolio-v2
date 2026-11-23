/**
 * Deterministic enabled-mode E2E harness (M7.5). Starts a local loopback stub
 * server acting as both Upstash Redis REST and OpenRouter Chat Completions,
 * then executes `playwright.assistant.config.ts` against `next start -p 3101`
 * with ASSISTANT_MODE=live and ASSISTANT_ALLOW_LOOPBACK_TEST_PROVIDER=1.
 */
import { spawn } from "node:child_process";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createRequire } from "node:module";
import {
  isAdmissionEval,
  isReleaseEval,
  runAdmissionEval,
  runReleaseEval,
} from "./lib/upstash-admission.ts";

const require = createRequire(import.meta.url);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(Buffer.byteLength(payload)),
  });
  res.end(payload);
}

async function main() {
  // Redis double: the admission/release EVALs run through the JS mirror of
  // the Lua scripts in lib/rate-limit.ts.
  const data = new Map<string, string>();
  const mini = {
    get: (k: string) => data.get(k) ?? null,
    incrBy: (k: string, by: number) => {
      const n = Number(data.get(k) ?? 0) + by;
      data.set(k, String(n));
      return n;
    },
    expire: () => {},
    del: (k: string) => void data.delete(k),
  };

  const server = createServer(async (req, res) => {
    const raw = await readBody(req);
    const url = req.url ?? "";

    if (url.startsWith("/redis/multi-exec")) {
      const cmds = JSON.parse(raw) as string[][];
      const replies = cmds.map((c) => {
        if (isAdmissionEval(c)) return { result: runAdmissionEval(mini, c) };
        if (isReleaseEval(c)) return { result: runReleaseEval(mini, c) };
        const [cmd, key] = c;
        if (cmd === "SET" && key.startsWith("salt:")) return { result: "OK" };
        if (cmd === "GET" && key.startsWith("salt:")) {
          return { result: "e2e-salt" };
        }
        if (cmd === "GET") return { result: data.get(key) ?? null };
        if (cmd === "INCR") return { result: 1 };
        if (cmd === "SET") return { result: "OK" };
        return { result: 1 };
      });
      sendJson(res, 200, replies);
      return;
    }

    if (url === "/v1/chat/completions") {
      const parsed = JSON.parse(raw) as {
        messages?: { role: string; content: string }[];
      };
      const userPrompt = parsed.messages?.[1]?.content ?? "";
      const qMatch = userPrompt.match(
        /<visitor_question>\s*([\s\S]*?)\s*<\/visitor_question>/,
      );
      const visitorQuestion = qMatch?.[1] ?? userPrompt;

      if (visitorQuestion.includes("MALFORMED_TEST")) {
        sendJson(res, 200, {
          model: "google/gemini-2.5-flash",
          usage: { prompt_tokens: 900, completion_tokens: 20 },
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  inPortfolio: true,
                  blocks: [
                    {
                      text: "Injected <script>alert(1)</script> text.",
                      chunkIds: ["case:creditcard-fraud:evaluation"],
                    },
                  ],
                  factIds: [],
                  followUps: [],
                }),
              },
            },
          ],
        });
        return;
      }

      if (visitorQuestion.includes("LegalAI")) {
        sendJson(res, 200, {
          model: "google/gemini-2.5-flash",
          usage: { prompt_tokens: 1600, completion_tokens: 75 },
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  inPortfolio: true,
                  blocks: [
                    {
                      text: "LegalAI Kenya enforces a 0.45 open-search evidence floor so weak matches are declined rather than guessed, refusing 9 of 10 off-topic queries.",
                      chunkIds: [
                        "case:legalai-kenya:approach",
                        "case:legalai-kenya:results",
                      ],
                    },
                  ],
                  factIds: ["fact:legalai-kenya:metric:3"],
                  followUps: ["What are its main limits?"],
                }),
              },
            },
          ],
        });
        return;
      }

      sendJson(res, 200, {
        model: "google/gemini-2.5-flash",
        usage: { prompt_tokens: 1500, completion_tokens: 70 },
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                inPortfolio: true,
                blocks: [
                  {
                    text: "The credit-card fraud model reached 0.80 F1 and 0.75 recall on the 42,722-transaction time-ordered holdout, missing the 0.85 targets.",
                    chunkIds: ["case:creditcard-fraud:evaluation"],
                  },
                ],
                factIds: ["fact:creditcard-fraud:metric:1"],
                followUps: ["Why no lightgbm at runtime?"],
              }),
            },
          },
        ],
      });
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Failed to bind loopback stub server");
  }
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const pwCli = require.resolve("@playwright/test/cli");
  const child = spawn(
    process.execPath,
    [pwCli, "test", "--config", "playwright.assistant.config.ts"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        ASSISTANT_MODE: "live",
        ASSISTANT_ALLOW_LOOPBACK_TEST_PROVIDER: "1",
        ASSISTANT_LLM_BASE_URL: `${baseUrl}/v1/chat/completions`,
        ASSISTANT_LLM_MODEL: "google/gemini-2.5-flash",
        ASSISTANT_LLM_API_KEY: "ci-stub-openrouter-key",
        ASSISTANT_DAILY_BUDGET_MICRO_USD: "100000",
        ASSISTANT_MAX_ATTEMPT_MICRO_USD: "5000",
        UPSTASH_REDIS_REST_URL: `${baseUrl}/redis`,
        UPSTASH_REDIS_REST_TOKEN: "ci-stub-redis-token",
      },
    },
  );

  const code = await new Promise<number>((resolve) => {
    child.on("close", (c) => resolve(c ?? 1));
  });
  server.close();
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
