import type { CSSProperties } from "react";

/**
 * YOSI wordmark — "YOSI" set in Archivo Expanded with a 2px volt rule beneath.
 * (The visual design language is internally codenamed "hane"; the user-facing
 * brand is YOSI.) Self-contained, no external assets.
 *
 * variant 'paper' → ink on light; 'sumi' → light ink on dark. Volt rule always volt.
 */
type Props = {
  variant?: "paper" | "sumi";
  className?: string;
  /** wordmark cap size in px (the rule scales from it). Default 22. */
  size?: number;
};

export default function HaneMark({ variant = "paper", className = "", size = 22 }: Props) {
  const inkClass = variant === "sumi" ? "text-ink-d-900" : "text-ink-900";
  const wordStyle: CSSProperties = { fontSize: size, letterSpacing: "0.05em", lineHeight: 1 };
  const stub: CSSProperties = { height: 2, width: Math.round(size * 1.05), marginTop: Math.round(size * 0.22) };

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <span className={`font-display-xl ${inkClass}`} style={wordStyle}>
        YOSI
      </span>
      <span className="bg-volt block" style={stub} aria-hidden="true" />
    </span>
  );
}
