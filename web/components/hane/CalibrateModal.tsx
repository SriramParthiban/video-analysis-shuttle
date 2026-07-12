"use client";

import { useState } from "react";
import Button from "@/components/hane/Button";
import { Crosshair } from "@/components/hane/icons";

/**
 * CalibrateModal — the reworked CourtCalibrator. A SUMI overlay on the reference
 * frame: four labeled targets NEAR-L / NEAR-R / FAR-R / FAR-L; each tap plants a
 * volt crosshair + mono coordinate; a volt outline squares up live as the points
 * land; progress reads "2 / 4 CORNERS SET"; CONFIRM CALIBRATION.
 *
 * PRESERVED VERBATIM from the original CourtCalibrator: the corner-capture math
 * (getBoundingClientRect → clamped 0..1 normalized x/y, pushed in order), the
 * capture ORDER (near-left → near-right → far-right → far-left — the worker's
 * homography depends on it), and the onSave(corners) / onClose contract.
 */
type Props = {
  imageUrl: string;
  initial: number[][] | null;
  onSave: (corners: number[][]) => void;
  onClose: () => void;
};

const CORNER_STEPS = ["NEAR-LEFT", "NEAR-RIGHT", "FAR-RIGHT", "FAR-LEFT"];
const CORNER_ABBR = ["NEAR-L", "NEAR-R", "FAR-R", "FAR-L"];

export default function CalibrateModal({ imageUrl, initial, onSave, onClose }: Props) {
  const [pts, setPts] = useState<number[][]>(
    initial && initial.length === 4 ? initial : [],
  );

  // --- PRESERVED capture math (byte-for-byte behavior of the original) ---
  function onImgClick(e: React.MouseEvent<HTMLImageElement>) {
    if (pts.length >= 4) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setPts([...pts, [x, y]]);
  }

  const done = pts.length >= 4;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-sumi/95 p-4 md:p-8">
      {/* header — three-beat */}
      <div className="mx-auto w-full max-w-225">
        <div className="type-kicker text-volt">Calibrate court</div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="type-h1 text-ink-d-900">
            {done ? "All 4 corners set" : `Tap the ${CORNER_STEPS[pts.length]} corner`}
          </h2>
          <div className="flex items-center gap-2">
            {!done && (
              <span
                aria-hidden
                className="anim-pulse-alarm block bg-volt"
                style={{ width: 7, height: 7 }}
              />
            )}
            <span className="type-data tnum text-ink-d-600">{pts.length} / 4 corners set</span>
          </div>
        </div>
        <p className="type-micro mt-2 text-ink-d-400">
          Order: near-left → near-right → far-right → far-left (the outer court lines)
        </p>
      </div>

      {/* the reference frame + overlays */}
      <div className="flex flex-1 items-center justify-center overflow-hidden py-5">
        <div className="relative inline-block leading-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Court reference frame"
            onClick={onImgClick}
            className="block max-h-[64vh] max-w-full cursor-crosshair rounded-sm border border-sumi-line object-contain"
          />

          {/* volt outline that squares up live (fills once all 4 land) */}
          {pts.length >= 2 && (
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polyline
                points={pts.map((p) => `${p[0] * 100},${p[1] * 100}`).join(" ")}
                fill={done ? "var(--color-volt-glow)" : "none"}
                stroke="var(--color-volt)"
                strokeWidth={done ? 0.7 : 0.5}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {done && (
                <line
                  x1={pts[3][0] * 100}
                  y1={pts[3][1] * 100}
                  x2={pts[0][0] * 100}
                  y2={pts[0][1] * 100}
                  stroke="var(--color-volt)"
                  strokeWidth={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          )}

          {/* volt crosshairs + mono coordinate per captured corner */}
          {pts.map((p, i) => (
            <div
              key={i}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-volt"
              style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%` }}
            >
              <Crosshair size={22} className="text-volt" />
              <span className="type-micro absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap bg-sumi/80 px-1 py-0.5 text-volt">
                {CORNER_ABBR[i]} {p[0].toFixed(2)},{p[1].toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* actions */}
      <div className="mx-auto flex w-full max-w-225 flex-wrap items-center justify-end gap-3">
        <Button as="button" variant="quiet" onClick={() => setPts([])}>
          Reset
        </Button>
        <Button as="button" variant="quiet" onClick={onClose}>
          Cancel
        </Button>
        <Button as="button" variant="primary" disabled={!done} onClick={() => onSave(pts)}>
          Confirm calibration
        </Button>
      </div>
    </div>
  );
}
