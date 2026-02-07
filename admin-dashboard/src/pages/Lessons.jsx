import { useState, useEffect } from 'react';
import { lessonsAPI } from '../api/api';

export default function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const data = await lessonsAPI.getAllLessons();
      setLessons(data.lessons || []);
      setError('');
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError('Fehler beim Laden der Lektionen');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (lessonId) => {
    if (!confirm('Möchtest du diese Lektion wirklich löschen?')) return;

    try {
      await lessonsAPI.deleteLesson(lessonId);
      fetchLessons(); // Refresh list
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Fehler beim Löschen der Lektion');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Lektionen-Verwaltung</h1>
        <button
          onClick={() => {
            setEditingLesson(null);
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Neue Lektion
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-600">Laden...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              Keine Lektionen vorhanden
            </div>
          ) : (
            lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onEdit={() => {
                  setEditingLesson(lesson);
                  setShowCreateModal(true);
                }}
                onDelete={() => handleDelete(lesson.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <LessonModal
          lesson={editingLesson}
          onClose={() => {
            setShowCreateModal(false);
            setEditingLesson(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingLesson(null);
            fetchLessons();
          }}
        />
      )}
    </div>
  );
}

// Lesson Card Component
function LessonCard({ lesson, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{lesson.title}</h3>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${
            lesson.is_published
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {lesson.is_published ? 'Veröffentlicht' : 'Entwurf'}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{lesson.content}</p>

      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {lesson.difficulty_level}
        </span>
        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
          {lesson.lesson_type}
        </span>
        {lesson.is_premium && (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">⭐ Premium</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded"
        >
          Bearbeiten
        </button>
        <button
          onClick={onDelete}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}

// Lesson Modal Component
function LessonModal({ lesson, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    content: lesson?.content || '',
    difficulty_level: lesson?.difficulty_level || 'A1',
    lesson_type: lesson?.lesson_type || 'grammar',
    category: lesson?.category || '',
    is_premium: lesson?.is_premium || false,
    is_published: lesson?.is_published || false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (lesson) {
        // Update existing lesson
        await lessonsAPI.updateLesson(lesson.id, formData);
      } else {
        // Create new lesson
        await lessonsAPI.createLesson(formData);
      }
      onSuccess();
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError(err.response?.data?.error || 'Fehler beim Speichern der Lektion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {lesson ? 'Lektion bearbeiten' : 'Neue Lektion erstellen'}
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Inhalt</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schwierigkeitsgrad
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="A1">A1 - Anfänger</option>
                <option value="A2">A2 - Grundlegend</option>
                <option value="B1">B1 - Mittelstufe</option>
                <option value="B2">B2 - Fortgeschritten</option>
                <option value="C1">C1 - Experte</option>
                <option value="C2">C2 - Meister</option>
              </select>
            </div>

            {/* Lesson Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lektionstyp</label>
              <select
                value={formData.lesson_type}
                onChange={(e) => setFormData({ ...formData, lesson_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="grammar">Grammatik</option>
                <option value="vocabulary">Vokabular</option>
                <option value="conversation">Konversation</option>
                <option value="exercise">Übung</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Verben, Artikel, Dialoge..."
              />
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_premium}
                  onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">⭐ Premium-Lektion</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">✅ Veröffentlichen</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-400"
              >
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
