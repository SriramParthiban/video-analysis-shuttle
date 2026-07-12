"use client";

import CornerTicks from "@/components/hane/CornerTicks";
import Field from "@/components/hane/Field";
import PortraitMount from "@/components/hane/PortraitMount";
import WorkloadGauge from "@/components/hane/WorkloadGauge";
import CourtPrint from "@/components/hane/CourtPrint";

/**
 * PlayerPlate — an ASYMMETRIC plate (not a card): a tall 2:3 duotone
 * PortraitMount butted against a wider data column — editable NameField
 * (underline Field), ROLE / SIDE mono tags, WorkloadGauge — with the signature
 * CourtPrint spanning below. Deliberately unequal block widths, hairline mount
 * + corner ticks, radius-sm. The name input threads the page's SAME onChange /
 * onBlur; the portrait threads onExpand (only when a photo exists).
 */
type Coverage = { front: number; mid: number; rear: number };
type Lateral = { left: number; right: number };

type Metrics = {
  label?: string;
  role?: string;
  side?: string;
  workload?: string;
  court_coverage_pct?: Coverage;
  lateral_balance_pct?: Lateral;
  total_distance_m?: number;
};

type Props = {
  m: Metrics;
  playerKey: string;
  displayName: string;
  photo?: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
  onExpand: (url: string) => void;
  className?: string;
};

const SIDE_LABEL: Record<string, string> = {
  near: "Near",
  far: "Far",
  bottom: "Bottom",
  top: "Top",
  left: "Left",
  right: "Right",
};

function normWorkload(w?: string): "low" | "medium" | "high" {
  return w === "low" || w === "high" ? w : "medium";
}

export default function PlayerPlate({
  m,
  playerKey,
  displayName,
  photo,
  value,
  placeholder,
  onChange,
  onBlur,
  onExpand,
  className = "",
}: Props) {
  const coverage = m.court_coverage_pct ?? { front: 0, mid: 0, rear: 0 };
  const sideText = SIDE_LABEL[m.side ?? ""] ?? (m.side ? m.side : "—");

  return (
    <CornerTicks
      as="div"
      arm={12}
      className={`rounded-sm border border-line bg-paper-raised p-4 md:p-6 ${className}`}
    >
      {/* asymmetric header: narrow portrait + wide data column */}
      <div className="grid grid-cols-[92px_1fr] gap-4 md:grid-cols-[110px_1fr] md:gap-6">
        <PortraitMount
          src={photo}
          alt={displayName}
          onClick={photo ? () => onExpand(photo) : undefined}
        />

        <div className="min-w-0">
          <Field
            label="Player name"
            value={value}
            onChange={onChange}
            onBlur={() => onBlur(value)}
            placeholder={placeholder}
            name={`player-${playerKey}`}
            autoComplete="off"
          />

          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5">
            <dt className="type-kicker self-center text-ink-400">Role</dt>
            <dd className="type-data truncate text-ink-900">{m.role ?? "Player"}</dd>
            <dt className="type-kicker self-center text-ink-400">Side</dt>
            <dd className="type-data text-ink-900">{sideText}</dd>
          </dl>

          <WorkloadGauge workload={normWorkload(m.workload)} className="mt-5" />
        </div>
      </div>

      {/* signature: the court print spans the full plate width below */}
      <div className="mt-7 border-t border-line pt-6">
        <CourtPrint
          side={m.side ?? playerKey}
          coverage={coverage}
          lateral={m.lateral_balance_pct}
          distanceM={m.total_distance_m}
          size={380}
          className="max-w-full"
        />
      </div>
    </CornerTicks>
  );
}
