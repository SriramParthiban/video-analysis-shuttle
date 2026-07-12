import { createBrowserClient } from '@supabase/ssr';

// Browser (client component) Supabase client. Reads the session from cookies,
// kept in sync with the server by proxy.ts.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
