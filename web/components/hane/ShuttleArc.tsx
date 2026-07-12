import type { CSSProperties } from "react";

/**
 * ShuttleArc — the Login "unboxing" centrepiece. A huge, minimal top-down
 * badminton court drawn on SUMI whose faint lines register themselves in, with a
 * single VOLT shuttle-arc that draws itself across the net and a shuttle (cork +
 * feather) that flies the clear on an offset-path. Purely presentational — no
 * state, no data. All motion is CSS-only via the foundation anim-* helpers, so
 * prefers-reduced-motion collapses everything to a static, fully-drawn frame
 * (court + arc rendered, shuttle parked at the launch corner).
 *
 * The shuttle lives INSIDE the svg so its offset-path runs in the viewBox's user
 * space and stays glued to the drawn arc at any rendered scale.
 */
type Props = {
  className?: string;
};

const W = 1200;
const H = 560;

/* Faint court (top-down, full court, net vertical at x=600). Net drawn
   separately, bold, with a volt centre tick. */
const COURT_LINES = [
  `M40 40 H${W - 40} V${H - 40} H40 Z`, // outer doubles boundary
  "M40 80 H1160", // singles sideline (top)
  "M40 480 H1160", // singles sideline (bottom)
  "M410 40 V520", // short service line — left
  "M790 40 V520", // short service line — right
  "M110 40 V520", // doubles long-service line — left
  "M1090 40 V520", // doubles long-service line — right
  "M40 280 H410", // centre line — left service courts
  "M790 280 H1160", // centre line — right service courts
].join(" ");

/* The shuttle clear — a parabola arcing over the net. Shared by the drawn
   stroke and the offset-path the shuttle flies. */
const ARC = "M 190 452 Q 600 70 1010 452";

/* Corner registration ticks (the recurring "court corner" detail). */
const TICK = 30;
const CORNERS = [
  `M40 ${40 + TICK} V40 H${40 + TICK}`,
  `M${W - 40 - TICK} 40 H${W - 40} V${40 + TICK}`,
  `M40 ${H - 40 - TICK} V${H - 40} H${40 + TICK}`,
  `M${W - 40 - TICK} ${H - 40} H${W - 40} V${H - 40 - TICK}`,
];

export default function ShuttleArc({ className = "" }: Props) {
  return (
    <div className={`pointer-events-none w-full ${className}`} aria-hidden>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {/* faint court lines, registering themselves in */}
        <path
          d={COURT_LINES}
          fill="none"
          stroke="var(--color-sumi-line)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={8200}
          className="anim-court-draw"
          style={
            {
              ["--draw-len" as string]: 8200,
              animationDuration: "var(--t-scan)",
            } as CSSProperties
          }
        />

        {/* corner registration ticks (volt-deep) */}
        <g>
          {CORNERS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="var(--color-volt-deep)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {/* net — bold, with a volt centre tick */}
        <line
          x1={600}
          y1={40}
          x2={600}
          y2={520}
          stroke="var(--color-sumi-line)"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={600}
          y1={272}
          x2={600}
          y2={288}
          stroke="var(--color-volt)"
          strokeWidth={4}
          vectorEffect="non-scaling-stroke"
        />

        {/* landing + launch registration dots */}
        <circle cx={190} cy={452} r={4} fill="var(--color-volt-deep)" />
        <circle cx={1010} cy={452} r={4} fill="var(--color-volt-deep)" />

        {/* the volt shuttle-arc, drawing itself across the court */}
        <path
          d={ARC}
          fill="none"
          stroke="var(--color-volt)"
          strokeWidth={2.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          strokeDasharray={1150}
          className="anim-court-draw"
          style={
            {
              ["--draw-len" as string]: 1150,
              animationDuration: "var(--t-shuttle)",
              animationDelay: "0.35s",
            } as CSSProperties
          }
        />

        {/* the shuttle (cork + feather) flying the clear along the same arc.
            offset-path here is in user space → tracks the arc at any scale. */}
        <g
          className="anim-shuttle-arc"
          style={
            {
              offsetPath: `path("${ARC}")`,
              offsetRotate: "auto",
              offsetAnchor: "center",
            } as CSSProperties
          }
        >
          {/* cork */}
          <rect x={-17} y={-9} width={17} height={18} rx={2} fill="var(--color-volt)" />
          {/* feather cone (points along travel; +x is the tangent) */}
          <path
            d="M0 -9 L20 0 L0 9 Z"
            fill="none"
            stroke="var(--color-volt-deep)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M0 0 H16"
            stroke="var(--color-volt-deep)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
}
