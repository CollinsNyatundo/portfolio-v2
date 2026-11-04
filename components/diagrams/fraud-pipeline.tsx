/**
 * Scoring path of the credit-card fraud model, drawn in the technical-drawing
 * world (BRIEF): fine strokes, no fills, ink on paper. Uses currentColor so it
 * follows the reading mode. Facts come from the public repo (see the case
 * study's evidence list).
 */
const steps = [
  { title: "Transaction", detail: "Time, V1 to V28 (PCA), Amount" },
  {
    title: "Window features",
    detail: "built from the previous 10 transactions",
  },
  { title: "LightGBM, focal loss", detail: "79 inputs, tuned with Optuna" },
  { title: "Probability", detail: "sigmoid(raw score + init score)" },
  { title: "Decision", detail: "flag or allow at the tuned threshold" },
];

const BOX_W = 300;
const BOX_H = 58;
const GAP = 30;
const X = 30;

export function FraudPipeline() {
  const height = steps.length * BOX_H + (steps.length - 1) * GAP + 110;
  return (
    <svg
      viewBox={`0 0 360 ${height}`}
      role="img"
      aria-labelledby="fraud-pipeline-title fraud-pipeline-desc"
      className="mx-auto block w-full max-w-[420px]"
    >
      <title id="fraud-pipeline-title">How one transaction is scored</title>
      <desc id="fraud-pipeline-desc">
        A transaction enters with its time, 28 PCA components and amount. Window
        features are computed from the previous ten transactions. A LightGBM
        model trained with focal loss produces a raw score, which becomes a
        probability through a sigmoid with the training init score, and is
        compared with the tuned threshold to flag or allow. SHAP contributions
        explain the score, and the service runs behind FastAPI with Redis and
        PostgreSQL in Docker.
      </desc>
      <defs>
        <marker
          id="fraud-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8" fill="none" stroke="currentColor" />
        </marker>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {steps.map((step, i) => {
          const y = 10 + i * (BOX_H + GAP);
          return (
            <g key={step.title}>
              <rect x={X} y={y} width={BOX_W} height={BOX_H} />
              {i < steps.length - 1 && (
                <line
                  x1={X + BOX_W / 2}
                  y1={y + BOX_H}
                  x2={X + BOX_W / 2}
                  y2={y + BOX_H + GAP - 2}
                  markerEnd="url(#fraud-arrow)"
                />
              )}
            </g>
          );
        })}
      </g>
      <g fill="currentColor" fontFamily="var(--font-geist-sans), sans-serif">
        {steps.map((step, i) => {
          const y = 10 + i * (BOX_H + GAP);
          return (
            <g key={step.title}>
              <text x={X + 14} y={y + 24} fontSize="14" fontWeight="600">
                {step.title}
              </text>
              <text x={X + 14} y={y + 44} fontSize="12" opacity="0.75">
                {step.detail}
              </text>
            </g>
          );
        })}
        <text x={X} y={height - 62} fontSize="12" opacity="0.75">
          Explanation: SHAP contributions from the same model.
        </text>
        <text x={X} y={height - 42} fontSize="12" opacity="0.75">
          Service: FastAPI, Redis and PostgreSQL in Docker.
        </text>
        <text x={X} y={height - 22} fontSize="12" opacity="0.75">
          Latency: 1.4 ms p95 for the model call alone.
        </text>
      </g>
    </svg>
  );
}
