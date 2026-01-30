/**
 * LESSON SERVICE
 * Manages lessons in Supabase and syncs with Pinecone for RAG
 */

import { supabase } from './supabase.service.js';
import { indexLesson, searchLessons, deleteLesson as deleteLessonFromPinecone } from './pinecone.service.js';

// ============================================================================
// LESSON CRUD OPERATIONS
// ============================================================================

/**
 * Create a new lesson and index it in Pinecone
 */
export async function createLesson(lessonData) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .insert([{
        title: lessonData.title,
        description: lessonData.description,
        content: lessonData.content,
        level: lessonData.level,
        lesson_type: lessonData.lesson_type || 'grammar',
        difficulty_score: lessonData.difficulty_score || 1,
        tags: lessonData.tags || [],
        is_premium: lessonData.is_premium || false
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating lesson:', error);
      throw error;
    }

    console.log('✅ Lesson created:', data.id);

    // Index in Pinecone for RAG
    await indexLesson(data);

    return data;

  } catch (error) {
    console.error('❌ Error in createLesson:', error);
    throw error;
  }
}

/**
 * Get lesson by ID
 */
export async function getLessonById(lessonId) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) throw error;

    return data;

  } catch (error) {
    console.error('❌ Error getting lesson:', error);
    throw error;
  }
}

/**
 * Get all lessons for a specific level
 */
export async function getLessonsByLevel(level, userTier = 'free') {
  try {
    let query = supabase
      .from('lessons')
      .select('*')
      .eq('level', level)
      .order('difficulty_score', { ascending: true });

    // Free users only see non-premium lessons
    if (userTier === 'free') {
      query = query.eq('is_premium', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;

  } catch (error) {
    console.error('❌ Error getting lessons by level:', error);
    throw error;
  }
}

/**
 * Update lesson and re-index in Pinecone
 */
export async function updateLesson(lessonId, updates) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Lesson updated:', lessonId);

    // Re-index in Pinecone
    await indexLesson(data);

    return data;

  } catch (error) {
    console.error('❌ Error updating lesson:', error);
    throw error;
  }
}

/**
 * Delete lesson from both Supabase and Pinecone
 */
export async function deleteLesson(lessonId) {
  try {
    // Delete from Pinecone first
    await deleteLessonFromPinecone(lessonId);

    // Delete from Supabase
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) throw error;

    console.log('✅ Lesson deleted:', lessonId);
    return true;

  } catch (error) {
    console.error('❌ Error deleting lesson:', error);
    throw error;
  }
}

// ============================================================================
// LESSON RECOMMENDATIONS (RAG)
// ============================================================================

/**
 * Get recommended lessons based on user's recent conversation
 */
export async function getRecommendedLessons(query, userProfile, topK = 3) {
  try {
    const { german_level, subscription_tier } = userProfile;

    // Search Pinecone for relevant lessons
    const recommendations = await searchLessons(query, german_level, topK);

    // Fetch full lesson data from Supabase
    const lessonIds = recommendations.map(r => r.id);

    let dbQuery = supabase
      .from('lessons')
      .select('*')
      .in('id', lessonIds);

    // Filter for free users
    if (subscription_tier === 'free') {
      dbQuery = dbQuery.eq('is_premium', false);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    // Merge with relevance scores
    const lessonsWithScores = data.map(lesson => {
      const match = recommendations.find(r => r.id === lesson.id);
      return {
        ...lesson,
        relevance_score: match?.score || 0
      };
    });

    // Sort by relevance
    lessonsWithScores.sort((a, b) => b.relevance_score - a.relevance_score);

    console.log(`📚 Found ${lessonsWithScores.length} recommended lessons`);

    return lessonsWithScores;

  } catch (error) {
    console.error('❌ Error getting recommended lessons:', error);
    return [];
  }
}

// ============================================================================
// USER LESSON PROGRESS
// ============================================================================

/**
 * Start a lesson for a user
 */
export async function startLesson(userId, lessonId) {
  try {
    // Check if already started
    const { data: existing } = await supabase
      .from('user_lessons')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (existing) {
      console.log('📖 Lesson already started, resuming');
      return existing;
    }

    // Create new user_lesson record
    const { data, error } = await supabase
      .from('user_lessons')
      .insert([{
        user_id: userId,
        lesson_id: lessonId,
        status: 'in_progress',
        progress_percentage: 0
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Lesson started:', lessonId);
    return data;

  } catch (error) {
    console.error('❌ Error starting lesson:', error);
    throw error;
  }
}

/**
 * Update lesson progress
 */
export async function updateLessonProgress(userId, lessonId, progressPercentage) {
  try {
    const updates = {
      progress_percentage: progressPercentage,
      status: progressPercentage >= 100 ? 'completed' : 'in_progress'
    };

    if (progressPercentage >= 100) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('user_lessons')
      .update(updates)
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Lesson progress updated: ${progressPercentage}%`);
    return data;

  } catch (error) {
    console.error('❌ Error updating lesson progress:', error);
    throw error;
  }
}

/**
 * Get user's lesson history
 */
export async function getUserLessons(userId, status = null) {
  try {
    let query = supabase
      .from('user_lessons')
      .select(`
        *,
        lesson:lessons(*)
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;

  } catch (error) {
    console.error('❌ Error getting user lessons:', error);
    throw error;
  }
}

export default {
  createLesson,
  getLessonById,
  getLessonsByLevel,
  updateLesson,
  deleteLesson,
  getRecommendedLessons,
  startLesson,
  updateLessonProgress,
  getUserLessons
};
