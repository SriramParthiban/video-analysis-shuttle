import type { CSSProperties } from "react";
import {
  bandOpacity,
  dispersion,
  fingerprint,
  tramlineFill,
  BAND,
  COURT_W,
  COURT_H,
  type Coverage,
  type Lateral,
} from "@/lib/hane/court";

/**
 * CourtPrint — THE SIGNATURE. A hand-built, court-true half-court per player.
 * viewBox 0 0 610 670 (6.10 m × 6.70 m). y=0 back boundary (top), y=670 net.
 *
 * Reads coverage → three depth heat-bands, lateral → fingerprint-dot x + a
 * baseline L|R weight bar, distance → the doubles-tramline gauge. All data-viz
 * is hand-drawn SVG; motion is CSS-only (court-draw → band-grow → dot-settle +
 * ring-fade) and honours prefers-reduced-motion via the global anim helpers.
 *
 * Degrades gracefully: no lateral → dot centred + weight bar hidden; no
 * distance → tramline gauge + number hidden. Never NaN, never crashes.
 */
type Props = {
  side: "left" | "right" | (string & {});
  coverage: Coverage;
  lateral?: Lateral;
  distanceM?: number;
  /** rendered width in px (height follows the 610:670 court ratio) */
  size?: number;
  className?: string;
};

/* mono tick/label voice for in-SVG text (sized in user units) */
const MONO: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontWeight: 500,
  letterSpacing: "0.08em",
  fontFeatureSettings: '"tnum" 1',
  textTransform: "uppercase",
};
/* Archivo-Expanded stat voice for the distance number */
const STAT: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontVariationSettings: '"wght" 700, "wdth" 115',
  fontFeatureSettings: '"tnum" 1',
  letterSpacing: "-0.01em",
};

export default function CourtPrint({
  side,
  coverage,
  lateral,
  distanceM,
  size = 300,
  className = "",
}: Props) {
  const rear = Math.max(0, Math.round(coverage?.rear ?? 0));
  const mid = Math.max(0, Math.round(coverage?.mid ?? 0));
  const front = Math.max(0, Math.round(coverage?.front ?? 0));

  const fp = fingerprint(coverage, lateral);
  const ringR = dispersion(coverage);

  const hasDistance =
    typeof distanceM === "number" && Number.isFinite(distanceM);
  const fillH = tramlineFill(hasDistance ? distanceM : 0) * COURT_H;

  const hasLateral =
    !!lateral &&
    (Number.isFinite(lateral.left) || Number.isFinite(lateral.right));
  const L = hasLateral ? Math.max(0, Math.round(lateral!.left ?? 0)) : 0;
  const R = hasLateral ? Math.max(0, Math.round(lateral!.right ?? 0)) : 0;
  const lrSum = L + R;
  const leftFracPct = lrSum > 0 ? (L / lrSum) * 100 : 50;

  // One combined path draws all thin --line markings on court-draw.
  const linePath = [
    `M0 0 H${COURT_W} V${COURT_H} H0 Z`, // frame (doubles sidelines + back + net)
    `M46 0 V${COURT_H}`, // singles sideline L
    `M564 0 V${COURT_H}`, // singles sideline R
    `M0 472 H${COURT_W}`, // short service line
    `M0 76 H${COURT_W}`, // doubles long-service line
    `M305 670 V472`, // centre line (net → short service line)
  ].join(" ");

  const arm = 26; // corner registration ticks
  const corners = [
    `M0 ${arm} L0 0 L${arm} 0`,
    `M${COURT_W - arm} 0 L${COURT_W} 0 L${COURT_W} ${arm}`,
    `M0 ${COURT_H - arm} L0 ${COURT_H} L${arm} ${COURT_H}`,
    `M${COURT_W - arm} ${COURT_H} L${COURT_W} ${COURT_H} L${COURT_W} ${COURT_H - arm}`,
  ];

  const bands: {
    key: "front" | "mid" | "rear";
    label: string;
    pct: number;
    y0: number;
    h: number;
    delay: string;
  }[] = [
    { key: "front", label: "FRONT", pct: front, y0: BAND.front.y0, h: BAND.front.y1 - BAND.front.y0, delay: "0.70s" },
    { key: "mid", label: "MID", pct: mid, y0: BAND.mid.y0, h: BAND.mid.y1 - BAND.mid.y0, delay: "0.84s" },
    { key: "rear", label: "REAR", pct: rear, y0: BAND.rear.y0, h: BAND.rear.y1 - BAND.rear.y0, delay: "0.98s" },
  ];
  const bandCentre = { front: 558, mid: 334, rear: 111 } as const;

  return (
    <div className={className} style={{ width: size }}>
      <svg
        viewBox={`0 0 ${COURT_W} ${COURT_H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`Court coverage, ${side} side — rear ${rear}%, mid ${mid}%, front ${front}%${
          hasLateral ? `, left ${L} right ${R}` : ""
        }${hasDistance ? `, distance ${Math.round(distanceM!)} metres` : ""}`}
      >
        {/* 1 — depth heat-bands (grow up from the net, staggered front→rear) */}
        <g aria-hidden>
          {bands.map((b) => (
            <rect
              key={b.key}
              x={0}
              y={b.y0}
              width={COURT_W}
              height={b.h}
              fill="var(--color-volt)"
              fillOpacity={bandOpacity(b.pct)}
              className="anim-band-grow"
              style={{ transformBox: "fill-box", animationDelay: b.delay } as CSSProperties}
            />
          ))}
        </g>

        {/* 2 — doubles-tramline distance gauge (left alley, fills bottom-up) */}
        {hasDistance && (
          <rect
            aria-hidden
            x={0}
            y={COURT_H - fillH}
            width={46}
            height={fillH}
            fill="var(--color-volt)"
            fillOpacity={0.82}
            className="anim-band-grow"
            style={{ transformBox: "fill-box", animationDelay: "1.05s" } as CSSProperties}
          />
        )}

        {/* 3 — real line markings (draw themselves) */}
        <path
          aria-hidden
          d={linePath}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={6000}
          className="anim-court-draw"
          style={{ ["--draw-len" as string]: 6000 } as CSSProperties}
        />

        {/* 4 — bold net edge + volt centre tick */}
        <line
          aria-hidden
          x1={0}
          y1={COURT_H}
          x2={COURT_W}
          y2={COURT_H}
          stroke="var(--color-line-strong)"
          strokeWidth={4}
          vectorEffect="non-scaling-stroke"
        />
        <line
          aria-hidden
          x1={305}
          y1={654}
          x2={305}
          y2={670}
          stroke="var(--color-volt)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        {/* 5 — corner registration ticks (slightly heavier) */}
        <g aria-hidden>
          {corners.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="var(--color-line-strong)"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {/* 6 — band % labels (mono, right edge) */}
        <g aria-hidden>
          {bands.map((b) => (
            <text
              key={b.key}
              x={596}
              y={bandCentre[b.key]}
              textAnchor="end"
              dominantBaseline="central"
              style={{ ...MONO, fontSize: 23, fill: "var(--color-ink-600)" }}
            >
              {b.label} · {b.pct}%
            </text>
          ))}
        </g>

        {/* 7 — spread ring (dispersion) */}
        <circle
          aria-hidden
          cx={fp.x}
          cy={fp.y}
          r={ringR}
          fill="none"
          stroke="var(--color-volt)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          className="anim-ring-fade"
          style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: "1.25s" } as CSSProperties}
        />

        {/* 8 — fingerprint dot (solid volt, ≈8u) */}
        <circle
          aria-hidden
          cx={fp.x}
          cy={fp.y}
          r={9}
          fill="var(--color-volt)"
          className="anim-dot-settle"
          style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: "1.38s" } as CSSProperties}
        />

        {/* 9 — distance number at the baseline (Archivo stat + mono m) */}
        {hasDistance && (
          <text
            className="anim-stat-wipe"
            x={58}
            y={636}
            textAnchor="start"
            style={{ animationDelay: "1.15s" } as CSSProperties}
          >
            <tspan style={{ ...STAT, fontSize: 54, fill: "var(--color-ink-900)" }}>
              {Math.round(distanceM!)}
            </tspan>
            <tspan dx={7} style={{ ...MONO, fontSize: 22, fill: "var(--color-ink-400)" }}>
              m
            </tspan>
          </text>
        )}
      </svg>

      {/* baseline lateral weight bar + L · R readout — below the court */}
      {hasLateral && (
        <div className="mt-2">
          <div className="relative h-0.5 w-full bg-line">
            <div
              className="absolute inset-y-0 left-0 bg-volt"
              style={{ width: `${leftFracPct}%` }}
            />
          </div>
          <div className="type-micro mt-1.5 flex items-center justify-between text-ink-600">
            <span>L {L}</span>
            <span aria-hidden className="text-ink-400">
              ·
            </span>
            <span>R {R}</span>
          </div>
        </div>
      )}
    </div>
  );
}
