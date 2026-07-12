/**
 * StatReadout — Archivo-Expanded tabular number + mono unit + optional mono label.
 * Revealed via stat-wipe (left→right). Different silhouette from a card by design.
 */
type Props = {
  value: string | number;
  unit?: string;
  label?: string;
  /** xl = display-xl (64) · lg = display-l (40) · md = stat (34, default) */
  size?: "xl" | "lg" | "md";
  className?: string;
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  xl: "type-display-xl",
  lg: "type-display-l",
  md: "type-stat",
};

export default function StatReadout({ value, unit, label, size = "md", className = "" }: Props) {
  return (
    <div className={className}>
      {label && <div className="type-kicker mb-1 text-ink-400">{label}</div>}
      <div className="anim-stat-wipe flex items-baseline gap-1.5">
        <span className={`${SIZE[size]} tnum text-ink-900`}>{value}</span>
        {unit && <span className="type-data text-ink-400">{unit}</span>}
      </div>
    </div>
  );
}
