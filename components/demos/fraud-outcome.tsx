/**
 * The fraud demo's result view, shared by the live demo and the server-rendered
 * preview on the home page. No hooks and no directive: on the home page it
 * renders on the server, so the first score is in the HTML with no
 * JavaScript; inside the demo it renders on the client.
 */

export type Contribution = {
  feature: string;
  logOdds: number;
  direction: "fraud" | "legit";
};
export type Result = {
  probability: number;
  calibratedProbability: number;
  threshold: number;
  decision: "flag" | "allow";
  topContributions: Contribution[];
  modelVersion: string;
  latencyMs: { model: number; total: number };
};
/** A real result of the deployed model, recorded for one served sample. */
export type Recorded = {
  sampleId: string;
  recordedOn: string;
  result: Result;
};

export const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

export function Outcome({
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
        <p className="text-muted mt-2 font-sans text-sm">
          Fraud is rare (0.17% of transactions in this data), so the threshold
          sits far below 50%.
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
                <span className="font-semibold">{c.feature}</span>{" "}
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

/** Says plainly that the figures below are recorded, not a live run. */
export function RecordedCaption({ recordedOn }: { recordedOn: string }) {
  return (
    <p className="text-muted mt-6 font-sans text-sm">
      Recorded result for sample 1, from the deployed model on{" "}
      <time dateTime={recordedOn}>{recordedOn}</time>. Press Score to run it
      live.
    </p>
  );
}
