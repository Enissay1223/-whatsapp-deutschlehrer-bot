'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/lessons', label: 'Lektionen', icon: '📚' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/settings', label: 'Einstellungen', icon: '⚙️' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Laden...</p></div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const Sidebar = ({ mobile }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-white ${mobile ? '' : 'border-r border-gray-200'}`}>
      <div className="p-5 border-b border-gray-100">
        <span className="text-lg font-bold text-primary-600">Deutschlehrer</span>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              pathname === item.href ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            <span>{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-700">
            {(profile?.display_name || user.email)?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{profile?.display_name || 'User'}</p>
            <p className="text-xs text-gray-500">{profile?.german_level || '—'} · {profile?.subscription_tier === 'premium' ? 'Premium' : 'Free'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg">Abmelden</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-60 fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64"><Sidebar mobile /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-60">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 h-14 flex items-center">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 mr-3 text-xl">☰</button>
          <span className="font-bold text-primary-600">Deutschlehrer</span>
        </div>
        <main className="p-4 md:p-8 max-w-5xl">{children}</main>
      </div>
    </div>
  );
}
