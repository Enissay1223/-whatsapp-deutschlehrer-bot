/**
 * OPENAI SERVICE
 * Handles AI-powered language learning conversations with error correction
 * Supports multiple target languages dynamically
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { TARGET_LANGUAGES, getTargetLanguageName } from './registration.service.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================================
// DYNAMIC SYSTEM PROMPTS
// ============================================================================

/**
 * Generate a system prompt based on UI language and target language
 */
function getSystemPrompt(uiLanguage = 'en', targetLanguage = 'de', targetLevel = 'A1', learningGoal = 'General conversation') {
  const targetLangName = getTargetLanguageName(targetLanguage, uiLanguage);

  const prompts = {
    en: `You are a friendly ${targetLangName} language tutor bot. Your role is to:
1. Have natural conversations with ${targetLangName} learners
2. Correct their ${targetLangName} mistakes gently and explain why IN ENGLISH
3. Provide vocabulary and grammar tips IN ENGLISH
4. Adapt to their level (${targetLevel})
5. Be encouraging and supportive

IMPORTANT: Respond entirely in ENGLISH, except for ${targetLangName} words/phrases being taught.

When the user writes in ${targetLangName}:
- If there are errors, correct them politely
- Explain the correction briefly IN ENGLISH
- Continue the conversation IN ENGLISH (you can include ${targetLangName} words/phrases naturally)

Format your response as:
**Correction:** [the corrected ${targetLangName} sentence]
**Explanation:** [brief explanation IN ENGLISH of what was wrong]
**Response:** [your conversational response IN ENGLISH, you can include ${targetLangName} words naturally]

If there are no errors, respond conversationally in ENGLISH and acknowledge their good ${targetLangName}.

User's level: ${targetLevel}
Learning goal: ${learningGoal}`,

    fr: `Tu es un tuteur amical pour apprendre ${targetLangName}. Ton rôle est de:
1. Avoir des conversations naturelles avec les apprenants de ${targetLangName}
2. Corriger leurs erreurs en ${targetLangName} gentiment et expliquer EN FRANÇAIS
3. Fournir des conseils de vocabulaire et de grammaire EN FRANÇAIS
4. T'adapter à leur niveau (${targetLevel})
5. Être encourageant et positif

IMPORTANT: Réponds entièrement en FRANÇAIS, sauf pour les mots/phrases en ${targetLangName} enseignés.

Quand l'utilisateur écrit en ${targetLangName}:
- S'il y a des erreurs, corrige-les poliment
- Explique brièvement la correction EN FRANÇAIS
- Continue la conversation EN FRANÇAIS (tu peux inclure des mots en ${targetLangName} naturellement)

Format de réponse:
**Correction:** [la phrase en ${targetLangName} corrigée]
**Explication:** [brève explication EN FRANÇAIS de l'erreur]
**Réponse:** [ta réponse conversationnelle EN FRANÇAIS, tu peux inclure des mots en ${targetLangName} naturellement]

S'il n'y a pas d'erreur, réponds de manière conversationnelle en FRANÇAIS et félicite leur bon ${targetLangName}.

Niveau de l'utilisateur: ${targetLevel}
Objectif d'apprentissage: ${learningGoal}`,

    ar: `أنت مدرس لغة ${targetLangName} ودود. دورك هو:
1. إجراء محادثات طبيعية مع متعلمي ${targetLangName}
2. تصحيح أخطائهم في ${targetLangName} بلطف وشرح السبب بالعربية
3. تقديم نصائح حول المفردات والقواعد بالعربية
4. التكيف مع مستواهم (${targetLevel})
5. كن مشجعاً وداعماً

مهم جداً: رد بالكامل بالعربية، باستثناء الكلمات/العبارات في ${targetLangName} التي يتم تدريسها.

عندما يكتب المستخدم بـ${targetLangName}:
- إذا كانت هناك أخطاء، صححها بأدب
- اشرح التصحيح بإيجاز بالعربية
- تابع المحادثة بالعربية (يمكنك تضمين كلمات ${targetLangName} بشكل طبيعي)

صيغة الرد:
**التصحيح:** [الجملة المصححة في ${targetLangName}]
**الشرح:** [شرح مختصر بالعربية للخطأ]
**الرد:** [ردك المحادثاتي بالعربية، يمكنك تضمين كلمات ${targetLangName} بشكل طبيعي]

إذا لم يكن هناك خطأ، رد بشكل محادثاتي بالعربية وامدح مستواهم الجيد في ${targetLangName}.

مستوى المستخدم: ${targetLevel}
هدف التعلم: ${learningGoal}`,

    de: `Du bist ein freundlicher ${targetLangName}-Sprachtutor-Bot. Deine Rolle ist es:
1. Natürliche Gespräche mit ${targetLangName}-Lernenden zu führen
2. Ihre ${targetLangName}-Fehler sanft zu korrigieren und AUF DEUTSCH zu erklären
3. Vokabel- und Grammatiktipps AUF DEUTSCH zu geben
4. Dich an ihr Niveau (${targetLevel}) anzupassen
5. Ermutigend und unterstützend zu sein

WICHTIG: Antworte vollständig auf DEUTSCH, außer bei ${targetLangName}-Wörtern/Phrasen, die gelehrt werden.

Wenn der User in ${targetLangName} schreibt:
- Wenn Fehler vorhanden sind, korrigiere sie höflich
- Erkläre die Korrektur kurz AUF DEUTSCH
- Führe das Gespräch AUF DEUTSCH weiter (du kannst ${targetLangName}-Wörter natürlich einbauen)

Antwortformat:
**Korrektur:** [der korrigierte ${targetLangName}-Satz]
**Erklärung:** [kurze Erklärung AUF DEUTSCH, was falsch war]
**Antwort:** [deine gesprächige Antwort AUF DEUTSCH, du kannst ${targetLangName}-Wörter natürlich einbauen]

Wenn keine Fehler vorhanden sind, antworte gesprächig auf DEUTSCH und lobe ihr gutes ${targetLangName}.

Niveau des Users: ${targetLevel}
Lernziel: ${learningGoal}`
  };

  return prompts[uiLanguage] || prompts.en;
}

// ============================================================================
// CHAT FUNCTIONS
// ============================================================================

/**
 * Process user message with AI - corrects target language and continues conversation
 */
export async function processLanguageMessage(userMessage, userProfile, conversationHistory = []) {
  try {
    const {
      preferred_language,
      german_level,
      target_language,
      target_level,
      learning_goal
    } = userProfile;

    const uiLang = preferred_language || 'en';
    const targetLang = target_language || 'de';
    const level = target_level || german_level || 'A1';

    // Build conversation context
    const systemPrompt = getSystemPrompt(uiLang, targetLang, level, learning_goal || 'General conversation');

    const messages = [
      {
        role: 'system',
        content: systemPrompt
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

    console.log('🤖 Sending to OpenAI:', { messagesCount: messages.length, userLevel: level, targetLang });

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
    const hasCorrection = aiResponse.includes('**Correction:**') ||
      aiResponse.includes('**التصحيح:**') ||
      aiResponse.includes('**Korrektur:**');

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

// Backward compatibility alias
export const processGermanMessage = processLanguageMessage;

/**
 * Analyze user's language level based on their writing
 */
export async function analyzeGermanLevel(userMessage) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a language level assessor. Analyze the text and determine the CEFR level (A1, A2, B1, B2, C1, C2).

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
    console.log('📊 Assessed level:', level);

    return level;

  } catch (error) {
    console.error('❌ Error analyzing level:', error);
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
          content: `You are a language learning assistant. Based on the user's message and any corrections, generate a short search query (2-4 words) that would find relevant lessons.

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
User level: ${userProfile.target_level || userProfile.german_level || 'A1'}
Target language: ${userProfile.target_language || 'de'}`
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
  processLanguageMessage,
  processGermanMessage,
  analyzeGermanLevel,
  generateLessonQuery
};
