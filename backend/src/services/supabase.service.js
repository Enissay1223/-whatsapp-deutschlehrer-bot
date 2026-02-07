/**
 * SUPABASE SERVICE
 * Database operations using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Use service role for backend
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user profile by Telegram ID
 */
export async function getUserByTelegramId(telegramId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

/**
 * Create user profile
 */
export async function createUserProfile(userData) {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert([userData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update registration step
 */
export async function updateRegistrationStep(userId, step, stepData = {}) {
  // Get current profile
  const currentProfile = await getUserProfile(userId);

  if (!currentProfile) {
    console.error('❌ User not found in updateRegistrationStep:', userId);
    throw new Error('User not found');
  }

  const registrationData = {
    ...(currentProfile.registration_data || {}),
    ...stepData
  };

  return updateUserProfile(userId, {
    registration_step: step,
    registration_data: registrationData,
    registration_completed: step >= 5 // 5 steps total
  });
}

/**
 * Increment message count (for rate limiting)
 */
export async function incrementMessageCount(userId) {
  const user = await getUserProfile(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Reset if new day
  const today = new Date().toISOString().split('T')[0];
  const lastReset = user.last_message_reset?.split('T')[0];

  if (lastReset !== today) {
    return updateUserProfile(userId, {
      daily_message_count: 1,
      last_message_reset: today
    });
  }

  return updateUserProfile(userId, {
    daily_message_count: user.daily_message_count + 1
  });
}

/**
 * Increment daily message count (alias for consistency)
 */
export async function incrementDailyMessageCount(userId) {
  return incrementMessageCount(userId);
}

/**
 * Check if user has reached message limit
 */
export async function hasReachedMessageLimit(userId) {
  const user = await getUserProfile(userId);

  // Reset if new day
  const today = new Date().toISOString().split('T')[0];
  const lastReset = user.last_message_reset?.split('T')[0];

  if (lastReset !== today) {
    return false;
  }

  return user.daily_message_count >= user.daily_message_limit;
}

/**
 * Add experience points
 */
export async function addExperiencePoints(userId, points) {
  const user = await getUserProfile(userId);
  const newXP = user.experience_points + points;

  return updateUserProfile(userId, {
    experience_points: newXP,
    last_activity_date: new Date().toISOString().split('T')[0]
  });
}

/**
 * Update streak
 */
export async function updateStreak(userId) {
  const user = await getUserProfile(userId);
  const today = new Date().toISOString().split('T')[0];
  const lastActivity = user.last_activity_date;

  if (!lastActivity) {
    // First activity
    return updateUserProfile(userId, {
      streak_days: 1,
      last_activity_date: today
    });
  }

  const lastDate = new Date(lastActivity);
  const currentDate = new Date(today);
  const diffTime = currentDate - lastDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let newStreak = user.streak_days;
  if (diffDays === 1) {
    // Consecutive day
    newStreak += 1;
  } else if (diffDays > 1) {
    // Streak broken
    newStreak = 1;
  }
  // diffDays === 0 means same day, keep streak

  return updateUserProfile(userId, {
    streak_days: newStreak,
    last_activity_date: today
  });
}

// ============================================================================
// LESSON OPERATIONS
// ============================================================================

/**
 * Get all published lessons
 */
export async function getPublishedLessons(filters = {}) {
  let query = supabase
    .from('lessons')
    .select('*')
    .eq('is_published', true);

  if (filters.level) {
    query = query.eq('level', filters.level);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get lesson by ID
 */
export async function getLesson(lessonId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get lessons by IDs (for RAG retrieval)
 */
export async function getLessonsByIds(lessonIds) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .in('id', lessonIds);

  if (error) throw error;
  return data;
}

/**
 * Create lesson (Admin only)
 */
export async function createLesson(lessonData) {
  const { data, error } = await supabase
    .from('lessons')
    .insert([lessonData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update lesson
 */
export async function updateLesson(lessonId, updates) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', lessonId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Increment lesson view count
 */
export async function incrementLessonViews(lessonId) {
  const { data: lesson } = await getLesson(lessonId);

  return updateLesson(lessonId, {
    view_count: lesson.view_count + 1
  });
}

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

/**
 * Save conversation message
 */
export async function saveConversation(conversationData) {
  const { data, error } = await supabase
    .from('conversations')
    .insert([conversationData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save conversation message (alias for consistency)
 */
export async function saveConversationMessage(messageData) {
  const { data, error } = await supabase
    .from('conversation_history')
    .insert([{
      ...messageData,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user conversation history
 */
export async function getConversationHistory(userId, limit = 50) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.reverse(); // Reverse to get chronological order
}

// ============================================================================
// USER PROGRESS OPERATIONS
// ============================================================================

/**
 * Get user progress for a lesson
 */
export async function getUserProgress(userId, lessonId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update or create user progress
 */
export async function upsertUserProgress(progressData) {
  const { data, error } = await supabase
    .from('user_progress')
    .upsert([progressData], { onConflict: 'user_id,lesson_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark lesson as completed
 */
export async function completLesson(userId, lessonId, score) {
  const existing = await getUserProgress(userId, lessonId);

  const progressData = {
    user_id: userId,
    lesson_id: lessonId,
    status: score >= 80 ? 'mastered' : 'completed',
    score: score,
    attempts: existing ? existing.attempts + 1 : 1,
    last_attempt: new Date().toISOString(),
    completed_at: new Date().toISOString()
  };

  // Update lesson completion count
  const { data: lesson } = await getLesson(lessonId);
  await updateLesson(lessonId, {
    completion_count: lesson.completion_count + 1
  });

  return upsertUserProgress(progressData);
}

// ============================================================================
// ACHIEVEMENT OPERATIONS
// ============================================================================

/**
 * Add achievement
 */
export async function addAchievement(userId, achievementData) {
  const { data, error } = await supabase
    .from('achievements')
    .insert([{
      user_id: userId,
      ...achievementData
    }])
    .select()
    .single();

  if (error) throw error;

  // Add XP for achievement
  if (achievementData.points_awarded) {
    await addExperiencePoints(userId, achievementData.points_awarded);
  }

  return data;
}

/**
 * Get user achievements
 */
export async function getUserAchievements(userId) {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================================================
// PAYMENT OPERATIONS
// ============================================================================

/**
 * Create subscription event
 */
export async function createSubscriptionEvent(eventData) {
  const { data, error } = await supabase
    .from('subscription_events')
    .insert([eventData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create payment transaction
 */
export async function createPaymentTransaction(transactionData) {
  const { data, error } = await supabase
    .from('payment_transactions')
    .insert([transactionData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upgrade user to premium
 */
export async function upgradeUserToPremium(userId, stripeData) {
  return updateUserProfile(userId, {
    subscription_tier: 'premium',
    subscription_status: 'active',
    stripe_customer_id: stripeData.customerId,
    subscription_started_at: new Date().toISOString(),
    trial_ends_at: stripeData.trialEndsAt,
    daily_message_limit: 999999
  });
}

// ============================================================================
// ADMIN ANALYTICS
// ============================================================================

/**
 * Get dashboard metrics (cached)
 */
export async function getDashboardMetrics() {
  const { data, error } = await supabase
    .from('admin_dashboard_metrics')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all users (Admin)
 */
export async function getAllUsers(filters = {}) {
  let query = supabase
    .from('user_profiles')
    .select('*');

  if (filters.tier) {
    query = query.eq('subscription_tier', filters.tier);
  }

  if (filters.status) {
    query = query.eq('subscription_status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get revenue stats
 */
export async function getRevenueStats() {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('amount, currency, created_at')
    .eq('status', 'succeeded');

  if (error) throw error;
  return data;
}

// ============================================================================
// SYSTEM LOGS
// ============================================================================

/**
 * Create system log
 */
export async function createSystemLog(logLevel, service, message, metadata = {}) {
  const { error } = await supabase
    .from('system_logs')
    .insert([{
      log_level: logLevel,
      service: service,
      message: message,
      metadata: metadata
    }]);

  if (error) console.error('Failed to create system log:', error);
}

// Export supabase client for direct use if needed
export { supabase };
