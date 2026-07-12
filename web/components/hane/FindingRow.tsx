import SeverityGauge from "@/components/hane/SeverityGauge";

/**
 * FindingRow — a numbered LEDGER row (never a chip, never a card). A hanging
 * № NN in the left spine (mono, ink-400), a 2px left rule colored BY KIND
 * (volt = strength / vermilion = weakness), then the three-beat: a mono meta
 * line (KIND · CATEGORY) + SeverityGauge, an h2 title, and body detail.
 * Kind is the rule color, not a colored pill.
 */
type Props = {
  index: number;
  kind: string; // 'weakness' | 'strength'
  category: string;
  severity: number; // 1–5
  title: string;
  detail: string | null;
  className?: string;
};

export default function FindingRow({
  index,
  kind,
  category,
  severity,
  title,
  detail,
  className = "",
}: Props) {
  const isStrength = kind === "strength";
  const gaugeKind = isStrength ? "strength" : "weakness";
  const ruleColor = isStrength ? "var(--color-volt)" : "var(--color-weak)";
  const metaInk = isStrength ? "text-ink-400" : "text-weak-deep";

  const nn = String(Math.max(0, Math.round(index))).padStart(2, "0");
  const cat = (category ?? "").replace(/_/g, " ");

  return (
    <article
      className={`grid grid-cols-[3rem_1fr] gap-x-4 border-t border-line py-7 md:grid-cols-[4rem_1fr] md:gap-x-6 ${className}`}
    >
      <div className="type-data tnum pt-0.5 text-ink-400" aria-hidden>
        № {nn}
      </div>
      <div className="border-l-2 pl-4 md:pl-6" style={{ borderColor: ruleColor }}>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`type-kicker ${metaInk}`}>
            {kind} · {cat}
          </span>
          <SeverityGauge severity={severity} kind={gaugeKind} />
        </div>
        <h3 className="type-h2 text-ink-900">{title}</h3>
        {detail && <p className="type-body mt-2 text-ink-600">{detail}</p>}
      </div>
    </article>
  );
}
