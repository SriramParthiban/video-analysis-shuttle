'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { compressVideo } from '@/lib/compressVideo';
import Masthead from '@/components/hane/Masthead';
import SectionHeader from '@/components/hane/SectionHeader';
import UploadCourt from '@/components/hane/UploadCourt';
import ClipLedger from '@/components/hane/ClipLedger';

type VideoRow = {
  id: string;
  original_filename: string | null;
  status: string;
  created_at: string;
};

export default function Dashboard() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [authError, setAuthError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase
      .from('videos')
      .select('id, original_filename, status, created_at')
      .order('created_at', { ascending: false });
    setVideos((data as VideoRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  // Ensure a session exists (anonymous) — no login screen.
  useEffect(() => {
    (async () => {
      let {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          setAuthError(error.message);
          setLoading(false);
          return;
        }
        user = data.user;
      }

      setUserId(user?.id ?? null);
      fetchVideos();
    })();
  }, [supabase, fetchVideos]);

  // Live status updates as the worker processes each clip.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('dash-videos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos', filter: `coach_id=eq.${userId}` },
        () => fetchVideos(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, fetchVideos]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;

    setUploading(true);
    try {
      // Downscale large clips in the browser before uploading.
      setUploadMsg('Preparing video…');
      const { file: toUpload, compressed } = await compressVideo(file, (r) =>
        setUploadMsg(`Compressing video… ${Math.round(r * 100)}%`),
      );

      const sizeMb = (toUpload.size / (1024 * 1024)).toFixed(1);
      setUploadMsg(`Uploading ${sizeMb} MB${compressed ? ' (compressed)' : ''}…`);

      const ext = (toUpload.name.split('.').pop() || 'mp4').toLowerCase();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('videos')
        .upload(path, toUpload, { contentType: toUpload.type || 'video/mp4' });
      if (upErr) throw upErr;

      setUploadMsg('Queuing for analysis…');
      const { error: insErr } = await supabase.from('videos').insert({
        coach_id: userId,
        storage_path: path,
        original_filename: file.name,
        status: 'uploaded',
      });
      if (insErr) throw insErr;

      setUploadMsg('');
      fetchVideos();
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  // Presentational-only: opens the SAME hidden input; derived telemetry readouts.
  const onPick = useCallback(() => fileInput.current?.click(), []);
  const counts = useMemo(
    () => ({
      total: videos.length,
      processing: videos.filter((v) =>
        v.status === 'uploaded' || v.status === 'queued' || v.status === 'processing',
      ).length,
      done: videos.filter((v) => v.status === 'done').length,
    }),
    [videos],
  );
  const pad2 = (n: number) => String(n).padStart(2, '0');

  if (authError) {
    return (
      <>
        <Masthead variant="paper" />
        <main className="mx-auto w-full max-w-170 flex-1 px-5 py-16 md:px-8">
          <div className="type-kicker text-weak-deep">SESSION NOT STARTED</div>
          <h1 className="type-h1 mt-3 text-ink-900">Anonymous sign-in is off</h1>
          <div className="mt-4 rounded-sm border-l-2 border-weak bg-paper-raised px-5 py-4">
            <p className="type-body-sm text-weak-deep">{authError}</p>
          </div>
          <p className="type-body-sm mt-5 text-ink-600">
            Enable it in Supabase → <b className="text-ink-900">Authentication → Sign In / Providers</b> →
            turn on <b className="text-ink-900">Allow anonymous sign-ins</b>, then reload this page.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Masthead
        variant="paper"
        right={
          <>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`h-1.5 w-1.5 ${userId ? 'bg-volt' : 'bg-line'}`} />
              {userId ? 'LIVE' : 'OFFLINE'}
            </span>
            <span aria-hidden className="h-3 w-px bg-line" />
            <span>SESSION {userId ? userId.slice(0, 8).toUpperCase() : '—'}</span>
          </>
        }
      />

      <main className="mx-auto w-full max-w-300 flex-1 px-5 py-8 md:px-18 md:py-12">
        {/* the hidden input — the ONE upload entry point; onFile flow unchanged */}
        <input ref={fileInput} type="file" accept="video/*" className="hidden" onChange={onFile} />

        <UploadCourt onPick={onPick} uploading={uploading} message={uploadMsg} disabled={!userId} />

        {/* optional mono account readouts (derived from existing videos state) */}
        <div className="type-micro mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 text-ink-400">
          <span>
            CLIPS <span className="tnum text-ink-900">{pad2(counts.total)}</span>
          </span>
          <span aria-hidden className="h-3 w-px bg-line" />
          <span>
            PROCESSING <span className="tnum text-ink-900">{pad2(counts.processing)}</span>
          </span>
          <span aria-hidden className="h-3 w-px bg-line" />
          <span>
            DONE <span className="tnum text-ink-900">{pad2(counts.done)}</span>
          </span>
        </div>

        <div className="mt-16">
          <SectionHeader kicker="INSTRUMENT BAY" title="Clip Ledger" count={videos.length} />
          <div className="mt-5">
            <ClipLedger videos={videos} loading={loading} />
          </div>
        </div>
      </main>
    </>
  );
}
