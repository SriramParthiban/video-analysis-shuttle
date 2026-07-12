import CornerTicks from "@/components/hane/CornerTicks";
import Button from "@/components/hane/Button";
import { Upload } from "@/components/hane/icons";

/**
 * UploadCourt — the DASHBOARD hero "drop court".
 * A --paper-raised rectangle framed in court-line style with volt CornerTicks;
 * LEFT-ALIGNED `UPLOAD MATCH` (display-xl) + mono subline + one volt CTA `LOAD CLIP`
 * that triggers the SAME hidden file input via `onPick`. uploadMsg shows inline.
 * Never a centered button.
 */
type Props = {
  /** clicks the hidden <input type=file> living in the dashboard page */
  onPick: () => void;
  /** true while the compress + upload + insert flow runs */
  uploading: boolean;
  /** live uploadMsg (progress while uploading, error text otherwise) */
  message?: string;
  /** disable the CTA before the anonymous session is ready (userId null) */
  disabled?: boolean;
};

export default function UploadCourt({ onPick, uploading, message = "", disabled = false }: Props) {
  return (
    <CornerTicks active arm={16} className="rounded-none">
      <div className="relative overflow-hidden rounded-none border-2 border-line bg-paper-raised p-4 md:p-8">
        {/* faint cropped-court motif on the asymmetric right side */}
        <svg
          aria-hidden
          className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 opacity-70 md:block"
          width="230"
          height="250"
          viewBox="0 0 230 250"
          fill="none"
        >
          <g stroke="var(--color-line)" strokeWidth={2} vectorEffect="non-scaling-stroke">
            <rect x="12" y="12" width="206" height="226" />
            <line x1="30" y1="12" x2="30" y2="238" />
            <line x1="200" y1="12" x2="200" y2="238" />
            <line x1="12" y1="125" x2="218" y2="125" />
            <line x1="115" y1="12" x2="115" y2="125" />
          </g>
        </svg>

        <div className="relative flex flex-col gap-6 md:max-w-[64%]">
          <div>
            <div className="type-kicker text-ink-400">INGEST</div>
            <h1 className="type-display-xl mt-2 text-ink-900">UPLOAD MATCH</h1>
            <p className="type-kicker mt-3 text-ink-400">MP4 / MOV · UP TO 500MB</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button variant="primary" onClick={onPick} disabled={uploading || disabled}>
              <Upload size={15} />
              {uploading ? "LOADING…" : "LOAD CLIP"}
            </Button>

            {message ? (
              uploading ? (
                <span className="type-micro flex items-center gap-2 text-ink-600">
                  <span aria-hidden className="h-1.5 w-1.5 bg-volt anim-cursor-blink" />
                  {message}
                </span>
              ) : (
                <span className="type-micro flex items-center gap-2 text-weak-deep">
                  <span aria-hidden className="h-1.5 w-1.5 bg-weak" />
                  {message}
                </span>
              )
            ) : null}
          </div>
        </div>
      </div>
    </CornerTicks>
  );
}
