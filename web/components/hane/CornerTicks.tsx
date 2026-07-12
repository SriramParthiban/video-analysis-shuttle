import type { ReactNode } from "react";

/**
 * CornerTicks — reusable L-shaped 10×2px "court corner" registration marks that
 * wrap any box. Default --line; turn volt on hover (or when `active`).
 * Drop children inside; the wrapper is `relative` and the four ticks overlay it.
 */
type Props = {
  children?: ReactNode;
  className?: string;
  /** force volt (e.g. selected / calibrated) */
  active?: boolean;
  /** arm length in px (default 10) */
  arm?: number;
  /** wrapper display; default block */
  as?: "div" | "span";
};

export default function CornerTicks({
  children,
  className = "",
  active = false,
  arm = 10,
  as: Tag = "div",
}: Props) {
  const barBg = active ? "bg-volt" : "bg-line group-hover:bg-volt";
  const trans = "transition-colors duration-150";
  const h = { horizontal: { width: arm, height: 2 }, vertical: { width: 2, height: arm } };

  return (
    <Tag className={`group relative ${className}`}>
      {children}
      {/* top-left */}
      <span aria-hidden className={`pointer-events-none absolute left-0 top-0 ${barBg} ${trans}`} style={h.horizontal} />
      <span aria-hidden className={`pointer-events-none absolute left-0 top-0 ${barBg} ${trans}`} style={h.vertical} />
      {/* top-right */}
      <span aria-hidden className={`pointer-events-none absolute right-0 top-0 ${barBg} ${trans}`} style={h.horizontal} />
      <span aria-hidden className={`pointer-events-none absolute right-0 top-0 ${barBg} ${trans}`} style={h.vertical} />
      {/* bottom-left */}
      <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 ${barBg} ${trans}`} style={h.horizontal} />
      <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 ${barBg} ${trans}`} style={h.vertical} />
      {/* bottom-right */}
      <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 ${barBg} ${trans}`} style={h.horizontal} />
      <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 ${barBg} ${trans}`} style={h.vertical} />
    </Tag>
  );
}
