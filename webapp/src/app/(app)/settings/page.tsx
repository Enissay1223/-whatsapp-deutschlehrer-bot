'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userAPI, paymentsAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [nativeLang, setNativeLang] = useState('');
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || '');
      setNativeLang(profile.native_language || '');
      setLevel(profile.german_level || '');
      setGoal(profile.learning_goal || '');
    }
  }, [profile]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSaved(false);
    const { error: err } = await supabase.from('user_profiles').update({
      display_name: name,
      native_language: nativeLang,
      german_level: level,
      learning_goal: goal,
      updated_at: new Date().toISOString(),
    }).eq('auth_user_id', user.id);
    if (err) { setError(err.message); } else { setSaved(true); await refreshProfile(); }
    setSaving(false);
    if (!err) setTimeout(() => setSaved(false), 3000);
  };

  const handleUpgrade = async () => {
    try {
      const { url } = await paymentsAPI.createCheckout();
      window.location.href = url;
    } catch {
      setError('Fehler beim Erstellen der Checkout-Session.');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Einstellungen</h1>

      {/* Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Profil</h2>

        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}
        {saved && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">Profil gespeichert!</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input type="email" value={user?.email || ''} disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Muttersprache</label>
            <select value={nativeLang} onChange={(e) => setNativeLang(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900">
              <option value="">Waehle...</option>
              {['Arabisch', 'Tuerkisch', 'Englisch', 'Franzoesisch', 'Spanisch', 'Russisch', 'Andere'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deutsch-Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lernziel</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900">
              <option value="">Waehle...</option>
              {['Studium in Deutschland', 'Arbeit & Karriere', 'Reisen', 'Persoenliches Interesse', 'Pruefungsvorbereitung', 'Andere'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <button onClick={saveSettings} disabled={saving}
            className="bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-700 disabled:bg-gray-400">
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Abonnement</h2>

        {profile?.subscription_tier === 'premium' ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-purple-100 text-purple-700 text-sm font-semibold px-3 py-1 rounded-full">Premium</span>
              <span className="text-sm text-green-600 font-medium">Aktiv</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Du hast Zugang zu allen Features und unbegrenzten Nachrichten.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">Free</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Dein aktueller Plan: Free (10 Nachrichten/Tag)</p>
            <p className="text-sm text-gray-500 mb-4">Mit Premium bekommst du:</p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ Unbegrenzte Nachrichten</li>
              <li>✓ Alle Lektionen (A1–C2)</li>
              <li>✓ Personalisierte Uebungen</li>
              <li>✓ Woechentliche Reports</li>
            </ul>
            <button onClick={handleUpgrade}
              className="bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-700">
              Auf Premium upgraden — 9,99 &euro;/Monat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
