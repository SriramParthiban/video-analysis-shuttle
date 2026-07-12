"use client";

import { useId } from "react";
import CornerTicks from "@/components/hane/CornerTicks";
import { Feather } from "@/components/hane/icons";

/**
 * PortraitMount — the ID-photo crop rendered in a warm DUOTONE so mismatched
 * source frames unify into one object: shadows → ink-900, highlights →
 * paper-raised, via an inline SVG feColorMatrix (→ luminance) + feComponentTransfer
 * (→ two-tone ramp). 2:3, hairline mount, corner ticks. No external assets.
 *
 * Fallback (no src): a duotone-toned well with the bespoke feather mark — never
 * an emoji.
 */
type Props = {
  src?: string;
  alt?: string;
  onClick?: () => void;
  className?: string;
};

/* duotone ramp endpoints (0→dark, 1→light), sRGB channel fractions */
const INK = { r: 0.094, g: 0.09, b: 0.071 }; // #181712
const PAPER = { r: 0.98, g: 0.973, b: 0.949 }; // #FAF8F2

export default function PortraitMount({
  src,
  alt = "Player portrait",
  onClick,
  className = "",
}: Props) {
  const uid = useId().replace(/[:]/g, "");
  const filterId = `hane-duo-${uid}`;
  const clickable = typeof onClick === "function";

  const inner = src ? (
    <svg
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
      role="img"
      aria-label={alt}
    >
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          {/* luminance → grey in every channel */}
          <feColorMatrix
            type="matrix"
            values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"
          />
          {/* grey → warm two-tone ramp */}
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${INK.r} ${PAPER.r}`} />
            <feFuncG type="table" tableValues={`${INK.g} ${PAPER.g}`} />
            <feFuncB type="table" tableValues={`${INK.b} ${PAPER.b}`} />
          </feComponentTransfer>
        </filter>
      </defs>
      <image
        href={src}
        x="0"
        y="0"
        width="200"
        height="300"
        preserveAspectRatio="xMidYMid slice"
        filter={`url(#${filterId})`}
      />
    </svg>
  ) : (
    <div
      className="flex h-full w-full items-center justify-center bg-paper-sunk"
      role="img"
      aria-label={alt}
    >
      <Feather size={44} className="text-line-strong" aria-hidden />
    </div>
  );

  const mount = (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm border border-line bg-paper-raised">
      {inner}
    </div>
  );

  return (
    <CornerTicks as="div" className={className}>
      {clickable ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={alt}
          className="block w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left outline-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {mount}
        </button>
      ) : (
        mount
      )}
    </CornerTicks>
  );
}
