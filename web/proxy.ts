import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/proxy';

// Next.js 16 proxy (formerly middleware). Runs on every matched request to keep
// the Supabase session fresh and gate protected routes.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets & images.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
