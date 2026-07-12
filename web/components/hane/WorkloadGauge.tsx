/**
 * WorkloadGauge — a 3-notch LOW·MED·HIGH block (not a progress bar). Filled count
 * 1/2/3 in volt; empty notches --line. Mono label "WORKLOAD · HIGH".
 */
type Workload = "low" | "medium" | "high";

type Props = {
  workload: Workload;
  className?: string;
};

const LEVEL: Record<Workload, number> = { low: 1, medium: 2, high: 3 };

export default function WorkloadGauge({ workload, className = "" }: Props) {
  const level = LEVEL[workload] ?? 1;

  return (
    <div className={`inline-flex flex-col items-start gap-1.5 ${className}`}>
      <div className="flex items-center gap-1" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= level ? "bg-volt" : "bg-line"} style={{ width: 20, height: 8 }} />
        ))}
      </div>
      <span className="type-micro uppercase text-ink-400">WORKLOAD · {workload.toUpperCase()}</span>
    </div>
  );
}
