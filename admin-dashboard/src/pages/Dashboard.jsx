import { useState, useEffect } from 'react';
import { dashboardAPI } from '../api/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getStats();
      setStats(data);
      setError('');
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Fehler beim Laden der Statistiken');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <StatCard
          title="Gesamt Benutzer"
          value={stats?.totalUsers || 0}
          icon="👥"
          color="bg-blue-500"
        />

        {/* Premium Users */}
        <StatCard
          title="Premium Benutzer"
          value={stats?.premiumUsers || 0}
          icon="⭐"
          color="bg-purple-500"
        />

        {/* Free Users */}
        <StatCard
          title="Kostenlos Benutzer"
          value={stats?.freeUsers || 0}
          icon="🆓"
          color="bg-green-500"
        />

        {/* Total Lessons */}
        <StatCard
          title="Gesamt Lektionen"
          value={stats?.totalLessons || 0}
          icon="📚"
          color="bg-orange-500"
        />
      </div>

      {/* Revenue and New Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Monatlicher Umsatz</h2>
            <span className="text-3xl">💰</span>
          </div>
          <p className="text-4xl font-bold text-green-600">
            €{(stats?.monthlyRevenue || 0).toFixed(2)}
          </p>
          <p className="text-gray-600 mt-2">Aktueller Monat</p>
        </div>

        {/* New Users This Week */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Neue Benutzer</h2>
            <span className="text-3xl">🎉</span>
          </div>
          <p className="text-4xl font-bold text-blue-600">
            {stats?.newUsersThisWeek || 0}
          </p>
          <p className="text-gray-600 mt-2">Diese Woche</p>
        </div>
      </div>
    </div>
  );
}

// StatCard Component
function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <div className={`h-1 ${color} rounded-full mt-4`}></div>
    </div>
  );
}
