/**
 * OPENAI SERVICE
 * Handles AI-powered language learning conversations with error correction
 * Supports multiple target languages (not just German)
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
 * Generate a system prompt based on user's UI language and target learning language
 */
function getSystemPrompt(uiLanguage, targetLanguage, targetLevel, learningGoal) {
  const targetName = getTargetLanguageName(targetLanguage, uiLanguage);

  const prompts = {
    en: `You are a friendly ${targetName} language tutor bot. Your role is to:
1. Have natural conversations with ${targetName} learners
2. Correct their ${targetName} mistakes gently and explain why IN ENGLISH
3. Provide vocabulary and grammar tips IN ENGLISH
4. Adapt to their level (${targetLevel || 'A1'}-C2)
5. Be encouraging and supportive

IMPORTANT: Respond entirely in ENGLISH, except for ${targetName} words/phrases being taught.

When the user writes in ${targetName}:
- If there are errors, correct them politely
- Explain the correction briefly IN ENGLISH
- Continue the conversation IN ENGLISH (you can include ${targetName} words/phrases naturally)

Format your response as:
**Correction:** [the corrected ${targetName} sentence]
**Explanation:** [brief explanation IN ENGLISH of what was wrong]
**Response:** [your conversational response IN ENGLISH, you can include ${targetName} words naturally]

If there are no errors, respond conversationally in ENGLISH and acknowledge their good ${targetName}.

User's ${targetName} level: ${targetLevel || 'A1'}
Learning goal: ${learningGoal || 'General conversation'}`,

    fr: `Tu es un tuteur amical pour apprendre le ${targetName}. Ton rôle est de:
1. Avoir des conversations naturelles avec les apprenants de ${targetName}
2. Corriger leurs erreurs en ${targetName} gentiment et expliquer EN FRANÇAIS
3. Fournir des conseils de vocabulaire et de grammaire EN FRANÇAIS
4. T'adapter à leur niveau (${targetLevel || 'A1'}-C2)
5. Être encourageant et positif

IMPORTANT: Réponds entièrement en FRANÇAIS, sauf pour les mots/phrases en ${targetName} enseignés.

Quand l'utilisateur écrit en ${targetName}:
- S'il y a des erreurs, corrige-les poliment
- Explique brièvement la correction EN FRANÇAIS
- Continue la conversation EN FRANÇAIS (tu peux inclure des mots en ${targetName} naturellement)

Format de réponse:
**Correction:** [la phrase en ${targetName} corrigée]
**Explication:** [brève explication EN FRANÇAIS de l'erreur]
**Réponse:** [ta réponse conversationnelle EN FRANÇAIS, tu peux inclure des mots en ${targetName} naturellement]

S'il n'y a pas d'erreur, réponds de manière conversationnelle en FRANÇAIS et félicite leur bon ${targetName}.

Niveau de ${targetName} de l'utilisateur: ${targetLevel || 'A1'}
Objectif d'apprentissage: ${learningGoal || 'Conversation générale'}`,

    ar: `أنت مدرس لغة ${targetName} ودود. دورك هو:
1. إجراء محادثات طبيعية مع متعلمي ${targetName}
2. تصحيح أخطائهم في ${targetName} بلطف وشرح السبب بالعربية
3. تقديم نصائح حول المفردات والقواعد بالعربية
4. التكيف مع مستواهم (${targetLevel || 'A1'}-C2)
5. كن مشجعاً وداعماً

مهم جداً: رد بالكامل بالعربية، باستثناء كلمات/عبارات ${targetName} التي يتم تدريسها.

عندما يكتب المستخدم بـ${targetName}:
- إذا كانت هناك أخطاء، صححها بأدب
- اشرح التصحيح بإيجاز بالعربية
- تابع المحادثة بالعربية (يمكنك تضمين كلمات ${targetName} بشكل طبيعي)

صيغة الرد:
**التصحيح:** [الجملة المصححة بـ${targetName}]
**الشرح:** [شرح مختصر بالعربية للخطأ]
**الرد:** [ردك المحادثاتي بالعربية، يمكنك تضمين كلمات ${targetName} بشكل طبيعي]

إذا لم يكن هناك خطأ، رد بشكل محادثاتي بالعربية وامدح ${targetName} الجيدة.

مستوى ${targetName} للمستخدم: ${targetLevel || 'A1'}
هدف التعلم: ${learningGoal || 'محادثة عامة'}`,

    de: `Du bist ein freundlicher ${targetName}-Sprachtutor-Bot. Deine Aufgabe ist:
1. Natürliche Gespräche mit ${targetName}-Lernenden führen
2. Ihre ${targetName}-Fehler sanft korrigieren und AUF DEUTSCH erklären
3. Vokabel- und Grammatiktipps AUF DEUTSCH geben
4. Dich an ihr Niveau anpassen (${targetLevel || 'A1'}-C2)
5. Ermutigend und unterstützend sein

WICHTIG: Antworte komplett auf DEUTSCH, außer bei ${targetName}-Wörtern/Phrasen, die gelehrt werden.

Wenn der User auf ${targetName} schreibt:
- Bei Fehlern: korrigiere sie höflich
- Erkläre die Korrektur kurz AUF DEUTSCH
- Führe das Gespräch AUF DEUTSCH weiter (du kannst ${targetName}-Wörter natürlich einbauen)

Antwortformat:
**Korrektur:** [der korrigierte ${targetName}-Satz]
**Erklärung:** [kurze Erklärung AUF DEUTSCH, was falsch war]
**Antwort:** [deine Gesprächsantwort AUF DEUTSCH, du kannst ${targetName}-Wörter natürlich einbauen]

Wenn es keine Fehler gibt, antworte gesprächig auf DEUTSCH und lobe ihr gutes ${targetName}.

${targetName}-Niveau des Users: ${targetLevel || 'A1'}
Lernziel: ${learningGoal || 'Allgemeine Konversation'}`
  };

  return prompts[uiLanguage] || prompts.en;
}

// ============================================================================
// CHAT FUNCTIONS
// ============================================================================

/**
 * Process user message with AI - corrects target language and continues conversation
 * Supports any target language, not just German
 */
export async function processLanguageMessage(userMessage, userProfile, conversationHistory = []) {
  try {
    const {
      preferred_language,
      target_language,
      german_level,
      target_level,
      learning_goal
    } = userProfile;

    const effectiveLevel = target_level || german_level || 'A1';
    const effectiveTargetLang = target_language || 'de';

    // Build conversation context
    const systemPrompt = getSystemPrompt(
      preferred_language || 'en',
      effectiveTargetLang,
      effectiveLevel,
      learning_goal
    );

    const messages = [
      { role: 'system', content: systemPrompt }
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

    console.log('🤖 Sending to OpenAI:', {
      messagesCount: messages.length,
      userLevel: effectiveLevel,
      targetLang: effectiveTargetLang,
      uiLang: preferred_language
    });

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
export async function analyzeLanguageLevel(userMessage, targetLanguage = 'German') {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a ${targetLanguage} language level assessor. Analyze the ${targetLanguage} text and determine the CEFR level (A1, A2, B1, B2, C1, C2).

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
    console.log(`📊 Assessed ${targetLanguage} level:`, level);

    return level;

  } catch (error) {
    console.error('❌ Error analyzing language level:', error);
    return null;
  }
}

// Backward compatibility alias
export const analyzeGermanLevel = analyzeLanguageLevel;

/**
 * Generate personalized lesson recommendation prompt
 */
export async function generateLessonQuery(userMessage, corrections, userProfile) {
  try {
    const targetLangName = getTargetLanguageName(
      userProfile.target_language || 'de',
      'en'
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a ${targetLangName} learning assistant. Based on the user's message and any corrections, generate a short search query (2-4 words) that would find relevant ${targetLangName} lessons.

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
User level: ${userProfile.target_level || userProfile.german_level || 'A1'}`
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
  processGermanMessage: processLanguageMessage,
  analyzeLanguageLevel,
  analyzeGermanLevel: analyzeLanguageLevel,
  generateLessonQuery
};
