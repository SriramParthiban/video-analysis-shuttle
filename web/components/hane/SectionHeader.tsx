/**
 * SectionHeader — the three-beat:
 *   mono KICKER (upper +0.14em)  ·  h1 title  ·  full-width hairline  ·  right-aligned mono count
 * e.g.  WHAT TO WORK ON  ————————————————  07
 */
type Props = {
  kicker: string;
  title: string;
  /** number is zero-padded to 2 digits; strings pass through */
  count?: number | string;
  className?: string;
};

function fmt(count: number | string): string {
  return typeof count === "number" ? String(count).padStart(2, "0") : count;
}

export default function SectionHeader({ kicker, title, count, className = "" }: Props) {
  return (
    <div className={className}>
      <div className="type-kicker text-ink-400">{kicker}</div>
      <div className="mt-2 flex items-baseline gap-4">
        <h2 className="type-h1 whitespace-nowrap text-ink-900">{title}</h2>
        <span aria-hidden className="h-px flex-1 self-center bg-line" />
        {count != null && <span className="type-data tnum text-ink-400">{fmt(count)}</span>}
      </div>
    </div>
  );
}
