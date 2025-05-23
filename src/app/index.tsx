import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Wait for session to load
    if (session) {
      router.push('/dashboard'); // Redirect to dashboard if logged in
    } else {
      router.push('/auth/login'); // Redirect to login if not logged in
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p>Redirecting...</p>
    </div>
  );
}