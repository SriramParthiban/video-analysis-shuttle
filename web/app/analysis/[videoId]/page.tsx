'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type PlayerMetrics = {
  label?: string;
  role?: string;
  side?: string;
  workload?: string;
  thumb_path?: string;
  court_coverage_pct?: { front: number; mid: number; rear: number };
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
};

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
  const [videoRow, setVideoRow] = useState<{ court_corners: number[][] | null } | null>(null);
  const [refFrameUrl, setRefFrameUrl] = useState<string | null>(null);
  const [showCalibrator, setShowCalibrator] = useState(false);
  const initedFor = useRef<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: video } = await supabase
      .from('videos')
      .select('status, reference_frame_path, court_corners')
      .eq('id', videoId).single();
    if (video) {
      setVideoStatus(video.status);
      setVideoRow({ court_corners: (video.court_corners as number[][] | null) ?? null });
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
        .select('id, category, kind, title, detail')
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

  const inProgress =
    ['uploaded', 'queued', 'processing'].includes(videoStatus) ||
    analysis?.status === 'processing';

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-5">
      <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">← Back</Link>

      {loading ? (
        <p className="mt-10 text-center text-zinc-500">Loading…</p>
      ) : inProgress || !analysis ? (
        <div className="mt-16 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-blue-500" />
          <p className="mt-4 font-semibold">Analyzing match…</p>
          <p className="mt-1 text-sm text-zinc-500">Detecting players and reading their movement. Updates live.</p>
        </div>
      ) : analysis.status === 'failed' ? (
        <p className="mt-16 text-center font-semibold text-red-400">
          Analysis failed — check the worker logs and try re-uploading.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <span className="text-xs">
              {analysis.metrics?.court_calibrated ? (
                <span className="text-green-400">✓ Court-calibrated — zones &amp; left/right are accurate</span>
              ) : (
                <span className="text-amber-400">⚠ Not calibrated — mark the court for accurate stats</span>
              )}
            </span>
            {refFrameUrl && (
              <button
                onClick={() => setShowCalibrator(true)}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                📐 {videoRow?.court_corners ? 'Re-calibrate' : 'Calibrate court'}
              </button>
            )}
          </div>

          <Section title="Coach summary">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 leading-relaxed">
              {analysis.summary ? rewrite(analysis.summary) : 'No summary produced.'}
            </div>
          </Section>

          {playerEntries.length > 0 && (
            <Section title="Players — tap a name to identify them">
              <div className="space-y-3">
                {playerEntries.map(([key, m]) => (
                  <PlayerCard
                    key={key}
                    m={m}
                    photo={m.thumb_path ? thumbUrls[m.thumb_path] : undefined}
                    value={names[key] ?? ''}
                    placeholder={m.label ?? 'Player'}
                    onChange={(v) => setNames({ ...names, [key]: v })}
                    onBlur={(v) => saveName(key, v)}
                    onExpand={setZoom}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section title="What to work on">
            <div className="space-y-3">
              {findings.map((f) => (
                <div key={f.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{rewrite(f.title)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      f.kind === 'strength' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>{f.kind}</span>
                  </div>
                  {f.detail && (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">{rewrite(f.detail)}</p>
                  )}
                </div>
              ))}
              {findings.length === 0 && (
                <p className="text-sm text-zinc-500">No specific findings recorded.</p>
              )}
            </div>
          </Section>
        </div>
      )}

      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="player" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          <span className="absolute bottom-6 text-xs text-zinc-400">tap anywhere to close</span>
        </div>
      )}

      {showCalibrator && refFrameUrl && (
        <CourtCalibrator
          imageUrl={refFrameUrl}
          initial={videoRow?.court_corners ?? null}
          onSave={saveCorners}
          onClose={() => setShowCalibrator(false)}
        />
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold tracking-widest text-zinc-500">{title.toUpperCase()}</h2>
      {children}
    </section>
  );
}

const sideLabel: Record<string, string> = { bottom: 'Bottom side', top: 'Top side' };

function PlayerCard({
  m, photo, value, placeholder, onChange, onBlur, onExpand,
}: {
  m: PlayerMetrics;
  photo?: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
  onExpand: (url: string) => void;
}) {
  const cov = m.court_coverage_pct ?? { front: 0, mid: 0, rear: 0 };
  return (
    <div className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt="player"
          onClick={() => onExpand(photo)}
          className="h-24 w-16 shrink-0 cursor-pointer rounded-lg object-cover transition hover:opacity-80"
          title="Tap to enlarge"
        />
      ) : (
        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-2xl">🏸</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm font-semibold outline-none focus:border-blue-500"
            placeholder={`Name this player (${placeholder})`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => onBlur(e.target.value)}
          />
          <span className="shrink-0 rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-300">
            {m.role ?? 'Player'}
          </span>
        </div>
        <p className="mb-1 text-[11px] text-zinc-500">
          {sideLabel[m.side ?? ''] ?? ''} · running: <span className="capitalize">{m.workload ?? '—'}</span>
        </p>
        <div className="space-y-1">
          <Bar label="Net" pct={cov.front} color="bg-sky-500" />
          <Bar label="Mid" pct={cov.mid} color="bg-zinc-500" />
          <Bar label="Back" pct={cov.rear} color="bg-amber-500" />
        </div>
      </div>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-8 text-zinc-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-zinc-300">{pct}%</span>
    </div>
  );
}

const CORNER_STEPS = ['NEAR-LEFT', 'NEAR-RIGHT', 'FAR-RIGHT', 'FAR-LEFT'];

function CourtCalibrator({
  imageUrl, initial, onSave, onClose,
}: {
  imageUrl: string;
  initial: number[][] | null;
  onSave: (corners: number[][]) => void;
  onClose: () => void;
}) {
  const [pts, setPts] = useState<number[][]>(
    initial && initial.length === 4 ? initial : [],
  );

  function onImgClick(e: React.MouseEvent<HTMLImageElement>) {
    if (pts.length >= 4) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setPts([...pts, [x, y]]);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4">
      <div className="mb-2 text-center">
        <p className="font-semibold">Mark the 4 court corners</p>
        <p className="text-sm text-amber-300">
          {pts.length < 4
            ? `Tap the ${CORNER_STEPS[pts.length]} corner`
            : 'All 4 set — save to re-analyze'}
        </p>
        <p className="text-[11px] text-zinc-500">
          Order: near-left → near-right → far-right → far-left (the outer court lines)
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="court"
            onClick={onImgClick}
            className="max-h-[68vh] max-w-full cursor-crosshair rounded-lg object-contain"
          />
          {pts.map((p, i) => (
            <div
              key={i}
              className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white ring-2 ring-white"
              style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%` }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={() => setPts([])} className="rounded-lg border border-zinc-600 px-4 py-2 text-sm">Reset</button>
        <button onClick={onClose} className="rounded-lg border border-zinc-600 px-4 py-2 text-sm">Cancel</button>
        <button
          disabled={pts.length !== 4}
          onClick={() => onSave(pts)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Save &amp; re-analyze
        </button>
      </div>
    </div>
  );
}
