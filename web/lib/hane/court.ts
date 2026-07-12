/**
 * HANE 羽 — court math.
 * Pure, framework-free geometry + data-mapping helpers for the signature court
 * visualization. No JSX, no side effects. Everything the SVG components need to
 * place a mark is computed here so CourtPrint / MatchMap stay declarative.
 *
 * Coordinate system (a single HALF court): viewBox 610 × 670 user units — a real
 * 6.10 m × 6.70 m half, so 1 unit ≈ 1 cm. y = 0 is the BACK boundary (top),
 * y = 670 is the NET (bottom). Forecourt lives near the net (large y).
 */

export type Coverage = { front: number; mid: number; rear: number };
export type Lateral = { left: number; right: number };
export type Point = { x: number; y: number };

/* ---- Court dimensions ---- */
export const COURT_W = 610;
export const COURT_H = 670;

/* ---- Real line markings (user units) ---- */
export const LINES = {
  back: 0, // top boundary
  net: 670, // bottom edge
  doublesSidelineL: 0,
  doublesSidelineR: 610,
  singlesSidelineL: 46,
  singlesSidelineR: 564,
  shortService: 472, // 1.98 m up from the net
  doublesLongService: 76, // doubles long-service line, near the back
  centre: 305, // centre line x
  tramlineInner: 46, // doubles alley = x 0..46 (left), used as the distance gauge
} as const;

/* ---- Depth bands (each ≈223 tall). REAR at back (top) → FRONT at net (bottom) ---- */
export const BAND = {
  rear: { y0: 0, y1: 223, centre: 111 },
  mid: { y0: 223, y1: 446, centre: 334 },
  front: { y0: 446, y1: 670, centre: 558 },
} as const;

/* ---- internal utils ---- */
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Heat-band alpha for a coverage percentage (0..100).
 * 0.06 floor so an empty zone still reads as court; ~0.55 cap so the heaviest
 * zone is legible but never a solid block. Exactly the brief's formula.
 */
export function bandOpacity(pct: number): number {
  const p = clamp(num(pct), 0, 100);
  return Math.min(0.55, 0.06 + (p / 100) * 0.49);
}

/**
 * Heat-band alpha for the SUMI (dark) MatchMap. On near-black, a low-alpha volt
 * fill desaturates to murky olive, so the dark map paints heat with `screen`
 * blending and a steeper curve — an empty zone stays a faint volt haze while the
 * heaviest zone reads as a clear volt glow. Pair with mix-blend-mode: screen.
 */
export function darkBandOpacity(pct: number): number {
  const p = clamp(num(pct), 0, 100);
  return Math.min(0.72, 0.12 + (p / 100) * 0.82);
}

/**
 * Fingerprint dot position (user units) — the player's movement signature.
 *  x  = 305 + ((right − left) / 100) * 250     (lateral balance)
 *  y  = weighted average of the three band centres, weights = coverage fractions
 *       (i.e. rear%·111 + mid%·334 + front%·558 when the zones sum to 100).
 *
 * Degrades gracefully: undefined/empty lateral → centred on x=305; all-zero
 * coverage → court centre. Never returns NaN and is always clamped in-court.
 */
export function fingerprint(coverage: Coverage, lateral?: Lateral | null): Point {
  const rear = num(coverage?.rear);
  const mid = num(coverage?.mid);
  const front = num(coverage?.front);
  const cSum = rear + mid + front;

  const y =
    cSum > 0
      ? (rear / cSum) * BAND.rear.centre +
        (mid / cSum) * BAND.mid.centre +
        (front / cSum) * BAND.front.centre
      : (BAND.rear.centre + BAND.mid.centre + BAND.front.centre) / 3;

  let x = LINES.centre; // 305 — centred when lateral is unknown
  if (lateral && (Number.isFinite(lateral.left) || Number.isFinite(lateral.right))) {
    x = 305 + ((num(lateral.right) - num(lateral.left)) / 100) * 250;
  }

  return { x: clamp(x, 8, 602), y: clamp(y, 8, 662) };
}

/** Std-dev extreme: one zone holds 100% → sqrt(2/9) ≈ 0.4714. */
const MAX_STDDEV = Math.sqrt(2 / 9);

/**
 * Spread-ring radius (34..70 user units) from the dispersion of the three zone
 * fractions (their std-dev). A concentrated player (uneven zones) reads with a
 * larger ring; unknown coverage returns a neutral mid-ring.
 */
export function dispersion(coverage: Coverage): number {
  const rear = num(coverage?.rear);
  const mid = num(coverage?.mid);
  const front = num(coverage?.front);
  const cSum = rear + mid + front;
  if (cSum <= 0) return 52; // neutral midpoint of 34..70

  const rf = rear / cSum;
  const mf = mid / cSum;
  const ff = front / cSum;
  const mean = 1 / 3;
  const variance = ((rf - mean) ** 2 + (mf - mean) ** 2 + (ff - mean) ** 2) / 3;
  const t = clamp(Math.sqrt(variance) / MAX_STDDEV, 0, 1);
  return 34 + t * (70 - 34);
}

/**
 * Doubles-tramline fill fraction (0..1) for total distance in metres.
 * clamp(distanceM / 800, 0, 1). Undefined/NaN distance → 0 (caller hides gauge).
 */
export function tramlineFill(distanceM?: number | null): number {
  if (distanceM == null || !Number.isFinite(distanceM)) return 0;
  return clamp(distanceM / 800, 0, 1);
}
