"use client";

import Button from "@/components/hane/Button";

/**
 * FailedState — a calm SUMI diagnostic panel (not an alarm dump): a vermilion
 * tick, a plain-English cause, and a [RE-RUN ANALYSIS] volt action. Honest and
 * quiet. onRetry re-queues the clip; omit it to hide the action.
 */
type Props = {
  onRetry?: () => void;
  className?: string;
};

export default function FailedState({ onRetry, className = "" }: Props) {
  return (
    <div
      className={`rounded-sm border border-sumi-line bg-sumi p-4 md:p-6 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="block bg-weak" style={{ width: 10, height: 3 }} />
        <span className="type-kicker text-weak">Analysis failed</span>
      </div>

      <h2 className="type-h1 mt-4 text-ink-d-900">This clip couldn&rsquo;t be read</h2>

      <p className="type-body mt-3 max-w-[60ch] text-ink-d-600">
        The most common cause is a camera angle where both players aren&rsquo;t clearly
        visible. An end-on view — the camera behind the court, both players in frame —
        gives the cleanest read. Re-run the analysis, or upload a clearer clip.
      </p>

      {onRetry && (
        <div className="mt-6">
          <Button as="button" variant="primary" onClick={onRetry}>
            Re-run analysis
          </Button>
        </div>
      )}
    </div>
  );
}
