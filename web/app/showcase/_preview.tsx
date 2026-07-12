'use client';

// TEMPORARY visual-verification harness (mock data, no Supabase). Safe to delete.
import { useState } from 'react';
import Link from 'next/link';
import Masthead from '@/components/hane/Masthead';
import SectionHeader from '@/components/hane/SectionHeader';
import CoachSummary from '@/components/hane/CoachSummary';
import CalibrationStrip from '@/components/hane/CalibrationStrip';
import PlayerPlate from '@/components/hane/PlayerPlate';
import FindingRow from '@/components/hane/FindingRow';
import MatchMap, { type MatchPlayer } from '@/components/hane/MatchMap';
import UploadCourt from '@/components/hane/UploadCourt';
import ClipLedger from '@/components/hane/ClipLedger';
import HaneMark from '@/components/hane/HaneMark';
import { ArrowLeft } from '@/components/hane/icons';

const CONTAINER = 'mx-auto w-full max-w-300 px-5 md:px-18';

type PM = {
  label: string;
  role: string;
  side: string;
  workload: string;
  thumb_path?: string;
  court_coverage_pct: { front: number; mid: number; rear: number };
  lateral_balance_pct?: { left: number; right: number };
  total_distance_m?: number;
};

const PLAYERS: Record<string, PM> = {
  near: {
    label: 'Player 1',
    role: 'All-court player',
    side: 'bottom',
    workload: 'high',
    court_coverage_pct: { front: 24, mid: 42, rear: 34 },
    lateral_balance_pct: { left: 58, right: 42 },
    total_distance_m: 512,
  },
  far: {
    label: 'Player 2',
    role: 'Back-court player',
    side: 'top',
    workload: 'medium',
    court_coverage_pct: { front: 15, mid: 36, rear: 49 },
    lateral_balance_pct: { left: 47, right: 53 },
    total_distance_m: 604,
  },
};

const NAMES: Record<string, string> = { near: 'Priya N.', far: 'Marcus L.' };

const SUMMARY =
  'Marcus L. anchors the back court — nearly half his movement sits in the rear third — and ' +
  'rarely commits forward, so he is exposed to the drop and the tight net reply. Priya N. does ' +
  'the most running of the two (512 m) and leans hard to her forehand side, which a patient ' +
  'opponent will target all night. Neither player recovers to base quickly after committing to ' +
  'the smash.';

const FINDINGS = [
  {
    id: '1', kind: 'weakness', category: 'footwork', severity: 5,
    title: 'Marcus L. stays too deep',
    detail:
      'He spends almost the whole rally at the back of the court — 49% of his coverage sits in ' +
      'the rear third — and rarely moves up. Opponents can pull him forward with drops and net ' +
      'play he will not reach in time. Work on: reading the drop earlier and a faster first step forward.',
  },
  {
    id: '2', kind: 'weakness', category: 'workload', severity: 4,
    title: 'Priya N. is carrying the running',
    detail:
      '512 m at a high workload, spread across all three zones — usually a sign of being moved ' +
      'around the court. Real risk of fading in long third games. Work on: tighter base ' +
      'positioning and quicker recovery between shots.',
  },
  {
    id: '3', kind: 'weakness', category: 'defense', severity: 3,
    title: 'Slow recovery after the smash',
    detail:
      'Both players are late returning to base once they commit to an attack, leaving the ' +
      'mid-court open for the counter. Work on: the split-step and recovery footwork immediately ' +
      'after the smash.',
  },
  {
    id: '4', kind: 'strength', category: 'consistency', severity: 2,
    title: 'Marcus L. splits the court evenly',
    detail:
      'His left-right balance is almost dead even (47 / 53), so there is no obvious side to ' +
      'exploit with flat pushes — a genuine platform to build on.',
  },
];

export function ReportPreview() {
  const [names, setNames] = useState(NAMES);
  const entries = Object.entries(PLAYERS);

  const matchPlayers: MatchPlayer[] = entries.slice(0, 2).map(([key, m]) => ({
    side: m.side,
    coverage: m.court_coverage_pct,
    lateral: m.lateral_balance_pct,
    distanceM: m.total_distance_m,
    label: names[key] || m.label,
  }));

  return (
    <main className="flex-1 pb-24">
      <div className={`${CONTAINER} flex items-center justify-between border-b border-line py-4`}>
        <Link href="/dashboard" className="type-kicker inline-flex items-center gap-2 text-ink-600 transition-colors hover:text-ink-900">
          <ArrowLeft size={15} aria-hidden />
          Back
        </Link>
        <HaneMark size={20} />
      </div>

      <header className={`${CONTAINER} pt-12 pb-8`}>
        <div className="type-kicker text-ink-400">Match report</div>
        <h1 className="type-display-l mt-3 wrap-anywhere text-ink-900">county_final_2026_singles.mp4</h1>
        <div className="type-micro mt-4 text-ink-400">12 JUL 2026   ·   4:12   ·   2 PLAYERS</div>
      </header>

      <div className={CONTAINER}>
        <CalibrationStrip calibrated onCalibrate={() => {}} show />
      </div>

      <section className={`${CONTAINER} pt-12`}>
        <div className="type-kicker mb-5 text-ink-400">Coach&rsquo;s verdict</div>
        <CoachSummary text={SUMMARY} meta="2 PLAYERS   ·   4:12   ·   12 JUL 2026" />
      </section>

      <section className="grain-sumi mt-16 bg-sumi py-14 md:py-20">
        <div className={CONTAINER}>
          <div className="type-kicker text-volt">Match map</div>
          <p className="type-body-sm mt-2 max-w-[52ch] text-ink-d-600">
            The whole match on one court — each player&rsquo;s coverage heat and movement fingerprint.
          </p>
          <div className="mx-auto mt-8 w-full max-w-105 md:max-w-120">
            <MatchMap players={matchPlayers} />
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pt-16`}>
        <SectionHeader kicker="On court" title="Players" count={entries.length} />
        <p className="type-body-sm mt-3 text-ink-400">
          Tap a name to identify each athlete — it threads through the whole report.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {entries.map(([key, m]) => (
            <PlayerPlate
              key={key}
              m={m}
              playerKey={key}
              displayName={names[key] || m.label}
              photo={undefined}
              value={names[key] ?? ''}
              placeholder={m.label}
              onChange={(v) => setNames({ ...names, [key]: v })}
              onBlur={() => {}}
              onExpand={() => {}}
            />
          ))}
        </div>
      </section>

      <section className={`${CONTAINER} pt-16`}>
        <SectionHeader kicker="Coaching focus" title="What to work on" count={FINDINGS.length} />
        <div className="mt-6 border-b border-line">
          {FINDINGS.map((f, i) => (
            <FindingRow
              key={f.id}
              index={i + 1}
              kind={f.kind}
              category={f.category}
              severity={f.severity}
              title={f.title}
              detail={f.detail}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

// Fixed timestamps (no Date.now()) so the mock preview hydrates cleanly.
const VIDEOS = [
  { id: 'a', original_filename: 'county_final_2026_singles.mp4', status: 'done', created_at: '2026-07-11T22:17:00Z' },
  { id: 'b', original_filename: 'training_backhand_drills.mov', status: 'processing', created_at: '2026-07-12T19:04:00Z' },
  { id: 'c', original_filename: 'mixed_doubles_setpoint.mp4', status: 'queued', created_at: '2026-07-12T17:41:00Z' },
  { id: 'd', original_filename: 'club_ladder_match_04.mp4', status: 'failed', created_at: '2026-07-10T23:12:00Z' },
  { id: 'e', original_filename: 'quarterfinal_r16_clip.mp4', status: 'done', created_at: '2026-07-08T22:30:00Z' },
];

export function DashboardPreview() {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const counts = {
    total: VIDEOS.length,
    processing: VIDEOS.filter((v) => ['uploaded', 'queued', 'processing'].includes(v.status)).length,
    done: VIDEOS.filter((v) => v.status === 'done').length,
  };
  return (
    <>
      <Masthead
        variant="paper"
        right={
          <>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 bg-volt" />
              LIVE
            </span>
            <span aria-hidden className="h-3 w-px bg-line" />
            <span>SESSION 3F9A2C1B</span>
          </>
        }
      />
      <main className="mx-auto w-full max-w-300 flex-1 px-5 py-8 md:px-18 md:py-12">
        <UploadCourt onPick={() => {}} uploading={false} message="" disabled={false} />
        <div className="type-micro mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 text-ink-400">
          <span>CLIPS <span className="tnum text-ink-900">{pad2(counts.total)}</span></span>
          <span aria-hidden className="h-3 w-px bg-line" />
          <span>PROCESSING <span className="tnum text-ink-900">{pad2(counts.processing)}</span></span>
          <span aria-hidden className="h-3 w-px bg-line" />
          <span>DONE <span className="tnum text-ink-900">{pad2(counts.done)}</span></span>
        </div>
        <div className="mt-16">
          <SectionHeader kicker="INSTRUMENT BAY" title="Clip Ledger" count={VIDEOS.length} />
          <div className="mt-5">
            <ClipLedger videos={VIDEOS} loading={false} />
          </div>
        </div>
      </main>
    </>
  );
}
