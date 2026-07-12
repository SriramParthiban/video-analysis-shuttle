import type { CSSProperties } from "react";
import { Feather } from "@/components/hane/icons";

/**
 * RallyLoader — the anti-spinner analysing state. A faint court draws itself,
 * a volt scan-line sweeps top→bottom (the CV pipeline reading frames), a shuttle
 * (volt cork + feather plume) flies a parabolic clear via offset-path, and a mono
 * ticker pulses with a blinking cursor. Never a bare spinner. All CSS motion;
 * prefers-reduced-motion collapses to a static drawn court + static ticker
 * (handled by the global anim helpers).
 */
type Props = {
  label?: string;
};

const W = 360;
const H = 240;

/* faint court — outer, net, service lines, centre, tramlines */
const COURT_PATH = [
  `M20 20 H${W - 20} V${H - 20} H20 Z`,
  `M20 120 H${W - 20}`, // net (mid)
  `M20 90 H${W - 20}`, // short service (upper)
  `M20 150 H${W - 20}`, // short service (lower)
  `M180 20 V90`, // centre (upper court)
  `M180 150 V${H - 20}`, // centre (lower court)
  `M40 20 V${H - 20}`, // tramline L
  `M320 20 V${H - 20}`, // tramline R
].join(" ");

export default function RallyLoader({ label }: Props) {
  const ticker = label ?? "ANALYSING · READING RALLIES";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ticker}
      className="flex w-full flex-col items-center py-8"
    >
      <div
        className="relative overflow-hidden"
        style={{ width: W, maxWidth: "100%", height: H }}
      >
        {/* faint court, drawing itself */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "100%", display: "block" }}
          aria-hidden
        >
          <path
            d={COURT_PATH}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={3000}
            className="anim-court-draw"
            style={{ ["--draw-len" as string]: 3000, opacity: 0.85 } as CSSProperties}
          />
          {/* volt net tick */}
          <line
            x1={180}
            y1={114}
            x2={180}
            y2={126}
            stroke="var(--color-volt)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* volt scan-line sweeping top→bottom (top border is the visible mark) */}
        <div
          aria-hidden
          className="anim-scan-sweep pointer-events-none absolute inset-x-0 top-0 h-full"
          style={{
            background:
              "linear-gradient(to bottom, var(--color-volt-glow), transparent 44px)",
          }}
        >
          <div className="h-0.5 w-full bg-volt" />
        </div>

        {/* shuttle flying a parabolic clear along an offset-path */}
        <div
          aria-hidden
          className="anim-shuttle-arc pointer-events-none absolute"
          style={
            {
              top: 0,
              left: 0,
              offsetPath: `path("M 44 208 Q 180 26 316 208")`,
              offsetRotate: "auto",
            } as CSSProperties
          }
        >
          <div className="flex items-center gap-0.5">
            <span
              className="block bg-volt"
              style={{ width: 9, height: 9, borderRadius: 2 }}
            />
            <Feather size={13} className="text-volt-deep" aria-hidden />
          </div>
        </div>
      </div>

      {/* mono ticker with live dot + blinking cursor */}
      <div className="type-kicker mt-5 flex items-center gap-2 text-ink-600">
        <span
          aria-hidden
          className="anim-pulse-alarm block bg-volt"
          style={{ width: 6, height: 6 }}
        />
        <span>{ticker}</span>
        <span
          aria-hidden
          className="anim-cursor-blink inline-block bg-ink-900"
          style={{ width: 7, height: 14 }}
        />
      </div>
    </div>
  );
}
