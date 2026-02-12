/**
 * USER REGISTRATION SERVICE
 * Handles multi-step registration flow for Telegram users
 * Supports multi-language learning (not just German)
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
// Step 1: Target language selection (which language to learn)
// Step 2: Name
// Step 3: Native language
// Step 4: Target language level (A1-C2)
// Step 5: Learning goal
// Step 6: Plan selection (Free/Premium)
// Step 7: Complete
// ============================================================================

// Supported target languages for learning
const TARGET_LANGUAGES = {
  de: { en: 'German', fr: 'allemand', ar: 'الألمانية', de: 'Deutsch', flag: '🇩🇪' },
  en: { en: 'English', fr: 'anglais', ar: 'الإنجليزية', de: 'Englisch', flag: '🇬🇧' },
  fr: { en: 'French', fr: 'français', ar: 'الفرنسية', de: 'Französisch', flag: '🇫🇷' },
  ar: { en: 'Arabic', fr: 'arabe', ar: 'العربية', de: 'Arabisch', flag: '🇸🇦' },
  es: { en: 'Spanish', fr: 'espagnol', ar: 'الإسبانية', de: 'Spanisch', flag: '🇪🇸' },
  tr: { en: 'Turkish', fr: 'turc', ar: 'التركية', de: 'Türkisch', flag: '🇹🇷' }
};

/**
 * Get the name of a target language in the user's UI language
 */
function getTargetLanguageName(targetLang, uiLang) {
  return TARGET_LANGUAGES[targetLang]?.[uiLang] || TARGET_LANGUAGES[targetLang]?.en || targetLang;
}

/**
 * Get localized messages based on user's preferred language
 */
function getMessages(lang = 'en', targetLang = 'de') {
  const targetName = getTargetLanguageName(targetLang, lang);

  const messages = {
    en: {
      askTargetLanguage: "Which language would you like to learn?",
      askName: "Great! What's your name?",
      askNativeLanguage: "What's your native language?",
      askLevel: `How good is your ${targetName}?\n\nChoose your level or take a quick test:`,
      askLearningGoal: `Why are you learning ${targetName}?`,
      askPlan: "Almost done! Choose your plan:",
      welcomeComplete: `🎉 *Welcome aboard!*\n\nYour profile is complete. Let's start learning ${targetName}!\n\nTry typing something in ${targetName}, or use /lesson to start a lesson!`,
      invalidInput: "Please provide a valid answer.",
      freePlan: "📦 *FREE PLAN*\n✓ 10 messages/day\n✓ Basic lessons (A1-A2)\n✓ Community support",
      premiumPlan: "⭐ *PREMIUM PLAN*\n✓ Unlimited messages\n✓ All lessons (A1-C2)\n✓ Personalized exercises\n✓ Progress reports\n✓ Priority support\n\n€9.99/month - 7 days free trial"
    },
    fr: {
      askTargetLanguage: "Quelle langue aimerais-tu apprendre ?",
      askName: "Super ! Comment t'appelles-tu ?",
      askNativeLanguage: "Quelle est ta langue maternelle ?",
      askLevel: `Quel est ton niveau en ${targetName} ?\n\nChoisis ton niveau ou fais un test rapide :`,
      askLearningGoal: `Pourquoi apprends-tu le ${targetName} ?`,
      askPlan: "Presque fini ! Choisis ton plan :",
      welcomeComplete: `🎉 *Bienvenue !*\n\nTon profil est complet. Commençons à apprendre le ${targetName} !\n\nEssaie d'écrire quelque chose en ${targetName} ou utilise /lesson pour commencer une leçon !`,
      invalidInput: "Merci de fournir une réponse valide.",
      freePlan: "📦 *PLAN GRATUIT*\n✓ 10 messages/jour\n✓ Leçons basiques (A1-A2)\n✓ Support communautaire",
      premiumPlan: "⭐ *PLAN PREMIUM*\n✓ Messages illimités\n✓ Toutes les leçons (A1-C2)\n✓ Exercices personnalisés\n✓ Rapports de progrès\n✓ Support prioritaire\n\n€9.99/mois - 7 jours d'essai gratuit"
    },
    ar: {
      askTargetLanguage: "أي لغة تريد أن تتعلم؟",
      askName: "رائع! ما اسمك؟",
      askNativeLanguage: "ما هي لغتك الأم؟",
      askLevel: `ما هو مستواك في ${targetName}؟\n\nاختر مستواك أو قم بإجراء اختبار سريع:`,
      askLearningGoal: `لماذا تتعلم ${targetName}؟`,
      askPlan: "أوشكنا على الانتهاء! اختر خطتك:",
      welcomeComplete: `🎉 *مرحباً بك!*\n\nاكتمل ملفك الشخصي. لنبدأ تعلم ${targetName}!\n\nجرب كتابة شيء بـ${targetName}، أو استخدم /lesson لبدء درس!`,
      invalidInput: "يرجى تقديم إجابة صحيحة.",
      freePlan: "📦 *الخطة المجانية*\n✓ 10 رسائل/يوم\n✓ دروس أساسية (A1-A2)\n✓ دعم المجتمع",
      premiumPlan: "⭐ *الخطة المميزة*\n✓ رسائل غير محدودة\n✓ جميع الدروس (A1-C2)\n✓ تمارين مخصصة\n✓ تقارير التقدم\n✓ دعم ذو أولوية\n\n€9.99/شهر - 7 أيام تجربة مجانية"
    },
    de: {
      askTargetLanguage: "Welche Sprache möchtest du lernen?",
      askName: "Super! Wie heißt du?",
      askNativeLanguage: "Was ist deine Muttersprache?",
      askLevel: `Wie gut ist dein ${targetName}?\n\nWähle dein Niveau oder mache einen schnellen Test:`,
      askLearningGoal: `Warum lernst du ${targetName}?`,
      askPlan: "Fast fertig! Wähle deinen Plan:",
      welcomeComplete: `🎉 *Willkommen!*\n\nDein Profil ist vollständig. Lass uns ${targetName} lernen!\n\nSchreib etwas auf ${targetName}, oder nutze /lesson für eine Lektion!`,
      invalidInput: "Bitte gib eine gültige Antwort.",
      freePlan: "📦 *KOSTENLOSER PLAN*\n✓ 10 Nachrichten/Tag\n✓ Basislektionen (A1-A2)\n✓ Community-Support",
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
  const targetLang = user.target_language || 'de';
  const msg = getMessages(lang, targetLang);

  console.log('📝 Registration step handler called:', {
    currentStep,
    forceStep,
    lang,
    targetLang,
    userId: user?.id
  });

  try {
    switch (currentStep) {
      case 0:
        // Language already selected in bot.handler, ask for target language
        console.log('Step 0: Moving to step 1 (target language)');
        await askForTargetLanguage(chatId, lang, msg);
        await updateRegistrationStep(user.id, 1);
        console.log('✅ Step 0 completed');
        break;

      case 1:
        // Target language selection - typically handled by callback
        // but handle text fallback
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
        // Save native language and ask for target level
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
        // This step can also be triggered by callback (level selection)
        if (userInput && userInput.trim().length > 0) {
          const level = userInput.trim().toUpperCase();
          if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
            await updateRegistrationStep(user.id, 5, { target_level: level });
            await updateUserProfile(user.id, {
              german_level: level,
              target_level: level
            });
            await askForLearningGoal(chatId, lang, msg);
          } else {
            await sendMessage(chatId, msg.invalidInput + "\nA1, A2, B1, B2, C1, C2");
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
        // eslint-disable-next-line no-case-declarations
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
      const errorMessages = {
        en: 'An error occurred. Please try /start again.',
        fr: 'Une erreur est survenue. Veuillez réessayer /start.',
        ar: 'حدث خطأ. يرجى المحاولة /start مرة أخرى.',
        de: 'Ein Fehler ist aufgetreten. Bitte versuche /start erneut.'
      };
      await sendMessage(chatId, errorMessages[lang] || errorMessages.en);
    } catch (sendError) {
      console.error('Could not send error message:', sendError);
    }
  }
}

// ============================================================================
// STEP FUNCTIONS
// ============================================================================

async function askForTargetLanguage(chatId, lang, msg) {
  const buttons = [
    [
      { text: '🇩🇪 Deutsch', callback_data: 'target_de' },
      { text: '🇬🇧 English', callback_data: 'target_en' }
    ],
    [
      { text: '🇫🇷 Français', callback_data: 'target_fr' },
      { text: '🇸🇦 العربية', callback_data: 'target_ar' }
    ],
    [
      { text: '🇪🇸 Español', callback_data: 'target_es' },
      { text: '🇹🇷 Türkçe', callback_data: 'target_tr' }
    ]
  ];

  await sendMessage(chatId, msg.askTargetLanguage, createInlineKeyboard(buttons));
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
  const goalLabels = {
    en: [
      ['🎓 Study abroad', '💼 Work'],
      ['✈️ Travel', '❤️ Personal interest'],
      ['Other']
    ],
    fr: [
      ['🎓 Études', '💼 Travail'],
      ['✈️ Voyage', '❤️ Intérêt personnel'],
      ['Autre']
    ],
    ar: [
      ['🎓 الدراسة', '💼 العمل'],
      ['✈️ السفر', '❤️ اهتمام شخصي'],
      ['آخر']
    ],
    de: [
      ['🎓 Studium', '💼 Arbeit'],
      ['✈️ Reisen', '❤️ Persönliches Interesse'],
      ['Andere']
    ]
  };

  const goals = goalLabels[lang] || goalLabels.en;

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
  const planButtonLabels = {
    en: ['📦 Start Free', '⭐ Try Premium (7 days free)'],
    fr: ['📦 Commencer gratuitement', '⭐ Essayer Premium (7 jours gratuits)'],
    ar: ['📦 ابدأ مجانًا', '⭐ جرب Premium (7 أيام مجانية)'],
    de: ['📦 Kostenlos starten', '⭐ Premium testen (7 Tage kostenlos)']
  };

  const labels = planButtonLabels[lang] || planButtonLabels.en;
  const planButtons = [
    [{ text: labels[0], callback_data: 'plan_free' }],
    [{ text: labels[1], callback_data: 'plan_premium' }]
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
  // Mark registration as complete (step 7 triggers registration_completed: true)
  await updateRegistrationStep(user.id, 7, { selected_plan: 'free' });
  await updateUserProfile(user.id, {
    subscription_tier: 'free',
    daily_message_limit: 10
  });

  await sendMessage(chatId, msg.welcomeComplete);

  // Send a tip about premium
  const tipMessages = {
    en: "💡 *Tip:* You can upgrade to Premium anytime with /upgrade for unlimited learning!",
    fr: "💡 *Astuce :* Tu peux passer à Premium à tout moment avec /upgrade !",
    ar: "💡 *نصيحة:* يمكنك الترقية إلى Premium في أي وقت باستخدام /upgrade!",
    de: "💡 *Tipp:* Du kannst jederzeit mit /upgrade auf Premium upgraden!"
  };
  setTimeout(async () => {
    await sendMessage(chatId, tipMessages[lang] || tipMessages.en);
  }, 2000);
}

async function initiatePremiumSignup(chatId, telegramId, user, lang, msg) {
  // Complete registration with free tier, upgrade after payment via Stripe webhook
  await updateRegistrationStep(user.id, 7, { selected_plan: 'premium_pending' });
  await updateUserProfile(user.id, {
    subscription_tier: 'free', // Will upgrade after payment
    daily_message_limit: 10
  });

  const checkoutUrl = `${process.env.BACKEND_URL}/api/payments/checkout?telegram_id=${telegramId}`;

  const premiumMessages = {
    en: "🎉 Great choice!\n\nTo complete your Premium subscription, click the button below:\n\n*Remember:* 7 days free trial, cancel anytime!",
    fr: "🎉 Excellent choix !\n\nPour compléter ton abonnement Premium, clique ci-dessous :\n\n*Rappel :* 7 jours d'essai gratuit, annulation à tout moment !",
    ar: "🎉 خيار رائع!\n\nلإكمال اشتراك Premium، اضغط على الزر أدناه:\n\n*تذكر:* 7 أيام تجربة مجانية، إلغاء في أي وقت!",
    de: "🎉 Tolle Wahl!\n\nUm dein Premium-Abo abzuschließen, klicke unten:\n\n*Denk daran:* 7 Tage kostenlos testen, jederzeit kündbar!"
  };

  const buttonLabels = {
    en: ['💳 Complete Payment', '⬅️ Back to Free'],
    fr: ['💳 Compléter le paiement', '⬅️ Retour au gratuit'],
    ar: ['💳 إتمام الدفع', '⬅️ العودة للمجاني'],
    de: ['💳 Zahlung abschließen', '⬅️ Zurück zu Kostenlos']
  };

  const labels = buttonLabels[lang] || buttonLabels.en;

  await sendMessage(
    chatId,
    premiumMessages[lang] || premiumMessages.en,
    createInlineKeyboard([
      [{ text: labels[0], url: checkoutUrl }],
      [{ text: labels[1], callback_data: 'plan_free' }]
    ])
  );
}

// ============================================================================
// CALLBACK HANDLERS
// ============================================================================

/**
 * Handle target language selection callback
 */
export async function handleTargetLanguageSelection(chatId, telegramId, targetLang) {
  const user = await getUserByTelegramId(telegramId);
  const lang = user.preferred_language || 'en';

  // Save target language and move to step 2 (name)
  await updateRegistrationStep(user.id, 2, { target_language: targetLang });
  await updateUserProfile(user.id, { target_language: targetLang });

  const msg = getMessages(lang, targetLang);
  await askForName(chatId, lang, msg);
}

/**
 * Handle level selection callback
 */
export async function handleLevelSelection(chatId, telegramId, level) {
  const user = await getUserByTelegramId(telegramId);

  if (level === 'test') {
    // TODO: Implement level test in future phase
    const testMessages = {
      en: "Level test coming soon! For now, please select your estimated level:",
      fr: "Test de niveau bientôt disponible ! Pour l'instant, sélectionne ton niveau estimé :",
      ar: "اختبار المستوى قريبًا! في الوقت الحالي، اختر مستواك التقديري:",
      de: "Einstufungstest kommt bald! Bitte wähle dein geschätztes Niveau:"
    };
    const lang = user.preferred_language || 'en';

    await sendMessage(
      chatId,
      testMessages[lang] || testMessages.en,
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
    // Save level and continue (updateRegistrationStep merges data)
    await updateRegistrationStep(user.id, 5, { target_level: level });
    await updateUserProfile(user.id, {
      german_level: level,
      target_level: level
    });

    const lang = user.preferred_language || 'en';
    const targetLang = user.target_language || 'de';
    const msg = getMessages(lang, targetLang);
    await askForLearningGoal(chatId, lang, msg);
  }
}

/**
 * Handle plan selection callback
 */
export async function handlePlanSelection(chatId, telegramId, plan) {
  const user = await getUserByTelegramId(telegramId);
  const lang = user.preferred_language || 'en';
  const targetLang = user.target_language || 'de';
  const msg = getMessages(lang, targetLang);

  if (plan === 'free') {
    await completeFreeRegistration(chatId, user, lang, msg);
  } else if (plan === 'premium') {
    await initiatePremiumSignup(chatId, telegramId, user, lang, msg);
  }
}

// Export target languages for use in other modules
export { TARGET_LANGUAGES, getTargetLanguageName };
