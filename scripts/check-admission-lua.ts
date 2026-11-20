/**
 * Runs the assistant admission and release Lua scripts (lib/rate-limit.ts)
 * against a real Redis and compares every reply and resulting key state with
 * the JavaScript mirror the unit tests use (tests/support/upstash-admission.ts).
 * Run it whenever either script changes:
 *
 *   docker run -d --rm --name admit-redis -p 6390:6379 redis:7-alpine
 *   node scripts/check-admission-lua.ts            (REDIS_PORT=6390 by default)
 *   docker stop admit-redis
 *
 * It only talks to 127.0.0.1 and flushes that database, so never point it at
 * a shared Redis.
 */
import { connect, type Socket } from "node:net";
import {
  ASSISTANT_ADMIT_SCRIPT,
  ASSISTANT_RELEASE_SCRIPT,
} from "../lib/rate-limit.ts";
import {
  type MiniRedis,
  runAdmissionEval,
  runReleaseEval,
} from "../tests/support/upstash-admission.ts";

type Reply = string | number | null | Reply[];

/** Minimal RESP2 client: one command at a time. */
class Resp {
  private buf = Buffer.alloc(0);
  private waiting: ((r: Reply) => void)[] = [];
  private sock: Socket;
  constructor(port: number) {
    this.sock = connect(port, "127.0.0.1");
    this.sock.on("data", (d) => {
      this.buf = Buffer.concat([this.buf, d]);
      for (;;) {
        const parsed = this.parse(0);
        if (!parsed) break;
        this.buf = this.buf.subarray(parsed.end);
        this.waiting.shift()?.(parsed.value);
      }
    });
  }
  private parse(at: number): { value: Reply; end: number } | null {
    const nl = this.buf.indexOf("\r\n", at);
    if (nl < 0) return null;
    const type = String.fromCharCode(this.buf[at]);
    const line = this.buf.toString("utf8", at + 1, nl);
    const next = nl + 2;
    if (type === "+") return { value: line, end: next };
    if (type === "-") throw new Error(`Redis error: ${line}`);
    if (type === ":") return { value: Number(line), end: next };
    if (type === "$") {
      const len = Number(line);
      if (len < 0) return { value: null, end: next };
      if (this.buf.length < next + len + 2) return null;
      return {
        value: this.buf.toString("utf8", next, next + len),
        end: next + len + 2,
      };
    }
    if (type === "*") {
      const n = Number(line);
      if (n < 0) return { value: null, end: next };
      const items: Reply[] = [];
      let pos = next;
      for (let i = 0; i < n; i++) {
        const item = this.parse(pos);
        if (!item) return null;
        items.push(item.value);
        pos = item.end;
      }
      return { value: items, end: pos };
    }
    throw new Error(`unknown RESP type ${type}`);
  }
  send(...args: string[]): Promise<Reply> {
    const parts = args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`);
    this.sock.write(`*${args.length}\r\n${parts.join("")}`);
    return new Promise((resolve) => this.waiting.push(resolve));
  }
  close() {
    this.sock.end();
  }
}

const KILL = "kill:assistant:generation";
const CONC = "conc:assistant:check";
const BUDGET = "budget:assistant:check:2026-11-20";

function mirror(): MiniRedis & {
  data: Map<string, string>;
  ttl: Map<string, number>;
} {
  const data = new Map<string, string>();
  const ttl = new Map<string, number>();
  return {
    data,
    ttl,
    get: (k) => data.get(k) ?? null,
    incrBy: (k, by) => {
      const n = Number(data.get(k) ?? 0) + by;
      data.set(k, String(n));
      return n;
    },
    expire: (k, s, nx) => {
      if (!data.has(k) || (nx && ttl.has(k))) return;
      ttl.set(k, s);
    },
    del: (k) => {
      data.delete(k);
      ttl.delete(k);
    },
  };
}

async function main() {
  const redis = new Resp(Number(process.env.REDIS_PORT ?? 6390));
  const model = mirror();
  await redis.send("FLUSHDB");
  let failures = 0;

  const admit = (max: number, attempt: number, cap: number) => [
    "EVAL",
    ASSISTANT_ADMIT_SCRIPT,
    "3",
    KILL,
    CONC,
    BUDGET,
    String(max),
    String(attempt),
    String(cap),
    "30",
    "172800",
  ];
  const release = () => ["EVAL", ASSISTANT_RELEASE_SCRIPT, "1", CONC];

  async function compare(label: string, cmd: string[]) {
    const real = await redis.send(...cmd);
    const expected =
      cmd[1] === ASSISTANT_ADMIT_SCRIPT
        ? runAdmissionEval(model, cmd)
        : runReleaseEval(model, cmd);
    const realState = {
      conc: await redis.send("GET", CONC),
      budget: await redis.send("GET", BUDGET),
      concTtl: await redis.send("TTL", CONC),
      budgetHasTtl: Number(await redis.send("TTL", BUDGET)) > 0,
    };
    const modelState = {
      conc: model.data.get(CONC) ?? null,
      budget: model.data.get(BUDGET) ?? null,
      concTtl: model.data.has(CONC) ? (model.ttl.get(CONC) ?? -1) : -2,
      budgetHasTtl: model.ttl.has(BUDGET),
    };
    const same =
      JSON.stringify(real) === JSON.stringify(expected) &&
      JSON.stringify(realState) === JSON.stringify(modelState);
    if (!same) failures++;
    console.log(
      `${same ? "ok  " : "FAIL"} ${label}: redis=${JSON.stringify(real)} ${JSON.stringify(realState)} mirror=${JSON.stringify(expected)} ${JSON.stringify(modelState)}`,
    );
  }

  await compare("admit 1", admit(2, 5000, 10000));
  await compare("admit 2", admit(2, 1, 10000));
  await compare("cap reached, nothing written", admit(2, 1, 10000));
  await compare("release", release());
  await compare("budget reached, nothing written", admit(2, 5000, 10000));
  await compare("release to zero deletes counter", release());
  await compare("release below zero deletes counter", release());
  await redis.send("SET", KILL, "1");
  model.data.set(KILL, "1");
  await compare("kill switch", admit(2, 1, 10000));
  await redis.send("DEL", KILL);
  model.del(KILL);
  await redis.send("SET", CONC, "-3");
  model.data.set(CONC, "-3");
  await compare("negative counter is reset then admitted", admit(2, 1, 10000));

  await redis.send("FLUSHDB");
  redis.close();
  if (failures) {
    console.error(`${failures} mismatch(es) between the Lua and the mirror`);
    process.exit(1);
  }
  console.log("admission Lua matches the mirror");
}

await main();
