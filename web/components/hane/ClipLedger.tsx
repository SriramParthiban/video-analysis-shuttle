"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusGauge from "@/components/hane/StatusGauge";
import CornerTicks from "@/components/hane/CornerTicks";

/**
 * ClipLedger — the clip list rendered as a LEDGER / table (never cards):
 *   columns  ## · FILENAME · UPLOADED · STATUS
 *   ~48px hairline-separated zebra rows, mono right-aligned timestamps,
 *   a StatusGauge per row (replaces the old status pill), each row a Link to
 *   /analysis/[id]. A mono segmented filter (ALL / PROCESSING / DONE / FAILED)
 *   sits above. Empty view = a framed "NO CLIPS INGESTED" well.
 */
type VideoRow = {
  id: string;
  original_filename: string | null;
  status: string;
  created_at: string;
};

type Filter = "ALL" | "PROCESSING" | "DONE" | "FAILED";

type Props = {
  videos: VideoRow[];
  /** true while the initial fetch/auth bootstrap is in flight */
  loading?: boolean;
};

const TABS: Filter[] = ["ALL", "PROCESSING", "DONE", "FAILED"];
const IN_FLIGHT = new Set(["uploaded", "queued", "processing"]);
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// shared grid template so heads + rows + placeholder line up exactly
const COLS =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:grid-cols-[2.75rem_minmax(0,1fr)_8.5rem_auto] items-center gap-3 sm:gap-4";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = pad2(d.getDate());
  const mm = MON[d.getMonth()];
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${dd} ${mm} · ${hh}:${mi}`;
}

function matches(status: string, f: Filter): boolean {
  if (f === "ALL") return true;
  if (f === "PROCESSING") return IN_FLIGHT.has(status);
  if (f === "DONE") return status === "done";
  return status === "failed";
}

export default function ClipLedger({ videos, loading = false }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      ALL: videos.length,
      PROCESSING: videos.filter((v) => IN_FLIGHT.has(v.status)).length,
      DONE: videos.filter((v) => v.status === "done").length,
      FAILED: videos.filter((v) => v.status === "failed").length,
    }),
    [videos],
  );

  const rows = useMemo(() => videos.filter((v) => matches(v.status, filter)), [videos, filter]);

  return (
    <section>
      {/* mono segmented filter */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        {TABS.map((t) => {
          const on = t === filter;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`type-kicker relative pb-1.5 transition-colors ${
                on ? "text-ink-900" : "text-ink-400 hover:text-ink-600"
              }`}
            >
              {t}
              <span className="type-micro ml-1.5 tnum text-ink-400">{pad2(counts[t])}</span>
              <span
                aria-hidden
                className={`absolute -bottom-px left-0 h-[2px] w-full origin-left bg-volt transition-transform duration-200 ${
                  on ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* engraved column heads */}
      <div className={`${COLS} border-b border-line-strong pb-2`}>
        <span className="type-micro uppercase text-ink-400">##</span>
        <span className="type-micro uppercase text-ink-400">Filename</span>
        <span className="type-micro hidden justify-self-end uppercase text-ink-400 sm:block">
          Uploaded
        </span>
        <span className="type-micro justify-self-end uppercase text-ink-400">Status</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16">
          <span className="type-kicker text-ink-400">READING LEDGER</span>
          <span
            aria-hidden
            className="anim-cursor-blink inline-block bg-ink-900"
            style={{ width: 7, height: 14 }}
          />
        </div>
      ) : rows.length === 0 ? (
        <CornerTicks className="mt-6">
          <div className="rounded-sm border border-line bg-paper-sunk px-6 py-16 text-center">
            <div className="type-kicker text-ink-400">
              {videos.length > 0 ? `NO CLIPS · ${filter}` : "NO CLIPS INGESTED"}
            </div>
            <p className="type-body-sm mt-2 text-ink-400">
              {videos.length > 0
                ? "No clips match this view."
                : "Upload a match to begin reading rallies."}
            </p>
          </div>
        </CornerTicks>
      ) : (
        <ul>
          {rows.map((v, i) => (
            <li key={v.id}>
              <Link
                href={`/analysis/${v.id}`}
                className={`group relative ${COLS} min-h-[48px] border-b border-line py-2.5 transition-colors hover:bg-paper-sunk ${
                  i % 2 === 1 ? "bg-paper-sunk" : ""
                }`}
              >
                {/* volt edge-bar on hover — the "row advances in place" affordance */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-[2px] origin-top scale-y-0 bg-volt transition-transform duration-200 group-hover:scale-y-100"
                />
                <span className="type-data tnum text-ink-400">{pad2(i + 1)}</span>
                <span className="type-body-sm min-w-0 truncate text-ink-900">
                  {v.original_filename ?? "Untitled clip"}
                </span>
                <span className="type-micro hidden justify-self-end tnum text-ink-400 sm:block">
                  {fmtDate(v.created_at)}
                </span>
                <StatusGauge status={v.status} className="justify-self-end" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
