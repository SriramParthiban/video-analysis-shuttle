'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { compressVideo } from '@/lib/compressVideo';

type VideoRow = {
  id: string;
  original_filename: string | null;
  status: string;
  created_at: string;
};

const statusStyle: Record<string, string> = {
  uploaded: 'bg-amber-500/20 text-amber-300',
  queued: 'bg-amber-500/20 text-amber-300',
  processing: 'bg-blue-500/20 text-blue-300',
  done: 'bg-green-500/20 text-green-300',
  failed: 'bg-red-500/20 text-red-300',
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

  if (authError) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 p-6 text-center">
        <div className="mt-16 text-5xl">🏸</div>
        <h1 className="mt-3 text-xl font-bold">Almost there</h1>
        <p className="mt-3 text-sm text-amber-400">{authError}</p>
        <p className="mt-4 text-sm text-zinc-400">
          Enable it in Supabase → <b>Authentication → Sign In / Providers</b> →
          turn on <b>Allow anonymous sign-ins</b>, then reload this page.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-5">
      <header className="mb-6 flex items-center gap-2">
        <span className="text-2xl">🏸</span>
        <h1 className="text-xl font-bold">Match Analysis</h1>
      </header>

      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFile}
      />
      <button
        onClick={() => fileInput.current?.click()}
        disabled={uploading || !userId}
        className="mb-2 w-full rounded-xl bg-blue-600 p-4 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : '+ Upload a match clip'}
      </button>
      {uploadMsg && <p className="mb-4 text-center text-sm text-zinc-400">{uploadMsg}</p>}

      <div className="mt-4 space-y-3">
        {loading && <p className="text-center text-zinc-500">Loading…</p>}
        {!loading && videos.length === 0 && (
          <p className="py-10 text-center text-zinc-500">
            No clips yet. Upload a match to get started.
          </p>
        )}
        {videos.map((v) => (
          <Link
            key={v.id}
            href={`/analysis/${v.id}`}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{v.original_filename ?? 'Untitled clip'}</p>
              <p className="text-xs text-zinc-500">
                {new Date(v.created_at).toLocaleString()}
              </p>
            </div>
            <span
              className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                statusStyle[v.status] ?? 'bg-zinc-700 text-zinc-300'
              }`}
            >
              {v.status}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
