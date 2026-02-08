'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase client automatically picks up tokens from URL hash fragments
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        if (!session?.user) {
          // Wait a moment for Supabase to process the hash fragments
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();

          if (!retrySession?.user) {
            setError('Keine Sitzung gefunden. Bitte melde dich erneut an.');
            setTimeout(() => router.push('/login'), 2000);
            return;
          }

          // Check if user has a profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('auth_user_id', retrySession.user.id)
            .single();

          if (profile) {
            router.push('/dashboard');
          } else {
            router.push('/onboarding');
          }
          return;
        }

        // Check if user has a profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();

        if (profile) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } catch (e) {
        console.error('Callback error:', e);
        setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        ) : (
          <>
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Anmeldung wird verarbeitet...</p>
          </>
        )}
      </div>
    </div>
  );
}
