import type { CSSProperties } from "react";
import {
  darkBandOpacity,
  dispersion,
  fingerprint,
  BAND,
  COURT_W,
  type Coverage,
  type Lateral,
} from "@/lib/hane/court";

/**
 * MatchMap — the full-court screenshot payoff. viewBox 0 0 610 1340, net at
 * y=670 (both halves meet there). Both players' depth heat + fingerprint dots
 * render on their own halves. Designed to sit on a full-bleed SUMI band, so the
 * court lines are drawn LIGHT on dark; volt heat + dots sing on the black.
 *
 * Top player fills y 0..670 (their net at the shared line, forecourt low).
 * Bottom player is mirrored via translate/scale so their net also meets y=670.
 */
export type MatchPlayer = {
  side: "left" | "right" | (string & {});
  coverage: Coverage;
  lateral?: Lateral;
  distanceM?: number;
  label?: string;
};

type Props = {
  players: MatchPlayer[];
  className?: string;
};

const MONO: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontWeight: 500,
  letterSpacing: "0.12em",
  fontFeatureSettings: '"tnum" 1',
  textTransform: "uppercase",
};

const LINE = "var(--color-ink-d-600)"; // light court lines on sumi
const NET = "var(--color-ink-d-900)"; // brightest: the shared net seam + ticks

/** One half-court drawn in LOCAL coords (0..670, y=0 back → y=670 net). */
function Half({
  player,
  flip,
  idx,
}: {
  player: MatchPlayer;
  flip: boolean;
  idx: number;
}) {
  const rear = Math.max(0, Math.round(player.coverage?.rear ?? 0));
  const mid = Math.max(0, Math.round(player.coverage?.mid ?? 0));
  const front = Math.max(0, Math.round(player.coverage?.front ?? 0));
  const fp = fingerprint(player.coverage, player.lateral);
  const ringR = dispersion(player.coverage);

  const bands = [
    { key: "front", pct: front, y0: BAND.front.y0, h: BAND.front.y1 - BAND.front.y0, delay: "0.70s" },
    { key: "mid", pct: mid, y0: BAND.mid.y0, h: BAND.mid.y1 - BAND.mid.y0, delay: "0.84s" },
    { key: "rear", pct: rear, y0: BAND.rear.y0, h: BAND.rear.y1 - BAND.rear.y0, delay: "0.98s" },
  ] as const;

  // thin markings, minus the net (drawn once, shared, at the global seam)
  const linePath = [
    `M0 0 H${COURT_W}`, // back boundary
    `M0 0 V670`, // doubles sideline L
    `M${COURT_W} 0 V670`, // doubles sideline R
    `M46 0 V670`, // singles sideline L
    `M564 0 V670`, // singles sideline R
    `M0 472 H${COURT_W}`, // short service line
    `M0 76 H${COURT_W}`, // doubles long-service line
    `M305 670 V472`, // centre line
  ].join(" ");

  return (
    <g transform={flip ? "translate(0,1340) scale(1,-1)" : undefined}>
      {/* heat — screen-blended so volt GLOWS on the sumi black instead of muddying */}
      {bands.map((b) => (
        <rect
          key={b.key}
          x={0}
          y={b.y0}
          width={COURT_W}
          height={b.h}
          fill="var(--color-volt)"
          fillOpacity={darkBandOpacity(b.pct)}
          className="anim-band-grow"
          style={{ transformBox: "fill-box", animationDelay: b.delay, mixBlendMode: "screen" } as CSSProperties}
        />
      ))}

      {/* lines */}
      <path
        d={linePath}
        fill="none"
        stroke={LINE}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeDasharray={5000}
        className="anim-court-draw"
        style={{ ["--draw-len" as string]: 5000 } as CSSProperties}
      />

      {/* player label at the back */}
      {player.label && (
        <text
          x={20}
          y={44}
          textAnchor="start"
          transform={flip ? "translate(0,88) scale(1,-1)" : undefined}
          style={{ ...MONO, fontSize: 24, fill: "var(--color-ink-d-600)" }}
        >
          {player.label}
        </text>
      )}

      {/* soft hotspot glow behind the dot — the movement signature reads as a light */}
      <circle
        cx={fp.x}
        cy={fp.y}
        r={ringR * 0.9}
        fill="var(--color-volt)"
        fillOpacity={0.22}
        className="anim-ring-fade"
        style={{ transformBox: "fill-box", transformOrigin: "center", mixBlendMode: "screen", animationDelay: `${1.2 + idx * 0.12}s` } as CSSProperties}
      />

      {/* spread ring + fingerprint dot */}
      <circle
        cx={fp.x}
        cy={fp.y}
        r={ringR}
        fill="none"
        stroke="var(--color-volt)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className="anim-ring-fade"
        style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: `${1.2 + idx * 0.12}s` } as CSSProperties}
      />
      <circle
        cx={fp.x}
        cy={fp.y}
        r={10}
        fill="var(--color-volt)"
        className="anim-dot-settle"
        style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: `${1.34 + idx * 0.12}s` } as CSSProperties}
      />
    </g>
  );
}

export default function MatchMap({ players, className = "" }: Props) {
  const top = players[0];
  const bottom = players[1];

  return (
    <svg
      viewBox="0 0 610 1340"
      style={{ width: "100%", height: "auto", display: "block" }}
      className={className}
      role="img"
      aria-label="Match map — both players' court coverage and movement fingerprints"
    >
      {/* court base panel — lifts the surface off pure black so the markings and
          heat read as an intentional court, framed by a hairline */}
      <rect x={0} y={0} width={610} height={1340} fill="var(--color-sumi-raised)" />
      <rect
        x={1}
        y={1}
        width={608}
        height={1338}
        fill="none"
        stroke="var(--color-sumi-line)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />

      {top && <Half player={top} flip={false} idx={0} />}
      {bottom && <Half player={bottom} flip idx={1} />}

      {/* shared net seam (drawn once) + volt centre tick */}
      <line
        aria-hidden
        x1={0}
        y1={670}
        x2={610}
        y2={670}
        stroke={NET}
        strokeWidth={4}
        vectorEffect="non-scaling-stroke"
      />
      <line
        aria-hidden
        x1={305}
        y1={662}
        x2={305}
        y2={678}
        stroke="var(--color-volt)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
