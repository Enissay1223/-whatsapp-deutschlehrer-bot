'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const redirectBasedOnProfile = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', userId)
          .single();
        router.push(profile ? '/dashboard' : '/onboarding');
      } catch {
        router.push('/onboarding');
      }
    };

    const handleCallback = async () => {
      try {
        // 1. Check for PKCE flow (code in query params)
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            console.error('PKCE exchange error:', exchangeErr);
          } else if (data.session?.user) {
            await redirectBasedOnProfile(data.session.user.id);
            return;
          }
        }

        // 2. Check for implicit flow (tokens in hash fragment)
        const hash = window.location.hash.substring(1);
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setErr) {
              console.error('Set session error:', setErr);
            } else if (data.session?.user) {
              await redirectBasedOnProfile(data.session.user.id);
              return;
            }
          }
        }

        // 3. Fallback: session might already exist
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await redirectBasedOnProfile(session.user.id);
          return;
        }

        // 4. Last resort: wait for auth state change event
        let resolved = false;
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (resolved) return;
          if (session?.user) {
            resolved = true;
            subscription.unsubscribe();
            await redirectBasedOnProfile(session.user.id);
          }
        });

        // 5. Timeout after 5 seconds
        setTimeout(() => {
          if (resolved) return;
          resolved = true;
          subscription.unsubscribe();
          console.error('Auth callback timeout - no session detected');
          setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
          setTimeout(() => router.push('/login'), 2000);
        }, 5000);

      } catch (e) {
        console.error('Auth callback error:', e);
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
          <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md">{error}</div>
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
