'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg(
            'Account created. Confirm your email — or disable "Confirm email" in ' +
              'Supabase → Authentication → Providers for quick testing.',
          );
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl">🏸</div>
          <h1 className="mt-2 text-2xl font-bold">Badminton Analysis</h1>
          <p className="text-zinc-400">
            {mode === 'signin' ? 'Coach sign in' : 'Create a coach account'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 outline-none focus:border-blue-500"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 outline-none focus:border-blue-500"
            placeholder="Email"
            type="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 outline-none focus:border-blue-500"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        {msg && <p className="mt-4 text-center text-sm text-amber-400">{msg}</p>}

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-6 w-full text-center text-sm text-blue-400 hover:underline"
        >
          {mode === 'signin'
            ? 'No account? Create one'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  );
}
