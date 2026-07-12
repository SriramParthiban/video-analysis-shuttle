'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import HaneMark from '@/components/hane/HaneMark';
import SectionHeader from '@/components/hane/SectionHeader';
import CoachSummary from '@/components/hane/CoachSummary';
import CalibrationStrip from '@/components/hane/CalibrationStrip';
import CalibrateModal from '@/components/hane/CalibrateModal';
import PlayerPlate from '@/components/hane/PlayerPlate';
import FindingRow from '@/components/hane/FindingRow';
import FailedState from '@/components/hane/FailedState';
import Lightbox from '@/components/hane/Lightbox';
import RallyLoader from '@/components/hane/RallyLoader';
import MatchMap, { type MatchPlayer } from '@/components/hane/MatchMap';
import { ArrowLeft } from '@/components/hane/icons';

type PlayerMetrics = {
  label?: string;
  role?: string;
  side?: string;
  workload?: string;
  thumb_path?: string;
  court_coverage_pct?: { front: number; mid: number; rear: number };
  // The worker also emits these two; the previous type omitted them. Read them
  // optionally and feed CourtPrint (lateral weight bar + tramline distance),
  // degrading gracefully when absent.
  lateral_balance_pct?: { left: number; right: number };
  total_distance_m?: number;
};

type Analysis = {
  id: string;
  status: string;
  summary: string | null;
  metrics: { players?: Record<string, PlayerMetrics>; court_calibrated?: boolean } | null;
  player_names: Record<string, string> | null;
};

type Finding = {
  id: string;
  category: string;
  kind: string;
  title: string;
  detail: string | null;
  // severity is the query's existing sort key; surfaced here so the SeverityGauge
  // (brief-required on every FindingRow) can render its filled-tick count.
  severity: number | null;
};

type VideoRow = {
  court_corners: number[][] | null;
  original_filename: string | null;
  duration_seconds: number | null;
  created_at: string | null;
};

const CONTAINER = 'mx-auto w-full max-w-300 px-5 md:px-18';

export default function AnalysisPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const [supabase] = useState(() => createClient());
  const [videoStatus, setVideoStatus] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const [videoRow, setVideoRow] = useState<VideoRow | null>(null);
  const [refFrameUrl, setRefFrameUrl] = useState<string | null>(null);
  const [showCalibrator, setShowCalibrator] = useState(false);
  const initedFor = useRef<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: video } = await supabase
      .from('videos')
      .select('status, reference_frame_path, court_corners, original_filename, duration_seconds, created_at')
      .eq('id', videoId).single();
    if (video) {
      setVideoStatus(video.status);
      setVideoRow({
        court_corners: (video.court_corners as number[][] | null) ?? null,
        original_filename: (video.original_filename as string | null) ?? null,
        duration_seconds: (video.duration_seconds as number | null) ?? null,
        created_at: (video.created_at as string | null) ?? null,
      });
      if (video.reference_frame_path) {
        const { data: s } = await supabase.storage
          .from('videos').createSignedUrl(video.reference_frame_path as string, 3600);
        setRefFrameUrl(s?.signedUrl ?? null);
      }
    }

    const { data: a } = await supabase
      .from('analyses')
      .select('id, status, summary, metrics, player_names')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setAnalysis(a as Analysis | null);

    if (a) {
      const { data: f } = await supabase
        .from('findings')
        .select('id, category, kind, title, detail, severity')
        .eq('analysis_id', a.id)
        .order('severity', { ascending: false });
      setFindings((f as Finding[]) ?? []);

      // Signed URLs for the player ID-photos (private bucket).
      const players = (a.metrics as { players?: Record<string, PlayerMetrics> } | null)
        ?.players ?? {};
      const paths = Object.values(players)
        .map((p) => p.thumb_path)
        .filter((x): x is string => Boolean(x));
      if (paths.length) {
        const { data: signed } = await supabase.storage
          .from('videos').createSignedUrls(paths, 3600);
        const map: Record<string, string> = {};
        (signed ?? []).forEach((s) => {
          if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
        });
        setThumbUrls(map);
      }
    }
    setLoading(false);
  }, [supabase, videoId]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`analysis-${videoId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'videos', filter: `id=eq.${videoId}` },
        () => fetchAll())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'analyses', filter: `video_id=eq.${videoId}` },
        () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, videoId, fetchAll]);

  // Seed the name boxes from saved names once per analysis (don't clobber edits).
  useEffect(() => {
    if (analysis && initedFor.current !== analysis.id) {
      initedFor.current = analysis.id;
      setNames(analysis.player_names ?? {});
    }
  }, [analysis]);

  const playerEntries = Object.entries(analysis?.metrics?.players ?? {});

  const nameFor = (key: string, label?: string) =>
    (names[key]?.trim() || label || 'Player');

  // Replace "Player N" with the coach's chosen name throughout the report text.
  const rewrite = (text: string) => {
    let out = text;
    for (const [key, m] of playerEntries) {
      const nm = names[key]?.trim();
      if (nm && m.label) out = out.split(m.label).join(nm);
    }
    return out;
  };

  async function saveName(key: string, value: string) {
    if (!analysis) return;
    const merged = { ...names, [key]: value };
    setNames(merged);
    await supabase.from('analyses').update({ player_names: merged }).eq('id', analysis.id);
  }

  async function saveCorners(corners: number[][]) {
    await supabase.from('videos')
      .update({ court_corners: corners, status: 'uploaded' })
      .eq('id', videoId);
    setShowCalibrator(false);
  }

  // Re-queue a failed clip via the app's existing re-analysis idiom (status →
  // 'uploaded', exactly as saveCorners does). The realtime videos subscription
  // then flips the view back into the RallyLoader state.
  async function retry() {
    await supabase.from('videos').update({ status: 'uploaded' }).eq('id', videoId);
  }

  const inProgress =
    ['uploaded', 'queued', 'processing'].includes(videoStatus) ||
    analysis?.status === 'processing';

  const calibrated = Boolean(analysis?.metrics?.court_calibrated);
  const clipName = videoRow?.original_filename ?? 'Untitled clip';

  const dateStr = videoRow?.created_at
    ? new Date(videoRow.created_at)
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        .toUpperCase()
    : '';
  const durationStr = fmtDuration(videoRow?.duration_seconds);
  const playersStr = playerEntries.length
    ? `${playerEntries.length} PLAYER${playerEntries.length === 1 ? '' : 'S'}`
    : '';
  const headMeta = [dateStr, durationStr, playersStr].filter(Boolean).join('   ·   ');
  const verdictMeta = [playersStr, durationStr, dateStr].filter(Boolean).join('   ·   ');

  const matchPlayers: MatchPlayer[] = playerEntries.slice(0, 2).map(([key, m]) => ({
    side: m.side ?? key,
    coverage: m.court_coverage_pct ?? { front: 0, mid: 0, rear: 0 },
    lateral: m.lateral_balance_pct,
    distanceM: m.total_distance_m,
    label: nameFor(key, m.label),
  }));

  return (
    <main className="flex-1 pb-24">
      {/* top bar — back to the ledger + wordmark */}
      <div className={`${CONTAINER} flex items-center justify-between border-b border-line py-4`}>
        <Link
          href="/dashboard"
          className="type-kicker inline-flex items-center gap-2 text-ink-600 transition-colors hover:text-ink-900"
        >
          <ArrowLeft size={15} aria-hidden />
          Back
        </Link>
        <HaneMark size={20} />
      </div>

      {loading ? (
        <RallyLoader label="LOADING · READING REPORT" />
      ) : inProgress || !analysis ? (
        <RallyLoader />
      ) : analysis.status === 'failed' ? (
        <div className={`${CONTAINER} pt-12`}>
          <FailedState onRetry={retry} />
        </div>
      ) : (
        <>
          {/* 1 — report masthead strip */}
          <header className={`${CONTAINER} pt-12 pb-8`}>
            <div className="type-kicker text-ink-400">Match report</div>
            <h1 className="type-display-l mt-3 wrap-anywhere text-ink-900">
              {clipName}
            </h1>
            {headMeta && <div className="type-micro mt-4 text-ink-400">{headMeta}</div>}
          </header>

          {/* 2 — calibration strip */}
          <div className={CONTAINER}>
            <CalibrationStrip
              calibrated={calibrated}
              onCalibrate={() => setShowCalibrator(true)}
              show={Boolean(refFrameUrl)}
            />
          </div>

          {/* 3 — the verdict pull-quote */}
          <section className={`${CONTAINER} pt-12`}>
            <div className="type-kicker mb-5 text-ink-400">Coach&rsquo;s verdict</div>
            <CoachSummary
              text={analysis.summary ? rewrite(analysis.summary) : 'No summary produced.'}
              meta={verdictMeta || undefined}
            />
          </section>

          {/* 4 — full-bleed SUMI match-map band (the screenshot payoff) */}
          {matchPlayers.length > 0 && (
            <section className="grain-sumi mt-16 bg-sumi py-14 md:py-20">
              <div className={CONTAINER}>
                <div className="type-kicker text-volt">Match map</div>
                <p className="type-body-sm mt-2 max-w-[52ch] text-ink-d-600">
                  The whole match on one court — each player&rsquo;s coverage heat and
                  movement fingerprint.
                </p>
                <div className="mx-auto mt-8 w-full max-w-105 md:max-w-120">
                  <MatchMap players={matchPlayers} />
                </div>
              </div>
            </section>
          )}

          {/* 5 — player plates (2-up desktop / 1-up phone) */}
          {playerEntries.length > 0 && (
            <section className={`${CONTAINER} pt-16`}>
              <SectionHeader kicker="On court" title="Players" count={playerEntries.length} />
              <p className="type-body-sm mt-3 text-ink-400">
                Tap a name to identify each athlete — it threads through the whole report.
              </p>
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {playerEntries.map(([key, m]) => (
                  <PlayerPlate
                    key={key}
                    m={m}
                    playerKey={key}
                    displayName={nameFor(key, m.label)}
                    photo={m.thumb_path ? thumbUrls[m.thumb_path] : undefined}
                    value={names[key] ?? ''}
                    placeholder={m.label ?? 'Player'}
                    onChange={(v) => setNames({ ...names, [key]: v })}
                    onBlur={(v) => saveName(key, v)}
                    onExpand={setZoom}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 6 — what to work on (findings, severity-desc from the query) */}
          <section className={`${CONTAINER} pt-16`}>
            <SectionHeader kicker="Coaching focus" title="What to work on" count={findings.length} />
            {findings.length > 0 ? (
              <div className="mt-6 border-b border-line">
                {findings.map((f, i) => (
                  <FindingRow
                    key={f.id}
                    index={i + 1}
                    kind={f.kind}
                    category={f.category}
                    severity={f.severity ?? 3}
                    title={rewrite(f.title)}
                    detail={f.detail ? rewrite(f.detail) : null}
                  />
                ))}
              </div>
            ) : (
              <p className="type-body mt-6 text-ink-400">No specific findings recorded.</p>
            )}
          </section>
        </>
      )}

      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}

      {showCalibrator && refFrameUrl && (
        <CalibrateModal
          imageUrl={refFrameUrl}
          initial={videoRow?.court_corners ?? null}
          onSave={saveCorners}
          onClose={() => setShowCalibrator(false)}
        />
      )}
    </main>
  );
}

function fmtDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = String(s % 60).padStart(2, '0');
  return `${m}:${rem}`;
}
