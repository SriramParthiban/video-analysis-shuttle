"use client";

import Button from "@/components/hane/Button";
import { Check } from "@/components/hane/icons";

/**
 * CalibrationStrip — a thin full-width bar (a ledger strip, not a card):
 * COURT · CALIBRATED with a volt check, or COURT · NOT CALIBRATED in vermilion
 * with a pulse-alarm dot, plus a [CALIBRATE] link that opens the CalibrateModal.
 * Renders nothing when there's no reference frame to calibrate against (`show`).
 */
type Props = {
  calibrated: boolean;
  onCalibrate: () => void;
  show: boolean;
  className?: string;
};

export default function CalibrationStrip({
  calibrated,
  onCalibrate,
  show,
  className = "",
}: Props) {
  if (!show) return null;

  return (
    <div
      className={`flex items-center justify-between gap-4 border-y border-line py-3 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {calibrated ? (
          <Check size={15} className="text-volt-deep" aria-hidden />
        ) : (
          <span
            aria-hidden
            className="anim-pulse-alarm block bg-weak"
            style={{ width: 9, height: 9, borderRadius: 1 }}
          />
        )}
        <span
          className={`type-kicker ${calibrated ? "text-ink-600" : "text-weak-deep"}`}
        >
          Court · {calibrated ? "Calibrated" : "Not calibrated"}
        </span>
      </div>

      <Button as="button" variant="link" onClick={onCalibrate}>
        {calibrated ? "Re-calibrate" : "Calibrate"}
      </Button>
    </div>
  );
}
