import type { CSSProperties } from "react";

/**
 * HANE 羽 wordmark.
 * "HANE" in Archivo Expanded + a BESPOKE inline-SVG 羽 glyph (never a CJK font)
 * + a 2px volt rule stub beneath. Self-contained.
 *
 * variant 'paper' → ink on light; 'sumi' → light ink on dark. Volt rule always volt.
 */
type Props = {
  variant?: "paper" | "sumi";
  className?: string;
  /** wordmark cap size in px (glyph + rule scale from it). Default 22. */
  size?: number;
};

/** Bespoke geometric 羽 — two mirrored feather units. Not a font glyph. */
function HaneGlyph({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {/* left feather unit — hook + two barbs */}
      <path d="M3 7 H12 V25" />
      <path d="M6 12 l3.5 3.5" />
      <path d="M6 18 l3.5 3.5" />
      {/* right feather unit */}
      <path d="M17 7 H26 V25" />
      <path d="M20 12 l3.5 3.5" />
      <path d="M20 18 l3.5 3.5" />
    </svg>
  );
}

export default function HaneMark({ variant = "paper", className = "", size = 22 }: Props) {
  const inkClass = variant === "sumi" ? "text-ink-d-900" : "text-ink-900";
  const wordStyle: CSSProperties = { fontSize: size, letterSpacing: "0.02em", lineHeight: 1 };
  const stub: CSSProperties = { height: 2, width: Math.round(size * 1.1), marginTop: Math.round(size * 0.22) };

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <span className={`inline-flex items-center gap-[0.28em] ${inkClass}`}>
        <span className="font-display-xl" style={wordStyle}>
          HANE
        </span>
        <HaneGlyph px={Math.round(size * 0.92)} />
      </span>
      <span className="bg-volt block" style={stub} aria-hidden="true" />
    </span>
  );
}
