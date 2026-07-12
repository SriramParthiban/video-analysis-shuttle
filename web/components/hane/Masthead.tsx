import type { ReactNode } from "react";
import HaneMark from "./HaneMark";

/**
 * Masthead / AppBar — full-width, LEFT-ALIGNED, never centered.
 * Left: HANE 羽 wordmark. Right: optional mono session/account readout.
 * One full-width --line rule beneath (the app's first "court boundary").
 */
type Props = {
  variant?: "paper" | "sumi";
  right?: ReactNode;
  className?: string;
};

export default function Masthead({ variant = "paper", right, className = "" }: Props) {
  const sumi = variant === "sumi";
  const surface = sumi ? "bg-sumi border-sumi-line" : "bg-paper border-line";
  const rightInk = sumi ? "text-ink-d-400" : "text-ink-400";

  return (
    <header className={`w-full border-b ${surface} ${className}`}>
      <div className="flex h-16 w-full items-center justify-between gap-6 px-5 md:px-18">
        <HaneMark variant={variant} size={20} />
        {right != null && (
          <div className={`type-micro flex items-center gap-4 text-right ${rightInk}`}>{right}</div>
        )}
      </div>
    </header>
  );
}
