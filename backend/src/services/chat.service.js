/**
 * CHAT SERVICE
 * Orchestrates AI conversations, error correction, and lesson recommendations
 */

import { processGermanMessage, generateLessonQuery } from './openai.service.js';
import { getRecommendedLessons } from './lesson.service.js';
import {
  getUserProfile,
  updateUserProfile,
  saveConversationMessage,
  getConversationHistory,
  incrementDailyMessageCount,
  addExperiencePoints,
  updateStreak
} from './supabase.service.js';

// ============================================================================
// MAIN CHAT HANDLER
// ============================================================================

/**
 * Process user's German text message with AI and recommendations
 */
export async function handleChatMessage(userId, telegramId, messageText) {
  try {
    console.log('💬 Processing chat message for user:', userId);

    // Get user profile
    const userProfile = await getUserProfile(userId);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Get conversation history (last 10 messages)
    const conversationHistory = await getConversationHistory(userId, 10);

    // Process message with OpenAI
    const aiResult = await processGermanMessage(messageText, userProfile, conversationHistory);

    // Save conversation to database
    await saveConversationMessage({
      user_id: userId,
      message_text: messageText,
      message_type: 'user',
      ai_response: aiResult.response,
      has_corrections: aiResult.hasCorrection
    });

    console.log('✅ Conversation saved to database');

    // Generate lesson recommendations if there were corrections
    let recommendedLessons = [];
    if (aiResult.hasCorrection) {
      console.log('🔍 Generating lesson recommendations...');

      const lessonQuery = await generateLessonQuery(messageText, aiResult.response, userProfile);

      if (lessonQuery) {
        recommendedLessons = await getRecommendedLessons(lessonQuery, userProfile, 2);
        console.log(`📚 Found ${recommendedLessons.length} recommended lessons`);
      }
    }

    // Award XP for the message
    const xpAwarded = calculateXP(messageText, aiResult.hasCorrection);
    await addExperiencePoints(userId, xpAwarded);

    // Update streak
    await updateStreak(userId);

    // Increment message count
    await incrementDailyMessageCount(userId);

    console.log(`✅ Chat processed: XP +${xpAwarded}, Corrections: ${aiResult.hasCorrection}`);

    return {
      aiResponse: aiResult.response,
      recommendedLessons,
      xpAwarded,
      hasCorrection: aiResult.hasCorrection
    };

  } catch (error) {
    console.error('❌ Error in handleChatMessage:', error);
    throw error;
  }
}

// ============================================================================
// XP CALCULATION
// ============================================================================

/**
 * Calculate XP based on message complexity and corrections
 */
function calculateXP(messageText, hasCorrection) {
  let xp = 5; // Base XP for any message

  // Word count bonus
  const wordCount = messageText.split(/\s+/).length;
  if (wordCount > 10) xp += 5;
  if (wordCount > 20) xp += 5;
  if (wordCount > 30) xp += 10;

  // Correction bonus (learning from mistakes!)
  if (hasCorrection) {
    xp += 10;
  }

  return xp;
}

// ============================================================================
// LESSON RECOMMENDATION FORMATTING
// ============================================================================

/**
 * Format lesson recommendations for Telegram message
 */
export function formatLessonRecommendations(lessons, preferredLanguage = 'en') {
  if (!lessons || lessons.length === 0) return '';

  const headers = {
    en: '\n\n📚 *Recommended Lessons:*\n',
    fr: '\n\n📚 *Leçons recommandées :*\n',
    ar: '\n\n📚 *الدروس الموصى بها:*\n'
  };

  let message = headers[preferredLanguage] || headers.en;

  lessons.forEach((lesson, index) => {
    const isPremium = lesson.is_premium ? '⭐ ' : '';
    message += `${index + 1}. ${isPremium}*${lesson.title}* (${lesson.level})\n`;
    message += `   ${lesson.description}\n\n`;
  });

  const ctas = {
    en: 'Type `/lesson` to start a lesson!',
    fr: 'Tapez `/lesson` pour commencer une leçon !',
    ar: 'اكتب `/lesson` لبدء درس!'
  };

  message += ctas[preferredLanguage] || ctas.en;

  return message;
}

export default {
  handleChatMessage,
  formatLessonRecommendations
};
