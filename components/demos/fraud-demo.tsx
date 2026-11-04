"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { recordVisitorRun } from "@/components/home/evidence-ledger";

type Raw = Record<string, number>;
type Sample = {
  id: string;
  label: "fraud" | "legit";
  window: { Time: number; Amount: number }[];
  target: Raw;
};
type Contribution = {
  feature: string;
  logOdds: number;
  direction: "fraud" | "legit";
};
type Result = {
  probability: number;
  calibratedProbability: number;
  threshold: number;
  decision: "flag" | "allow";
  topContributions: Contribution[];
  modelVersion: string;
  latencyMs: { model: number; total: number };
};
type Attribution = {
  dataset: string;
  licence: string;
  url: string;
  note: string;
};

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "scoring" }
  | { kind: "scored"; result: Result; roundTrip: number; sampleId: string }
  | { kind: "limited"; until: number }
  | {
      kind: "unavailable";
      recorded: { sampleId: string; result: Result } | null;
    };

const SAMPLES = "/api/demos/fraud/samples";
const SCORE = "/api/demos/fraud/score";
const RECORDED = "/demos/fraud/recorded-example.json";
const TIMEOUT_MS = 8000;
const FIELDS = [
  "Amount",
  "Time",
  ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`),
];
const RANGE: Record<string, [number, number]> = {
  Amount: [0, 30000],
  Time: [0, 172800],
  ...Object.fromEntries(
    Array.from({ length: 28 }, (_, i) => [
      `V${i + 1}`,
      [-100, 100] as [number, number],
    ]),
  ),
};

const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
// Clocks for event handlers only (never called while rendering).
const clock = () => performance.now();
const wallClock = () => Date.now();

function clientErrors(values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const k of FIELDS) {
    const v = Number(values[k]);
    const [lo, hi] = RANGE[k];
    if (values[k]?.trim() === "" || !Number.isFinite(v))
      errors[`features.${k}`] = "must be a number";
    else if (v < lo) errors[`features.${k}`] = `must be ≥ ${lo}`;
    else if (v > hi) errors[`features.${k}`] = `must be ≤ ${hi}`;
  }
  return errors;
}

function Outcome({
  result,
  roundTrip,
}: {
  result: Result;
  roundTrip?: number;
}) {
  const max = Math.max(
    ...result.topContributions.map((c) => Math.abs(c.logOdds)),
    1e-9,
  );
  const flag = result.decision === "flag";
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <p className="font-sans text-sm">Calibrated probability of fraud</p>
        <p className="figure mt-1 text-4xl">
          {pct(result.calibratedProbability)}
        </p>
        <div
          className="bg-surface-2 mt-3 h-2 w-full rounded-full"
          role="img"
          aria-label={`${pct(result.calibratedProbability)} against a threshold of ${pct(result.threshold)}`}
        >
          <div
            className="bg-text h-2 rounded-full"
            style={{
              width: `${Math.max(1, result.calibratedProbability * 100)}%`,
            }}
          />
        </div>
        <p className="mt-4">
          <span
            className={`inline-block rounded-full border px-3 py-1 font-sans text-sm font-semibold ${
              flag ? "border-text" : "border-border"
            }`}
          >
            {flag ? "Flag" : "Allow"}
          </span>{" "}
          <span className="text-muted font-sans text-sm">
            at the tuned threshold of {pct(result.threshold)}
          </span>
        </p>
        <p className="text-muted mt-4 font-sans text-sm">
          Model {result.latencyMs.model} ms (in-process inference)
          {roundTrip !== undefined &&
            ` · round trip ${Math.round(roundTrip)} ms`}
        </p>
      </div>
      <div>
        <p className="font-sans text-sm">
          Five strongest reasons, in log-odds (margin) units
        </p>
        <ol className="mt-3 space-y-3">
          {result.topContributions.map((c) => (
            <li key={c.feature} className="font-sans text-sm">
              <div className="flex justify-between gap-4">
                <span className="font-semibold">{c.feature}</span>
                <span className="figure">
                  {c.logOdds > 0 ? "+" : ""}
                  {c.logOdds.toFixed(2)} towards {c.direction}
                </span>
              </div>
              <div
                className="bg-surface-2 mt-1 h-1.5 rounded-full"
                aria-hidden="true"
              >
                <div
                  className={`h-1.5 rounded-full ${c.direction === "fraud" ? "bg-text" : "bg-muted"}`}
                  style={{ width: `${(Math.abs(c.logOdds) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * Fraud-score explorer (docs/03 §5): pick a real test-split transaction (its
 * 10-transaction history is read-only), optionally edit it, score it, and
 * see the decision and its five strongest reasons. `?sample=` holds the
 * choice so the back button and shared links restore it.
 */
export function FraudDemo({
  writesLedger = false,
}: {
  writesLedger?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [samples, setSamples] = useState<Sample[] | null>(null);
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<{
    id: string;
    values: Record<string, string>;
    errors: Record<string, string>;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const controller = useRef<AbortController | null>(null);

  const sampleId = params.get("sample");
  const sample = useMemo(
    () => samples?.find((s) => s.id === sampleId) ?? samples?.[0] ?? null,
    [samples, sampleId],
  );

  useEffect(() => {
    const ac = new AbortController();
    fetch(SAMPLES, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body) => {
        if (!Array.isArray(body.samples) || body.samples.length === 0)
          throw new Error("schema");
        setSamples(body.samples);
        setAttribution(body.attribution);
        setStatus({ kind: "ready" });
      })
      .catch(async () => {
        if (ac.signal.aborted) return;
        const recorded = await fetch(RECORDED)
          .then((r) => r.json())
          .catch(() => null);
        setStatus({ kind: "unavailable", recorded });
      });
    return () => {
      ac.abort();
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (status.kind !== "limited") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status.kind]);

  function choose(id: string) {
    const q = new URLSearchParams(params.toString());
    q.set("sample", id);
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  }

  function reset() {
    if (!sample) return;
    setEdit(null);
    setStatus({ kind: "ready" });
  }

  async function scoreIt() {
    if (!sample || status.kind === "scoring") return;
    const found = clientErrors(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);
    setStatus({ kind: "scoring" });
    const started = clock();
    try {
      const res = await fetch(SCORE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleId: sample.id,
          features: Object.fromEntries(
            FIELDS.map((k) => [k, Number(values[k])]),
          ),
        }),
        signal: ac.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 400) {
        setErrors(body.fields ?? {});
        setStatus({ kind: "ready" });
        return;
      }
      if (res.status === 429) {
        setStatus({
          kind: "limited",
          until: wallClock() + (body.retryAfterSeconds ?? 60) * 1000,
        });
        setNow(wallClock());
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const roundTrip = clock() - started;
      setStatus({
        kind: "scored",
        result: body,
        roundTrip,
        sampleId: sample.id,
      });
      if (writesLedger)
        recordVisitorRun({
          value: pct(body.calibratedProbability),
          label: `fraud probability, ${body.decision}`,
        });
    } catch {
      // Leaving the page aborts silently (docs/03 §5).
      if (ac.signal.aborted && ac.signal.reason !== "timeout") return;
      const recorded = await fetch(RECORDED)
        .then((r) => r.json())
        .catch(() => null);
      setStatus({ kind: "unavailable", recorded });
    } finally {
      clearTimeout(timer);
    }
  }

  const base: Record<string, string> = sample
    ? Object.fromEntries(FIELDS.map((k) => [k, String(sample.target[k])]))
    : {};
  const mine = edit && sample && edit.id === sample.id ? edit : null;
  const values = mine?.values ?? base;
  const errors = mine?.errors ?? {};
  const setValues = (next: Record<string, string>) =>
    sample && setEdit({ id: sample.id, values: next, errors });
  const setErrors = (next: Record<string, string>) =>
    sample && setEdit({ id: sample.id, values, errors: next });
  const scored =
    status.kind === "scored" && sample && status.sampleId === sample.id
      ? status
      : null;

  const limited = status.kind === "limited" && status.until > now;
  const scoring = status.kind === "scoring";
  const err = (k: string) => errors[`features.${k}`];

  return (
    <div className="font-sans">
      {status.kind === "loading" && (
        <ul aria-label="Loading samples" className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="bg-surface-2 h-10 rounded-sm" />
          ))}
        </ul>
      )}

      {samples && sample && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            scoreIt();
          }}
        >
          <label className="block text-sm">
            Transaction
            <select
              value={sample.id}
              onChange={(e) => choose(e.target.value)}
              disabled={scoring}
              className="border-border bg-surface text-text mt-2 block min-h-11 w-full max-w-md rounded-sm border px-3 text-base"
            >
              {samples.map((s, i) => (
                <option key={s.id} value={s.id}>
                  Sample {i + 1} (labelled {s.label})
                </option>
              ))}
            </select>
          </label>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm">
              The 10 transactions before it (read-only)
            </summary>
            <div
              className="relative mt-2 overflow-x-auto"
              role="region"
              aria-label="Transaction history"
              tabIndex={0}
            >
              <table className="w-full min-w-[18rem] text-sm">
                <thead>
                  <tr className="text-muted text-left">
                    <th scope="col" className="py-1 pr-4 font-medium">
                      Time (s)
                    </th>
                    <th scope="col" className="py-1 font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sample.window.map((w, i) => (
                    <tr key={i} className="border-border border-t">
                      <td className="figure py-1 pr-4">{w.Time}</td>
                      <td className="figure py-1">{w.Amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editing}
              onChange={(e) => setEditing(e.target.checked)}
              className="h-4 w-4"
            />
            Edit values
          </label>

          {editing && (
            <fieldset className="border-border mt-2 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-3 lg:grid-cols-5">
              <legend className="sr-only">Target transaction values</legend>
              {FIELDS.map((k) => (
                <label key={k} className="block text-xs">
                  {k}
                  <input
                    inputMode="decimal"
                    value={values[k] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [k]: e.target.value })
                    }
                    disabled={scoring}
                    aria-invalid={Boolean(err(k))}
                    aria-describedby={err(k) ? `err-${k}` : undefined}
                    className="border-border bg-surface text-text mt-1 block min-h-11 w-full rounded-sm border px-2 text-sm"
                  />
                  {err(k) && (
                    <span id={`err-${k}`} className="mt-1 block font-semibold">
                      {k} {err(k)}
                    </span>
                  )}
                </label>
              ))}
            </fieldset>
          )}
          {!editing && Object.keys(errors).length > 0 && (
            <p className="mt-2 text-sm font-semibold">
              Some values are out of range; open Edit values to fix them.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={scoring || limited}
              className="border-text min-h-11 rounded-full border px-6 text-sm font-semibold disabled:opacity-50"
            >
              {scoring ? "Scoring…" : "Score"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={scoring}
              className="border-border min-h-11 rounded-full border px-5 text-sm disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </form>
      )}

      <div
        role="status"
        aria-live="polite"
        aria-busy={scoring}
        className="mt-6"
      >
        {status.kind === "limited" && (
          <p>
            Demo limit reached, try again in{" "}
            {Math.max(1, Math.ceil((status.until - now) / 60000))} min.
          </p>
        )}
        {status.kind === "unavailable" && (
          <p>
            Demo is waking up or unavailable.
            {status.recorded && " Here is a recorded example result."}
          </p>
        )}
        {scored && (
          <p className="sr-only">
            {scored.result.decision === "flag" ? "Flagged" : "Allowed"},
            calibrated probability {pct(scored.result.calibratedProbability)}.
          </p>
        )}
      </div>
      {scored && (
        <Outcome result={scored.result} roundTrip={scored.roundTrip} />
      )}
      {status.kind === "unavailable" && status.recorded && (
        <Outcome result={status.recorded.result} />
      )}

      {attribution && (
        <p className="text-muted mt-10 max-w-[62ch] text-xs">
          Data:{" "}
          <a href={attribution.url} rel="noopener noreferrer" target="_blank">
            {attribution.dataset}
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          , {attribution.licence}. {attribution.note}
        </p>
      )}
    </div>
  );
}
