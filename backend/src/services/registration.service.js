/**
 * USER REGISTRATION SERVICE
 * Handles multi-step registration flow for Telegram users
 * Now supports multiple target languages (not just German)
 */

import {
  getUserByTelegramId,
  updateRegistrationStep,
  updateUserProfile
} from './supabase.service.js';
import { sendMessage, createInlineKeyboard, createReplyKeyboard } from '../telegram/bot.handler.js';

// ============================================================================
// REGISTRATION FLOW STEPS
// ============================================================================
// Step 0: UI Language selection (handled in bot.handler)
// Step 1: Target language (NEW - what language to learn)
// Step 2: Name
// Step 3: Native language
// Step 4: Level
// Step 5: Learning goal
// Step 6: Plan selection (Free/Premium)
// Step 7: Complete
// ============================================================================

// ============================================================================
// TARGET LANGUAGES
// ============================================================================

export const TARGET_LANGUAGES = {
  de: { en: 'German', fr: 'allemand', ar: 'الألمانية', de: 'Deutsch', flag: '🇩🇪' },
  en: { en: 'English', fr: 'anglais', ar: 'الإنجليزية', de: 'Englisch', flag: '🇬🇧' },
  fr: { en: 'French', fr: 'français', ar: 'الفرنسية', de: 'Französisch', flag: '🇫🇷' },
  ar: { en: 'Arabic', fr: 'arabe', ar: 'العربية', de: 'Arabisch', flag: '🇸🇦' },
  es: { en: 'Spanish', fr: 'espagnol', ar: 'الإسبانية', de: 'Spanisch', flag: '🇪🇸' },
  tr: { en: 'Turkish', fr: 'turc', ar: 'التركية', de: 'Türkisch', flag: '🇹🇷' }
};

export function getTargetLanguageName(langCode, uiLang = 'en') {
  const lang = TARGET_LANGUAGES[langCode];
  if (!lang) return langCode;
  return lang[uiLang] || lang.en;
}

/**
 * Get localized messages based on user's preferred language
 */
function getMessages(lang = 'en') {
  const messages = {
    en: {
      askTargetLanguage: "Which language would you like to learn?",
      askName: "Great! What's your name?",
      askNativeLanguage: "What's your native language?",
      askLevel: "What's your current level?\n\nChoose your level or take a quick test:",
      askLearningGoal: "Why are you learning this language?",
      askPlan: "Almost done! Choose your plan:",
      welcomeComplete: "🎉 *Welcome aboard!*\n\nYour profile is complete. Let's start learning!\n\nTry typing something in your target language, or use /lesson to start a lesson!",
      invalidInput: "Please provide a valid answer.",
      freePlan: "📦 *FREE PLAN*\n✓ 10 messages/day\n✓ Basic lessons (A1-A2)\n✓ Community support",
      premiumPlan: "⭐ *PREMIUM PLAN*\n✓ Unlimited messages\n✓ All lessons (A1-C2)\n✓ Personalized exercises\n✓ Progress reports\n✓ Priority support\n\n€9.99/month - 7 days free trial"
    },
    fr: {
      askTargetLanguage: "Quelle langue aimerais-tu apprendre ?",
      askName: "Super ! Comment t'appelles-tu ?",
      askNativeLanguage: "Quelle est ta langue maternelle ?",
      askLevel: "Quel est ton niveau actuel ?\n\nChoisis ton niveau ou fais un test rapide :",
      askLearningGoal: "Pourquoi apprends-tu cette langue ?",
      askPlan: "Presque fini ! Choisis ton plan :",
      welcomeComplete: "🎉 *Bienvenue !*\n\nTon profil est complet. Commençons à apprendre !\n\nEssaie d'écrire quelque chose dans ta langue cible ou utilise /lesson pour commencer une leçon !",
      invalidInput: "Merci de fournir une réponse valide.",
      freePlan: "📦 *PLAN GRATUIT*\n✓ 10 messages/jour\n✓ Leçons basiques (A1-A2)\n✓ Support communautaire",
      premiumPlan: "⭐ *PLAN PREMIUM*\n✓ Messages illimités\n✓ Toutes les leçons (A1-C2)\n✓ Exercices personnalisés\n✓ Rapports de progrès\n✓ Support prioritaire\n\n€9.99/mois - 7 jours d'essai gratuit"
    },
    ar: {
      askTargetLanguage: "أي لغة تريد أن تتعلم؟",
      askName: "رائع! ما اسمك؟",
      askNativeLanguage: "ما هي لغتك الأم؟",
      askLevel: "ما هو مستواك الحالي؟\n\nاختر مستواك أو قم بإجراء اختبار سريع:",
      askLearningGoal: "لماذا تتعلم هذه اللغة؟",
      askPlan: "أوشكنا على الانتهاء! اختر خطتك:",
      welcomeComplete: "🎉 *مرحباً بك!*\n\nاكتمل ملفك الشخصي. لنبدأ التعلم!\n\nجرب كتابة شيء بلغتك المستهدفة، أو استخدم /lesson لبدء درس!",
      invalidInput: "يرجى تقديم إجابة صحيحة.",
      freePlan: "📦 *الخطة المجانية*\n✓ 10 رسائل/يوم\n✓ دروس أساسية (A1-A2)\n✓ دعم المجتمع",
      premiumPlan: "⭐ *الخطة المميزة*\n✓ رسائل غير محدودة\n✓ جميع الدروس (A1-C2)\n✓ تمارين مخصصة\n✓ تقارير التقدم\n✓ دعم ذو أولوية\n\n€9.99/شهر - 7 أيام تجربة مجانية"
    },
    de: {
      askTargetLanguage: "Welche Sprache möchtest du lernen?",
      askName: "Super! Wie heißt du?",
      askNativeLanguage: "Was ist deine Muttersprache?",
      askLevel: "Was ist dein aktuelles Niveau?\n\nWähle dein Niveau oder mache einen kurzen Test:",
      askLearningGoal: "Warum lernst du diese Sprache?",
      askPlan: "Fast fertig! Wähle deinen Plan:",
      welcomeComplete: "🎉 *Willkommen!*\n\nDein Profil ist komplett. Lass uns anfangen!\n\nSchreibe etwas in deiner Zielsprache oder benutze /lesson für eine Lektion!",
      invalidInput: "Bitte gib eine gültige Antwort.",
      freePlan: "📦 *KOSTENLOSER PLAN*\n✓ 10 Nachrichten/Tag\n✓ Basis-Lektionen (A1-A2)\n✓ Community-Support",
      premiumPlan: "⭐ *PREMIUM PLAN*\n✓ Unbegrenzte Nachrichten\n✓ Alle Lektionen (A1-C2)\n✓ Personalisierte Übungen\n✓ Fortschrittsberichte\n✓ Prioritäts-Support\n\n€9.99/Monat - 7 Tage kostenlos testen"
    }
  };

  return messages[lang] || messages.en;
}

/**
 * Handle registration step based on current user state
 */
export async function handleRegistrationStep(chatId, telegramId, userInput, user, forceStep = null) {
  const currentStep = forceStep !== null ? forceStep : user.registration_step;
  const lang = user.preferred_language || 'en';
  const msg = getMessages(lang);

  console.log('📝 Registration step handler called:', {
    currentStep,
    forceStep,
    lang,
    userId: user?.id
  });

  try {
    switch (currentStep) {
      case 0:
        console.log('Step 0: Language selected, moving to step 1 (target language)');
        await askForTargetLanguage(chatId, lang, msg);
        await updateRegistrationStep(user.id, 1);
        console.log('✅ Step 0 completed');
        break;

      case 1:
        // Target language — typically handled by callback (target_*), but can handle text
        console.log('Step 1: Waiting for target language callback');
        await sendMessage(chatId, msg.askTargetLanguage);
        break;

      case 2:
        // Save name and ask for native language
        if (!userInput || userInput.trim().length < 2) {
          await sendMessage(chatId, msg.invalidInput);
          return;
        }

        await updateRegistrationStep(user.id, 3, { name: userInput.trim() });
        await updateUserProfile(user.id, { display_name: userInput.trim() });
        await askForNativeLanguage(chatId, lang, msg);
        break;

      case 3:
        // Save native language and ask for level
        if (!userInput || userInput.trim().length < 2) {
          await sendMessage(chatId, msg.invalidInput);
          return;
        }

        await updateRegistrationStep(user.id, 4, { native_language: userInput.trim() });
        await updateUserProfile(user.id, { native_language: userInput.trim() });
        await askForLevel(chatId, lang, msg);
        break;

      case 4:
        // Save level and ask for learning goal
        if (userInput && userInput.trim().length > 0) {
          const level = userInput.trim().toUpperCase();
          if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
            await updateRegistrationStep(user.id, 5, { level: level });
            await updateUserProfile(user.id, { german_level: level, target_level: level });
            await askForLearningGoal(chatId, lang, msg);
          } else {
            await sendMessage(chatId, msg.invalidInput + "\nPlease choose: A1, A2, B1, B2, C1, or C2");
          }
        }
        break;

      case 5:
        // Save learning goal and ask for plan
        if (!userInput || userInput.trim().length < 2) {
          await sendMessage(chatId, msg.invalidInput);
          return;
        }

        await updateRegistrationStep(user.id, 6, { learning_goal: userInput.trim() });
        await updateUserProfile(user.id, { learning_goal: userInput.trim() });
        await askForPlan(chatId, lang, msg, telegramId);
        break;

      case 6:
        // Plan selection - typically handled by callback, but can handle text too
        const plan = userInput?.trim().toLowerCase();
        if (plan === 'free' || plan === 'kostenlos' || plan === 'gratuit' || plan === 'مجاني') {
          await completeFreeRegistration(chatId, user, lang, msg);
        } else if (plan === 'premium') {
          await initiatePremiumSignup(chatId, telegramId, user, lang, msg);
        } else {
          await sendMessage(chatId, msg.invalidInput);
        }
        break;

      default:
        // Unknown step, restart
        await updateRegistrationStep(user.id, 0);
        await sendMessage(chatId, "Let's start over. Type /start to begin!");
    }
  } catch (error) {
    console.error('❌ Error in registration step:', error);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('Current step:', currentStep);
    console.error('User ID:', user?.id);

    try {
      await sendMessage(chatId, 'Ein Fehler ist aufgetreten. Bitte versuche /start erneut.');
    } catch (sendError) {
      console.error('Could not send error message:', sendError);
    }
  }
}

// ============================================================================
// STEP FUNCTIONS
// ============================================================================

async function askForTargetLanguage(chatId, lang, msg) {
  const buttons = Object.entries(TARGET_LANGUAGES).map(([code, names]) => ({
    text: `${names.flag} ${names[lang] || names.en}`,
    callback_data: `target_${code}`
  }));

  // Create rows of 2 buttons each
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  await sendMessage(chatId, msg.askTargetLanguage, createInlineKeyboard(rows));
}

async function askForName(chatId, lang, msg) {
  console.log('💬 Asking for name in language:', lang);
  await sendMessage(chatId, msg.askName);
  console.log('✅ Name question sent');
}

async function askForNativeLanguage(chatId, lang, msg) {
  const commonLanguages = [
    ['🇬🇧 English', '🇫🇷 Français'],
    ['🇸🇦 العربية', '🇪🇸 Español'],
    ['🇹🇷 Türkçe', '🇷🇺 Русский'],
    ['🇩🇪 Deutsch', 'Other / Andere']
  ];

  await sendMessage(
    chatId,
    msg.askNativeLanguage,
    {
      reply_markup: {
        keyboard: commonLanguages,
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
}

async function askForLevel(chatId, lang, msg) {
  const levels = [
    [
      { text: 'A1 - Beginner', callback_data: 'level_A1' },
      { text: 'A2 - Elementary', callback_data: 'level_A2' }
    ],
    [
      { text: 'B1 - Intermediate', callback_data: 'level_B1' },
      { text: 'B2 - Upper Intermediate', callback_data: 'level_B2' }
    ],
    [
      { text: 'C1 - Advanced', callback_data: 'level_C1' },
      { text: 'C2 - Proficient', callback_data: 'level_C2' }
    ],
    [
      { text: '❓ Not sure - Take a test', callback_data: 'level_test' }
    ]
  ];

  await sendMessage(chatId, msg.askLevel, createInlineKeyboard(levels));
}

async function askForLearningGoal(chatId, lang, msg) {
  const goals = [
    ['🎓 Study abroad', '💼 Work'],
    ['✈️ Travel', '❤️ Personal interest'],
    ['Other / Andere']
  ];

  await sendMessage(
    chatId,
    msg.askLearningGoal,
    {
      reply_markup: {
        keyboard: goals,
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
}

async function askForPlan(chatId, lang, msg, telegramId) {
  const planButtons = [
    [{ text: '📦 Start Free', callback_data: 'plan_free' }],
    [{ text: '⭐ Try Premium (7 days free)', callback_data: 'plan_premium' }]
  ];

  const planText = `${msg.askPlan}\n\n` +
    `${msg.freePlan}\n\n` +
    `${msg.premiumPlan}`;

  await sendMessage(chatId, planText, createInlineKeyboard(planButtons));
}

// ============================================================================
// COMPLETION FUNCTIONS
// ============================================================================

async function completeFreeRegistration(chatId, user, lang, msg) {
  // Mark registration as complete via step 7
  await updateRegistrationStep(user.id, 7);
  await updateUserProfile(user.id, {
    subscription_tier: 'free',
    daily_message_limit: 10
  });

  await sendMessage(chatId, msg.welcomeComplete);

  // Send a tip about premium
  setTimeout(async () => {
    await sendMessage(
      chatId,
      "💡 *Tip:* You can upgrade to Premium anytime with /upgrade for unlimited learning!"
    );
  }, 2000);
}

async function initiatePremiumSignup(chatId, telegramId, user, lang, msg) {
  // Mark registration as complete via step 7, will upgrade after payment
  await updateRegistrationStep(user.id, 7);
  await updateUserProfile(user.id, {
    subscription_tier: 'free', // Will upgrade after payment
    daily_message_limit: 10
  });

  const checkoutUrl = `${process.env.BACKEND_URL}/api/payments/checkout?telegram_id=${telegramId}`;

  await sendMessage(
    chatId,
    "🎉 Great choice!\n\n" +
    "To complete your Premium subscription, click the button below:\n\n" +
    "*Remember:* 7 days free trial, cancel anytime!",
    createInlineKeyboard([
      [{ text: '💳 Complete Payment', url: checkoutUrl }],
      [{ text: '⬅️ Back to Free', callback_data: 'plan_free' }]
    ])
  );
}

/**
 * Handle target language selection callback
 */
export async function handleTargetLanguageSelection(chatId, telegramId, targetLang) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return;

  const lang = user.preferred_language || 'en';
  const msg = getMessages(lang);

  // Save target language and move to step 2 (name)
  await updateRegistrationStep(user.id, 2, { target_language: targetLang });
  await updateUserProfile(user.id, { target_language: targetLang });

  // Ask for name
  await askForName(chatId, lang, msg);
}

/**
 * Handle level selection callback
 */
export async function handleLevelSelection(chatId, telegramId, level) {
  const user = await getUserByTelegramId(telegramId);

  if (level === 'test') {
    // TODO: Implement level test in future phase
    await sendMessage(
      chatId,
      "Level test coming soon! For now, please select your estimated level:",
      createInlineKeyboard([
        [
          { text: 'A1', callback_data: 'level_A1' },
          { text: 'A2', callback_data: 'level_A2' },
          { text: 'B1', callback_data: 'level_B1' }
        ],
        [
          { text: 'B2', callback_data: 'level_B2' },
          { text: 'C1', callback_data: 'level_C1' },
          { text: 'C2', callback_data: 'level_C2' }
        ]
      ])
    );
  } else {
    // Save level and continue to step 5 (learning goal)
    await updateRegistrationStep(user.id, 5, { level: level });
    await updateUserProfile(user.id, { german_level: level, target_level: level });

    const lang = user.preferred_language || 'en';
    const msg = getMessages(lang);
    await askForLearningGoal(chatId, lang, msg);
  }
}

/**
 * Handle plan selection callback
 */
export async function handlePlanSelection(chatId, telegramId, plan) {
  const user = await getUserByTelegramId(telegramId);
  const lang = user.preferred_language || 'en';
  const msg = getMessages(lang);

  if (plan === 'free') {
    await completeFreeRegistration(chatId, user, lang, msg);
  } else if (plan === 'premium') {
    await initiatePremiumSignup(chatId, telegramId, user, lang, msg);
  }
}
