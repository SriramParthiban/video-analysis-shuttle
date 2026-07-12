/**
 * SeverityGauge — five 3×14px vertical strokes. filledCount = severity (1–5) in
 * kind color (volt = strength / vermilion = weakness); empty = --line.
 * Severity is COUNT, not hue. Optional --wash-sev5 backing for sev-5 weaknesses.
 */
type Props = {
  severity: number; // 1–5
  kind: "strength" | "weakness";
  className?: string;
};

export default function SeverityGauge({ severity, kind, className = "" }: Props) {
  const n = Math.max(0, Math.min(5, Math.round(severity)));
  const fill = kind === "weakness" ? "bg-weak" : "bg-volt";
  const wash = kind === "weakness" && n === 5;

  return (
    <span
      className={`inline-flex items-end gap-1 ${wash ? "px-1.5 py-1" : ""} ${className}`}
      style={wash ? { background: "var(--wash-sev5)" } : undefined}
      role="img"
      aria-label={`Severity ${n} of 5, ${kind}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          className={i <= n ? fill : "bg-line"}
          style={{ width: 3, height: 14 }}
        />
      ))}
    </span>
  );
}
