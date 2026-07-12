'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import HaneMark from '@/components/hane/HaneMark';
import ShuttleArc from '@/components/hane/ShuttleArc';
import Field from '@/components/hane/Field';
import Button from '@/components/hane/Button';

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

  // Presentation-only derivation from the existing `msg` — the confirm-email
  // note is informational; anything else is an auth error (vermilion).
  const isConfirmNote = !!msg && msg.startsWith('Account created.');
  const authError = msg && !isConfirmNote ? msg : undefined;

  return (
    <main className="grain-sumi flex min-h-dvh w-full flex-col bg-sumi text-ink-d-900 lg:flex-row">
      {/* LEFT 2/3 — the "unboxing": wordmark, self-drawing court, manifesto */}
      <section className="relative flex flex-col justify-between gap-12 border-b border-sumi-line bg-sumi px-6 py-10 sm:px-10 lg:w-2/3 lg:border-b-0 lg:border-r lg:px-16 lg:py-14">
        <div className="flex items-start justify-between gap-6">
          <HaneMark variant="sumi" size={44} />
          <span className="type-kicker mt-2 hidden text-ink-d-400 sm:block">
            Match Analysis
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <ShuttleArc className="max-w-190" />
        </div>

        <div className="max-w-[54ch]">
          <p className="type-kicker text-volt">The coach&rsquo;s instrument</p>
          <p className="type-verdict mt-3 text-ink-d-900">
            A shuttle leaves no wasted motion.{' '}
            <span className="text-ink-d-600">
              Neither does the instrument that reads it.
            </span>
          </p>
        </div>
      </section>

      {/* RIGHT 1/3 — the form, on sumi-raised */}
      <section className="flex flex-col justify-center bg-sumi-raised px-6 py-14 sm:px-10 lg:w-1/3 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <p className="type-kicker text-ink-d-400">Coach access</p>

          {/* signin / signup tab pair (mono) */}
          <div className="mt-5 flex items-stretch gap-7">
            {(['signin', 'signup'] as const).map((m) => {
              const activeTab = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`type-kicker relative pb-2 outline-none transition-colors focus-visible:text-volt ${
                    activeTab ? 'text-volt' : 'text-ink-d-600 hover:text-ink-d-900'
                  }`}
                >
                  {m === 'signin' ? 'Sign in' : 'Sign up'}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-volt transition-transform duration-200 ease-out ${
                      activeTab ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-9 space-y-7">
            {mode === 'signup' && (
              <Field
                variant="sumi"
                label="Full name"
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
              />
            )}
            <Field
              variant="sumi"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={setEmail}
            />
            <Field
              variant="sumi"
              label="Password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={setPassword}
              error={authError}
            />

            {/* solid volt CTA — scan shimmer while submitting */}
            <div className="relative mt-2 overflow-hidden rounded-btn">
              <Button
                as="button"
                type="submit"
                variant="primary"
                disabled={busy}
                className="w-full"
              >
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
              </Button>
              {busy && (
                <span
                  aria-hidden
                  className="anim-scan-sweep pointer-events-none absolute inset-x-0 top-0 h-full"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(24,23,18,0.20), transparent 45%)',
                  }}
                >
                  <span
                    className="block h-0.5 w-full"
                    style={{ background: 'var(--color-volt-ink)', opacity: 0.35 }}
                  />
                </span>
              )}
            </div>
          </form>

          {/* confirm-email note (informational, not an error) */}
          {isConfirmNote && (
            <p className="type-micro mt-6 leading-relaxed text-volt">{msg}</p>
          )}

          <p className="type-micro mt-10 leading-relaxed text-ink-d-400">
            Protected session · Coach access only · By continuing you accept the
            terms of use.
          </p>
        </div>
      </section>
    </main>
  );
}
