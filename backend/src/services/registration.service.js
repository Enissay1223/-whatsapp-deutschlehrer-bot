/**
 * USER REGISTRATION SERVICE
 * Handles multi-step registration flow for Telegram users
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
// Step 0: Language selection (handled in bot.handler)
// Step 1: Name
// Step 2: Native language
// Step 3: German level
// Step 4: Learning goal
// Step 5: Plan selection (Free/Premium)
// ============================================================================

/**
 * Get localized messages based on user's preferred language
 */
function getMessages(lang = 'en') {
  const messages = {
    en: {
      askName: "Great! What's your name?",
      askNativeLanguage: "What's your native language?",
      askGermanLevel: "How good is your German?\n\nChoose your level or take a quick test:",
      askLearningGoal: "Why are you learning German?",
      askPlan: "Almost done! Choose your plan:",
      welcomeComplete: "🎉 *Welcome aboard!*\n\nYour profile is complete. Let's start learning German!\n\nTry typing something in German, or use /lesson to start a lesson!",
      invalidInput: "Please provide a valid answer.",
      freePlan: "📦 *FREE PLAN*\n✓ 10 messages/day\n✓ Basic lessons (A1-A2)\n✓ Community support",
      premiumPlan: "⭐ *PREMIUM PLAN*\n✓ Unlimited messages\n✓ All lessons (A1-C2)\n✓ Personalized exercises\n✓ Progress reports\n✓ Priority support\n\n€9.99/month - 7 days free trial"
    },
    fr: {
      askName: "Super ! Comment t'appelles-tu ?",
      askNativeLanguage: "Quelle est ta langue maternelle ?",
      askGermanLevel: "Quel est ton niveau d'allemand ?\n\nChoisis ton niveau ou fais un test rapide :",
      askLearningGoal: "Pourquoi apprends-tu l'allemand ?",
      askPlan: "Presque fini ! Choisis ton plan :",
      welcomeComplete: "🎉 *Bienvenue !*\n\nTon profil est complet. Commençons à apprendre l'allemand !\n\nEssaie d'écrire quelque chose en allemand ou utilise /lesson pour commencer une leçon !",
      invalidInput: "Merci de fournir une réponse valide.",
      freePlan: "📦 *PLAN GRATUIT*\n✓ 10 messages/jour\n✓ Leçons basiques (A1-A2)\n✓ Support communautaire",
      premiumPlan: "⭐ *PLAN PREMIUM*\n✓ Messages illimités\n✓ Toutes les leçons (A1-C2)\n✓ Exercices personnalisés\n✓ Rapports de progrès\n✓ Support prioritaire\n\n€9.99/mois - 7 jours d'essai gratuit"
    },
    ar: {
      askName: "رائع! ما اسمك؟",
      askNativeLanguage: "ما هي لغتك الأم؟",
      askGermanLevel: "ما هو مستواك في اللغة الألمانية؟\n\nاختر مستواك أو قم بإجراء اختبار سريع:",
      askLearningGoal: "لماذا تتعلم الألمانية؟",
      askPlan: "أوشكنا على الانتهاء! اختر خطتك:",
      welcomeComplete: "🎉 *مرحباً بك!*\n\nاكتمل ملفك الشخصي. لنبدأ تعلم الألمانية!\n\nجرب كتابة شيء باللغة الألمانية، أو استخدم /lesson لبدء درس!",
      invalidInput: "يرجى تقديم إجابة صحيحة.",
      freePlan: "📦 *الخطة المجانية*\n✓ 10 رسائل/يوم\n✓ دروس أساسية (A1-A2)\n✓ دعم المجتمع",
      premiumPlan: "⭐ *الخطة المميزة*\n✓ رسائل غير محدودة\n✓ جميع الدروس (A1-C2)\n✓ تمارين مخصصة\n✓ تقارير التقدم\n✓ دعم ذو أولوية\n\n€9.99/شهر - 7 أيام تجربة مجانية"
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
        console.log('Step 0: Moving to step 1 (name)');
        // Language already selected in bot.handler, move to step 1
        await askForName(chatId, lang, msg);
        await updateRegistrationStep(user.id, 1);
        console.log('✅ Step 0 completed');
        break;

      case 1:
        // Save name and ask for native language
        if (!userInput || userInput.trim().length < 2) {
          await sendMessage(chatId, msg.invalidInput);
          return;
        }

        await updateRegistrationStep(user.id, 2, { name: userInput.trim() });
        await updateUserProfile(user.id, { display_name: userInput.trim() });
        await askForNativeLanguage(chatId, lang, msg);
        break;

      case 2:
        // Save native language and ask for German level
        if (!userInput || userInput.trim().length < 2) {
          await sendMessage(chatId, msg.invalidInput);
          return;
        }

        await updateRegistrationStep(user.id, 3, { native_language: userInput.trim() });
        await updateUserProfile(user.id, { native_language: userInput.trim() });
        await askForGermanLevel(chatId, lang, msg);
        break;

      case 3:
        // Save German level and ask for learning goal
        // This step can also be triggered by callback (level selection)
        if (userInput && userInput.trim().length > 0) {
          const level = userInput.trim().toUpperCase();
          if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
            await updateRegistrationStep(user.id, 4, { german_level: level });
            await updateUserProfile(user.id, { german_level: level });
            await askForLearningGoal(chatId, lang, msg);
          } else {
            await sendMessage(chatId, msg.invalidInput + "\nPlease choose: A1, A2, B1, B2, C1, or C2");
          }
        }
        break;

      case 4:
        // Save learning goal and ask for plan
        if (!userInput || userInput.trim().length < 2) {
          await sendMessage(chatId, msg.invalidInput);
          return;
        }

        await updateRegistrationStep(user.id, 5, { learning_goal: userInput.trim() });
        await updateUserProfile(user.id, { learning_goal: userInput.trim() });
        await askForPlan(chatId, lang, msg, telegramId);
        break;

      case 5:
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
    ['Other / Andere']
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

async function askForGermanLevel(chatId, lang, msg) {
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

  await sendMessage(chatId, msg.askGermanLevel, createInlineKeyboard(levels));
}

async function askForLearningGoal(chatId, lang, msg) {
  const goals = [
    ['🎓 Study in Germany', '💼 Work'],
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
  // Mark registration as complete
  await updateUserProfile(user.id, {
    registration_completed: true,
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
  // For now, just complete registration and show payment link
  // TODO: Integrate actual Stripe checkout in Phase 3

  await updateUserProfile(user.id, {
    registration_completed: true,
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
    // Save level and continue
    await updateRegistrationStep(user.id, 4, { german_level: level });
    await updateUserProfile(user.id, { german_level: level });

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
