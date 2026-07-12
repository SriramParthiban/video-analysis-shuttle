import { redirect } from 'next/navigation';

// Login is disabled for now — go straight to the upload dashboard,
// which creates an anonymous session automatically.
export default function Home() {
  redirect('/dashboard');
}
