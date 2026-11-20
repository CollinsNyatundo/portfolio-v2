/**
 * Bespoke geometric SVG icon: "Drafting Reticle & Folio Mark" (docs/04 §5).
 * Pure inline SVG with zero <style> tags (strict CSP safe, D-28) using
 * currentColor and --primary so it adapts cleanly to light and dark modes.
 */
export function AssistantIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Outer precision drafting ring + cardinal orthographic ticks */}
      <circle
        cx="18"
        cy="18"
        r="15.5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.32"
      />
      <g stroke="currentColor" strokeWidth="1" strokeOpacity="0.55">
        <line x1="18" y1="1.2" x2="18" y2="3.8" />
        <line x1="32.2" y1="18" x2="34.8" y2="18" />
        <line x1="18" y1="32.2" x2="18" y2="34.8" />
        <line x1="1.2" y1="18" x2="3.8" y2="18" />
      </g>

      {/* Inner dashed registration orbit (rotates 30deg on hover/focus) */}
      <circle
        cx="18"
        cy="18"
        r="11.5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.55"
        strokeDasharray="2.5 3.5"
        className="assistant-icon-orbit"
      />

      {/* Central folded folio plate with ruled ledger lines and ink dot */}
      <path
        d="M11.5 10 H20 L24.5 14.5 V26 H11.5 Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M20 10 V14.5 H24.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <line
        x1="14"
        y1="18"
        x2="21.5"
        y2="18"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.72"
      />
      <line
        x1="14"
        y1="21.5"
        x2="18.2"
        y2="21.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.72"
      />
      <circle cx="21.2" cy="21.6" r="2" fill="var(--primary)" />
    </svg>
  );
}
