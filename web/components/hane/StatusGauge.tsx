/**
 * StatusGauge — replaces status pills. A 4-tick baseline gauge styled like court
 * baselines: uploaded → queued → processing → done fill volt L→R; the processing
 * tick pulses; failed fills vermilion and stops. Paired with a mono status word.
 */
type Status = "uploaded" | "queued" | "processing" | "done" | "failed" | (string & {});

type Props = {
  status: Status;
  className?: string;
};

const ORDER = ["uploaded", "queued", "processing", "done"] as const;

export default function StatusGauge({ status, className = "" }: Props) {
  const failed = status === "failed";
  const idx = ORDER.indexOf(status as (typeof ORDER)[number]);
  // failed stalls at the processing tick (3); unknown statuses show 1.
  const filled = failed ? 3 : idx >= 0 ? idx + 1 : 1;
  const processingTick = status === "processing";

  const word = String(status).toUpperCase();
  const wordInk = failed
    ? "text-weak-deep"
    : status === "done"
      ? "text-ink-900"
      : "text-ink-400";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => {
          const on = i < filled;
          const isProcessingTick = processingTick && i === filled - 1;
          const fill = failed ? "bg-weak" : on ? "bg-volt" : "bg-line";
          return (
            <span
              key={i}
              aria-hidden
              className={`h-[3px] w-4 ${fill} ${isProcessingTick ? "anim-pulse-alarm" : ""}`}
            />
          );
        })}
      </div>
      <span className={`type-micro uppercase ${wordInk}`}>{word}</span>
    </div>
  );
}
