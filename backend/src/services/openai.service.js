/**
 * OPENAI SERVICE
 * Handles AI-powered German learning conversations with error correction
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const SYSTEM_PROMPTS = {
  en: `You are a friendly German language tutor bot. Your role is to:
1. Have natural conversations in German with learners
2. Correct their mistakes gently and explain why
3. Provide vocabulary and grammar tips
4. Adapt to their level (A1-C2)
5. Be encouraging and supportive

When the user writes in German:
- If there are errors, correct them politely
- Explain the correction briefly
- Continue the conversation naturally
- Use simple language for beginners, more complex for advanced learners

Format your response as:
**Correction:** [if there are errors, show the corrected version]
**Explanation:** [brief explanation of the mistake]
**Response:** [your natural German response to continue the conversation]

If there are no errors, just respond naturally in German.`,

  fr: `Tu es un tuteur amical pour apprendre l'allemand. Ton rôle est de:
1. Avoir des conversations naturelles en allemand avec les apprenants
2. Corriger leurs erreurs gentiment et expliquer pourquoi
3. Fournir des conseils de vocabulaire et de grammaire
4. T'adapter à leur niveau (A1-C2)
5. Être encourageant et positif

Quand l'utilisateur écrit en allemand:
- S'il y a des erreurs, corrige-les poliment
- Explique brièvement la correction
- Continue la conversation naturellement
- Utilise un langage simple pour les débutants, plus complexe pour les avancés

Format de réponse:
**Correction:** [si erreurs, montre la version corrigée]
**Explication:** [brève explication de l'erreur]
**Réponse:** [ta réponse naturelle en allemand pour continuer la conversation]

S'il n'y a pas d'erreur, réponds naturellement en allemand.`,

  ar: `أنت مدرس لغة ألمانية ودود. دورك هو:
1. إجراء محادثات طبيعية بالألمانية مع المتعلمين
2. تصحيح أخطائهم بلطف وشرح السبب
3. تقديم نصائح حول المفردات والقواعد
4. التكيف مع مستواهم (A1-C2)
5. كن مشجعاً وداعماً

عندما يكتب المستخدم بالألمانية:
- إذا كانت هناك أخطاء، صححها بأدب
- اشرح التصحيح بإيجاز
- تابع المحادثة بشكل طبيعي
- استخدم لغة بسيطة للمبتدئين، وأكثر تعقيداً للمتقدمين

صيغة الرد:
**التصحيح:** [إذا كانت هناك أخطاء، أظهر النسخة المصححة]
**الشرح:** [شرح مختصر للخطأ]
**الرد:** [ردك الطبيعي بالألمانية لمتابعة المحادثة]

إذا لم يكن هناك خطأ، رد بشكل طبيعي بالألمانية.`
};

// ============================================================================
// CHAT FUNCTIONS
// ============================================================================

/**
 * Process user message with AI - corrects German and continues conversation
 */
export async function processGermanMessage(userMessage, userProfile, conversationHistory = []) {
  try {
    const { preferred_language, german_level, learning_goal } = userProfile;

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS[preferred_language] +
          `\n\nUser's German level: ${german_level || 'A1'}` +
          `\nLearning goal: ${learning_goal || 'General conversation'}`
      }
    ];

    // Add conversation history (last 5 messages)
    const recentHistory = conversationHistory.slice(-5);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.message_type === 'user' ? 'user' : 'assistant',
        content: msg.message_type === 'user' ? msg.message_text : msg.ai_response
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: userMessage
    });

    console.log('🤖 Sending to OpenAI:', { messagesCount: messages.length, userLevel: german_level });

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = response.choices[0].message.content;
    console.log('✅ OpenAI response received:', aiResponse.substring(0, 100));

    // Extract correction info for analytics
    const hasCorrection = aiResponse.includes('**Correction:**') || aiResponse.includes('**التصحيح:**');

    return {
      response: aiResponse,
      hasCorrection,
      tokensUsed: response.usage.total_tokens
    };

  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw new Error('Failed to process message with AI');
  }
}

/**
 * Analyze user's German level based on their writing
 */
export async function analyzeGermanLevel(userMessage) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a German language level assessor. Analyze the German text and determine the CEFR level (A1, A2, B1, B2, C1, C2).

Consider:
- Grammar accuracy
- Vocabulary range
- Sentence complexity
- Idiomatic usage

Respond ONLY with the level code (A1, A2, B1, B2, C1, or C2).`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const level = response.choices[0].message.content.trim();
    console.log('📊 Assessed German level:', level);

    return level;

  } catch (error) {
    console.error('❌ Error analyzing German level:', error);
    return null;
  }
}

/**
 * Generate personalized lesson recommendation prompt
 */
export async function generateLessonQuery(userMessage, corrections, userProfile) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a German learning assistant. Based on the user's message and any corrections, generate a short search query (2-4 words) that would find relevant German lessons.

Focus on:
- Grammar topics if there were grammar errors
- Vocabulary themes if new words were used
- Conversation topics if it's general chat

Respond ONLY with the search query, nothing else.`
        },
        {
          role: 'user',
          content: `User wrote: "${userMessage}"
${corrections ? `Corrections made: ${corrections}` : 'No corrections needed'}
User level: ${userProfile.german_level || 'A1'}`
        }
      ],
      temperature: 0.5,
      max_tokens: 20
    });

    const query = response.choices[0].message.content.trim();
    console.log('🔍 Generated lesson query:', query);

    return query;

  } catch (error) {
    console.error('❌ Error generating lesson query:', error);
    return null;
  }
}

export default {
  processGermanMessage,
  analyzeGermanLevel,
  generateLessonQuery
};
