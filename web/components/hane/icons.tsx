import type { SVGProps } from "react";

/**
 * HANE icon set — minimal, stroke-based, inline SVG, currentColor.
 * No emoji, no CDN, no external assets. Size via `size` (px) or className.
 */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Feather / 羽 mark — the plume. */
export function Feather(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <path d="M16 8 2 22" />
      <path d="M17.5 15H9" />
    </Svg>
  );
}

/** Upload — arrow up into a tray. */
export function Upload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15V3" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </Svg>
  );
}

/** Check. */
export function Check(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12l5 5L20 6" />
    </Svg>
  );
}

/** Chevron — points right by default; rotate via className. */
export function Chevron(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

/** Crosshair — calibration target. */
export function Crosshair(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Pencil — edit name. */
export function Pencil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h4L18.5 9.5l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </Svg>
  );
}

/** Arrow left — back navigation. */
export function ArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}
