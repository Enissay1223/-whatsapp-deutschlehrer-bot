'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { lessonsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  level: string;
  category: string;
  is_premium: boolean;
}

export default function LessonDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      lessonsAPI.getLesson(id as string)
        .then((data) => setLesson(data))
        .catch(() => setLesson(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Laden...</p></div>;
  }

  if (!lesson) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-gray-600 mb-4">Lektion nicht gefunden.</p>
        <Link href="/lessons" className="text-primary-600 hover:underline">Zurueck zu Lektionen</Link>
      </div>
    );
  }

  const isPremiumLocked = lesson.is_premium && profile?.subscription_tier !== 'premium';

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        ← Zurueck
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-semibold bg-primary-100 text-primary-700 px-3 py-1 rounded">{lesson.level}</span>
          {lesson.category && <span className="text-sm text-gray-500">{lesson.category}</span>}
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">{lesson.title}</h1>
        <p className="text-gray-600 mb-6">{lesson.description}</p>

        {isPremiumLocked ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <span className="text-3xl block mb-3">🔒</span>
            <h3 className="font-semibold text-gray-800 mb-2">Premium Lektion</h3>
            <p className="text-sm text-gray-600 mb-4">Diese Lektion ist nur fuer Premium-Mitglieder verfuegbar.</p>
            <Link href="/settings" className="inline-block bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-700">
              Auf Premium upgraden
            </Link>
          </div>
        ) : (
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{lesson.content}</div>
          </div>
        )}
      </div>
    </div>
  );
}
