'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile } = useAuth();

  const stats = [
    { label: 'XP Punkte', value: profile?.experience_points || 0, icon: '⭐' },
    { label: 'Level', value: profile?.current_level || 1, icon: '🏆' },
    { label: 'Streak', value: `${profile?.streak_days || 0} Tage`, icon: '🔥' },
    { label: 'Deutsch-Level', value: profile?.german_level || '—', icon: '🇩🇪' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Willkommen zurueck{profile?.display_name ? `, ${profile.display_name}` : ''}!
      </h1>
      <p className="text-gray-500 text-sm mb-8">Hier ist deine Uebersicht.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Link href="/chat" className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">💬</div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-primary-600">Chat starten</h3>
              <p className="text-sm text-gray-500">Schreib etwas auf Deutsch und bekomme Korrekturen.</p>
            </div>
          </div>
        </Link>
        <Link href="/lessons" className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">📚</div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-green-600">Lektionen entdecken</h3>
              <p className="text-sm text-gray-500">Grammatik, Vokabeln und mehr fuer dein Level.</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Tier info */}
      {profile?.subscription_tier !== 'premium' && (
        <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="font-semibold text-lg mb-2">Upgrade auf Premium</h3>
          <p className="text-primary-100 text-sm mb-4">
            Unbegrenzte Nachrichten, alle Lektionen und personalisierte Uebungen.
          </p>
          <Link href="/settings" className="inline-block bg-white text-primary-700 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-gray-100">
            Jetzt upgraden
          </Link>
        </div>
      )}
    </div>
  );
}
