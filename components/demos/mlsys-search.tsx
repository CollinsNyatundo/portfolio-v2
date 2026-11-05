"use client";

import { useEffect, useRef, useState } from "react";

type Result = {
  chapter: string;
  section: string;
  snippet: string;
  url: string;
  score: number;
};

type Recorded = { query: string; results: Result[]; recordedOn: string };

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; query: string; results: Result[] }
  | { kind: "invalid"; message: string }
  | { kind: "limited"; until: number }
  | { kind: "unavailable"; recorded: Recorded | null };

const ENDPOINT = "/api/demos/mlsys/search";
const RECORDED = "/demos/ml-systems-search/recorded-example.json";
const DEBOUNCE_MS = 300;
const TIMEOUT_MS = 8000;
const SUGGESTIONS = ["quantization", "data drift"];

/** Snippet text with FTS match markers (\x02 … \x03) rendered as <mark>. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/\x02|\x03/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-transparent font-semibold text-inherit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function ResultList({ results }: { results: Result[] }) {
  return (
    <ol className="border-border mt-6 border-t">
      {results.map((r) => (
        <li
          key={`${r.url}#${r.section}`}
          className="border-border border-b py-5"
        >
          <p className="text-muted font-sans text-sm">{r.chapter}</p>
          <h3 className="mt-1 font-serif text-xl font-medium">
            <a href={r.url} rel="noopener noreferrer" target="_blank">
              {r.section}
              <span className="sr-only">
                {" "}
                (opens the chapter source in a new tab)
              </span>
            </a>
          </h3>
          <p className="mt-2 max-w-[62ch]">
            <Snippet text={r.snippet} />
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * ML Systems reference search (docs/03 §5): debounced at 300 ms, minimum
 * 3 characters, aborts stale requests, and falls back to a recorded example
 * when the function is asleep or unavailable.
 */
export function MlsysSearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      controller.current?.abort();
      clearTimeout(timer.current);
    },
    [],
  );

  const limited = state.kind === "limited" && state.until > now;
  useEffect(() => {
    if (state.kind !== "limited") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.kind]);

  async function run(text: string) {
    const q = text.trim();
    // Any newer input cancels the request in flight, even a short one, so a
    // stale response can't overwrite the current state.
    controller.current?.abort();
    controller.current = null;
    if (q.length < 3) {
      setState({ kind: "idle" });
      return;
    }
    const ac = new AbortController();
    controller.current = ac;
    const timeout = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `${ENDPOINT}?q=${encodeURIComponent(q)}&limit=10`,
        { signal: ac.signal, headers: { Accept: "application/json" } },
      );
      if (res.status === 400) {
        const body = await res.json();
        if (controller.current !== ac) return;
        setState({
          kind: "invalid",
          message: `The search ${Object.values(body.fields ?? {})[0] ?? "is invalid"}.`,
        });
        return;
      }
      if (res.status === 429) {
        const body = await res.json();
        if (controller.current !== ac) return;
        setState({
          kind: "limited",
          until: Date.now() + (body.retryAfterSeconds ?? 60) * 1000,
        });
        setNow(Date.now());
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      if (controller.current !== ac) return;
      setState({ kind: "results", query: q, results: body.results });
    } catch (err) {
      // Navigating away or a newer query aborts silently (docs/03 §5).
      if (ac.signal.aborted && ac.signal.reason !== "timeout") return;
      let recorded: Recorded | null = null;
      try {
        recorded = await (await fetch(RECORDED)).json();
      } catch {
        recorded = null;
      }
      void err;
      setState({ kind: "unavailable", recorded });
    } finally {
      clearTimeout(timeout);
    }
  }

  function onChange(value: string) {
    setQuery(value);
    // Drop the request in flight now, not when the debounce fires, so its
    // answer can't show under a query the visitor has already changed.
    controller.current?.abort();
    controller.current = null;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(value), DEBOUNCE_MS);
  }

  const minutes =
    state.kind === "limited"
      ? Math.max(1, Math.ceil((state.until - now) / 60000))
      : 0;

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(timer.current);
          run(query);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="flex min-w-0 flex-1 flex-col font-sans text-sm">
          Search the book
          <input
            type="search"
            name="q"
            value={query}
            minLength={3}
            maxLength={200}
            autoComplete="off"
            onChange={(e) => onChange(e.target.value)}
            className="border-border bg-surface text-text mt-2 min-h-11 w-full rounded-sm border px-3 text-base"
            aria-describedby="mlsys-hint"
          />
        </label>
        <button
          type="submit"
          disabled={limited}
          className="border-text min-h-11 rounded-full border px-5 font-sans text-sm disabled:opacity-50"
        >
          Search
        </button>
      </form>
      <p id="mlsys-hint" className="text-muted mt-2 font-sans text-sm">
        At least 3 characters. Try{" "}
        {SUGGESTIONS.map((s) => `"${s}"`).join(" or ")}.
      </p>

      <div
        role="status"
        aria-live="polite"
        aria-busy={state.kind === "loading"}
        className="mt-6"
      >
        {state.kind === "loading" && (
          <ul aria-label="Loading results" className="space-y-4">
            {[0, 1, 2].map((i) => (
              <li key={i} className="bg-surface-2 h-16 rounded-sm" />
            ))}
          </ul>
        )}
        {state.kind === "results" && state.results.length === 0 && (
          <p>No matches. Try: {SUGGESTIONS.map((s) => `'${s}'`).join(", ")}.</p>
        )}
        {state.kind === "results" && state.results.length > 0 && (
          <p className="sr-only">{state.results.length} results</p>
        )}
        {state.kind === "invalid" && <p>{state.message}</p>}
        {limited && <p>Demo limit reached, try again in {minutes} min.</p>}
        {state.kind === "unavailable" && (
          <p>
            Demo is waking up or unavailable.
            {state.recorded &&
              ` Here is a recorded example for "${state.recorded.query}" from ${state.recorded.recordedOn}.`}
          </p>
        )}
      </div>

      {state.kind === "results" && <ResultList results={state.results} />}
      {state.kind === "unavailable" && state.recorded && (
        <ResultList results={state.recorded.results} />
      )}
    </div>
  );
}
