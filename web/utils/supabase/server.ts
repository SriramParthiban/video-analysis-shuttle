import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server (server component / route handler) Supabase client.
// Next.js 16: cookies() is async, so this helper must be awaited.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (can't set cookies there).
            // Safe to ignore — proxy.ts refreshes the session cookie instead.
          }
        },
      },
    },
  );
}
