'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { lessonsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Lesson {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  lesson_type: string;
  is_premium: boolean;
  view_count: number;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-green-100 text-green-700',
  A2: 'bg-blue-100 text-blue-700',
  B1: 'bg-yellow-100 text-yellow-800',
  B2: 'bg-orange-100 text-orange-700',
  C1: 'bg-purple-100 text-purple-700',
  C2: 'bg-gray-200 text-gray-700',
};

const LEVELS = ['Alle', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState('Alle');
  const { profile } = useAuth();

  useEffect(() => {
    fetchLessons();
  }, [activeLevel]);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const level = activeLevel === 'Alle' ? undefined : activeLevel;
      const data = await lessonsAPI.getLessons(level);
      setLessons(Array.isArray(data) ? data : data.lessons || []);
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setLessons([]);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Lektionen</h1>

      {/* Level Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {LEVELS.map((lv) => (
          <button key={lv} onClick={() => setActiveLevel(lv)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeLevel === lv ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {lv}
          </button>
        ))}
      </div>

      {/* Lessons Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-16 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">📚</p>
          <p>Keine Lektionen fuer dieses Level gefunden.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessons.map((lesson) => (
            <Link key={lesson.id} href={`/lessons/${lesson.id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition group">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${LEVEL_COLORS[lesson.level] || 'bg-gray-100 text-gray-600'}`}>
                  {lesson.level}
                </span>
                {lesson.category && <span className="text-xs text-gray-500">{lesson.category}</span>}
                {lesson.is_premium && profile?.subscription_tier !== 'premium' && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded ml-auto">🔒 Premium</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-800 group-hover:text-primary-600 mb-1">{lesson.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{lesson.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
