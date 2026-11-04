/**
 * A vertical pipeline drawn in the technical-drawing world (BRIEF): fine
 * strokes, no fills, ink on paper, currentColor so it follows the reading
 * mode. Each case study passes its own steps; the facts come from its evidence.
 */
type Step = { title: string; detail: string };

const BOX_W = 300;
const BOX_H = 58;
const GAP = 30;
const X = 30;
const NOTE_H = 20;

export function Pipeline({
  id,
  title,
  description,
  steps,
  notes = [],
}: {
  /** Unique per page: used for the title, description and arrow ids. */
  id: string;
  title: string;
  description: string;
  steps: Step[];
  notes?: string[];
}) {
  const boxesHeight = steps.length * BOX_H + (steps.length - 1) * GAP;
  const height =
    10 + boxesHeight + (notes.length ? 30 + notes.length * NOTE_H : 10);
  const arrow = `${id}-arrow`;

  return (
    <svg
      viewBox={`0 0 360 ${height}`}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      className="mx-auto block w-full max-w-[420px]"
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{description}</desc>
      <defs>
        <marker
          id={arrow}
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
                  markerEnd={`url(#${arrow})`}
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
        {notes.map((note, i) => (
          <text
            key={note}
            x={X}
            y={10 + boxesHeight + 30 + i * NOTE_H}
            fontSize="12"
            opacity="0.75"
          >
            {note}
          </text>
        ))}
      </g>
    </svg>
  );
}
