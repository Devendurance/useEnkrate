/**
 * The Guarded Route, Enkrate's ownable recurring asset.
 * A thin indigo path with explicit gate marks and a final receipt block.
 * Reproducible in static print, dashboards, and reduced-motion mode:
 * the dash "flow" animation degrades to a solid line (see globals.css).
 */
const GATES = [
  "Created",
  "Market session",
  "Oracle freshness",
  "Slippage",
  "Spend cap",
] as const;

const GATE_SPACING = 140;
const FIRST_GATE_X = 70;
const PATH_Y = 85;

export function GuardedRoute({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 920 170"
      role="img"
      aria-label="The Guarded Route: a rule passes through market session, oracle freshness, slippage, and spend cap checks before leaving a receipt."
      className={className}
    >
      {/* Route line */}
      <line
        x1={24}
        y1={PATH_Y}
        x2={740}
        y2={PATH_Y}
        stroke="#0F1596"
        strokeWidth={2}
        className="route-flow"
      />
      <line x1={740} y1={PATH_Y} x2={772} y2={PATH_Y} stroke="#0F1596" strokeWidth={2} />

      {/* Gates */}
      {GATES.map((label, i) => {
        const x = FIRST_GATE_X + i * GATE_SPACING;
        return (
          <g key={label}>
            <text
              x={x}
              y={58}
              textAnchor="middle"
              fontSize={9}
              letterSpacing={1}
              fill="#0F1596"
              className="font-mono"
            >
              PASS
            </text>
            <rect
              x={x - 8}
              y={PATH_Y - 8}
              width={16}
              height={16}
              rx={2}
              fill="#FFFFFF"
              stroke="#0F1596"
              strokeWidth={2}
            />
            <text
              x={x}
              y={130}
              textAnchor="middle"
              fontSize={10}
              fill="#4A4946"
              className="font-mono"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Final receipt block */}
      <rect x={772} y={45} width={132} height={80} rx={8} fill="#0F1596" />
      <text
        x={838}
        y={90}
        textAnchor="middle"
        fontSize={12}
        letterSpacing={2}
        fill="#FFFFFF"
        className="font-mono"
      >
        RECEIPT
      </text>
      <text
        x={838}
        y={130}
        textAnchor="middle"
        fontSize={10}
        fill="#4A4946"
        className="font-mono"
      >
        Outcome + reason
      </text>
    </svg>
  );
}
