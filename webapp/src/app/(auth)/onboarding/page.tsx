'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { paymentsAPI } from '@/lib/api';

const LEVELS = [
  { value: 'A1', label: 'A1 — Anfaenger', desc: 'Erste Woerter und Saetze' },
  { value: 'A2', label: 'A2 — Grundlagen', desc: 'Einfache Gespraeche' },
  { value: 'B1', label: 'B1 — Mittelstufe', desc: 'Alltag meistern' },
  { value: 'B2', label: 'B2 — Gute Kenntnisse', desc: 'Komplexe Themen' },
  { value: 'C1', label: 'C1 — Fortgeschritten', desc: 'Fast fliessend' },
  { value: 'C2', label: 'C2 — Experte', desc: 'Nahezu muttersprachlich' },
];

const GOALS = [
  'Studium in Deutschland', 'Arbeit & Karriere', 'Reisen',
  'Persoenliches Interesse', 'Pruefungsvorbereitung', 'Andere',
];

const LANGUAGES = ['Arabisch', 'Tuerkisch', 'Englisch', 'Franzoesisch', 'Spanisch', 'Russisch', 'Andere'];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nativeLang, setNativeLang] = useState('');
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user, refreshProfile } = useAuth();
  const router = useRouter();

  const canNext = () => {
    if (step === 1) return name.trim().length > 0 && nativeLang.length > 0;
    if (step === 2) return level.length > 0;
    if (step === 3) return goal.length > 0;
    return true;
  };

  const saveProfile = async (tier: string) => {
    if (!user) {
      setError('Du bist nicht eingeloggt. Bitte melde dich zuerst an.');
      return;
    }
    setSaving(true);
    setError('');

    const profileData = {
      auth_user_id: user.id,
      display_name: name,
      native_language: nativeLang,
      german_level: level,
      learning_goal: goal,
      subscription_tier: tier,
      registration_source: 'webapp',
      preferred_language: 'de',
      daily_message_limit: tier === 'premium' ? 999999 : 10,
      registration_completed: true,
    };

    try {
      // First check if profile already exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      let saveError;
      if (existing) {
        // Update existing profile
        const { error: updateErr } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('auth_user_id', user.id);
        saveError = updateErr;
      } else {
        // Insert new profile
        const { error: insertErr } = await supabase
          .from('user_profiles')
          .insert(profileData);
        saveError = insertErr;
      }

      if (saveError) {
        console.error('Supabase save error:', saveError);
        setError(`Profil konnte nicht gespeichert werden: ${saveError.message}`);
        setSaving(false);
        return;
      }

      await refreshProfile();

      if (tier === 'premium') {
        try {
          const { url } = await paymentsAPI.createCheckout();
          if (url) {
            window.location.href = url;
            return;
          }
        } catch (e) {
          console.error('Checkout error:', e);
        }
      }
      router.push('/dashboard');
    } catch (e) {
      console.error('Save profile error:', e);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s < step ? 'bg-green-500' : s === step ? 'bg-primary-600' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-6">Schritt {step} von 4</p>

        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-800">Persoenliche Daten</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wie heisst du?</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900" placeholder="Dein Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Was ist deine Muttersprache?</label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((l) => (
                  <button key={l} onClick={() => setNativeLang(l)}
                    className={`py-2 px-3 rounded-lg border text-sm ${nativeLang === l ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-800">Dein Deutsch-Level</h2>
            <p className="text-sm text-gray-600">Wie gut ist dein Deutsch?</p>
            <div className="grid grid-cols-2 gap-3">
              {LEVELS.map((l) => (
                <button key={l.value} onClick={() => setLevel(l.value)}
                  className={`p-4 rounded-lg border text-left ${level === l.value ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <span className="font-semibold text-gray-800">{l.label}</span>
                  <p className="text-xs text-gray-500 mt-1">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-800">Dein Lernziel</h2>
            <p className="text-sm text-gray-600">Warum lernst du Deutsch?</p>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button key={g} onClick={() => setGoal(g)}
                  className={`p-4 rounded-lg border text-left text-sm ${goal === g ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200 font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-800">Plan waehlen</h2>
            <p className="text-sm text-gray-600">Starte kostenlos oder probiere Premium aus.</p>
            <div className="space-y-4">
              <div className="p-5 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Free — 0 &euro;/Monat</h3>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>✓ 10 Nachrichten pro Tag</li>
                  <li>✓ A1–A2 Lektionen</li>
                </ul>
                <button onClick={() => saveProfile('free')} disabled={saving}
                  className="mt-4 w-full border border-primary-600 text-primary-600 font-semibold py-2.5 rounded-lg hover:bg-primary-50 disabled:opacity-50">
                  Kostenlos starten
                </button>
              </div>
              <div className="p-5 rounded-lg border-2 border-primary-600 bg-primary-50/30">
                <h3 className="font-semibold text-gray-800">Premium — 9,99 &euro;/Monat</h3>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>✓ Unbegrenzte Nachrichten</li>
                  <li>✓ Alle Lektionen (A1–C2)</li>
                  <li>✓ Personalisierte Uebungen</li>
                  <li>✓ 7 Tage kostenlos testen</li>
                </ul>
                <button onClick={() => saveProfile('premium')} disabled={saving}
                  className="mt-4 w-full bg-primary-600 text-white font-semibold py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  Premium testen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="text-gray-600 hover:text-gray-800 text-sm font-medium">Zurueck</button>
            ) : <div />}
            <button onClick={() => setStep(step + 1)} disabled={!canNext()}
              className="bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
              Weiter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
