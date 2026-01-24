/**
 * TELEGRAM BOT HANDLER
 * Processes incoming messages and commands from Telegram
 */

import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import {
  getUserByTelegramId,
  createUserProfile,
  updateRegistrationStep,
  updateUserProfile
} from '../services/supabase.service.js';
import {
  handleRegistrationStep,
  handleLevelSelection,
  handlePlanSelection
} from '../services/registration.service.js';

dotenv.config();

// Initialize bot (webhook mode - no polling)
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Send message with optional keyboard
 */
async function sendMessage(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...options
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Send inline keyboard
 */
function createInlineKeyboard(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

/**
 * Send reply keyboard
 */
function createReplyKeyboard(buttons, options = {}) {
  return {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: true,
      ...options
    }
  };
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * /start command - Begin registration or welcome back
 */
async function handleStartCommand(msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;

  try {
    // Check if user exists
    const existingUser = await getUserByTelegramId(telegramId);

    if (existingUser && existingUser.registration_completed) {
      // User already registered - welcome back
      await sendMessage(
        chatId,
        `Willkommen zurück, ${existingUser.display_name}! 🇩🇪\n\n` +
        `Level: ${existingUser.german_level || 'A1'}\n` +
        `XP: ${existingUser.experience_points} Punkte\n` +
        `Streak: ${existingUser.streak_days} Tage 🔥\n\n` +
        `Schreib mir etwas auf Deutsch oder wähle eine Option:`,
        createInlineKeyboard([
          [{ text: '📚 Neue Lektion', callback_data: 'lesson_new' }],
          [{ text: '📊 Mein Fortschritt', callback_data: 'progress' }],
          [{ text: '⚙️ Einstellungen', callback_data: 'settings' }]
        ])
      );
    } else {
      // New user or incomplete registration - start registration
      await sendMessage(
        chatId,
        `*Willkommen beim Deutschlehrer Bot!* 🇩🇪\n\n` +
        `Ich helfe dir, Deutsch zu lernen - personalisiert und interaktiv.\n\n` +
        `Lass uns beginnen! In welcher Sprache möchtest du mit mir sprechen?`,
        createInlineKeyboard([
          [
            { text: '🇬🇧 English', callback_data: 'lang_en' },
            { text: '🇫🇷 Français', callback_data: 'lang_fr' }
          ],
          [
            { text: '🇸🇦 العربية', callback_data: 'lang_ar' }
          ]
        ])
      );
    }
  } catch (error) {
    console.error('Error in /start command:', error);
    await sendMessage(chatId, 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
  }
}

/**
 * /help command
 */
async function handleHelpCommand(msg) {
  const chatId = msg.chat.id;

  const helpText = `
*Deutschlehrer Bot - Hilfe* 🇩🇪

*Befehle:*
/start - Bot starten oder neu beginnen
/help - Diese Hilfe anzeigen
/stats - Deine Statistiken
/lesson - Neue Lektion starten

*So funktioniert's:*
1️⃣ Schreibe mir etwas auf Deutsch
2️⃣ Ich korrigiere deine Fehler
3️⃣ Sammle XP und erreiche neue Level
4️⃣ Schalte Achievements frei

*Premium Features:*
⭐ Unbegrenzte Nachrichten
⭐ Alle Lektionen (A1-C2)
⭐ Personalisierte Übungen
⭐ Fortschritts-Reports

Tippe /upgrade für mehr Infos zu Premium!
  `;

  await sendMessage(chatId, helpText.trim());
}

/**
 * /stats command
 */
async function handleStatsCommand(msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      await sendMessage(chatId, 'Bitte starte zuerst mit /start');
      return;
    }

    const statsText = `
*Deine Statistiken* 📊

👤 Name: ${user.display_name}
🎯 Level: ${user.current_level}
⭐ XP: ${user.experience_points} Punkte
🔥 Streak: ${user.streak_days} Tage
📚 Deutsch-Level: ${user.german_level || 'Noch nicht getestet'}

💎 Plan: ${user.subscription_tier === 'premium' ? 'Premium ⭐' : 'Free'}
${user.subscription_tier === 'free' ? `💬 Nachrichten heute: ${user.daily_message_count}/${user.daily_message_limit}` : '💬 Unbegrenzte Nachrichten'}

${user.subscription_tier === 'free' ? '\nTippe /upgrade für Premium!' : ''}
    `.trim();

    await sendMessage(chatId, statsText);
  } catch (error) {
    console.error('Error in /stats command:', error);
    await sendMessage(chatId, 'Fehler beim Laden deiner Statistiken.');
  }
}

/**
 * /upgrade command
 */
async function handleUpgradeCommand(msg) {
  const chatId = msg.chat.id;

  const upgradeText = `
*Upgrade zu Premium!* ⭐

*Was du bekommst:*
✅ Unbegrenzte Nachrichten
✅ Alle Lektionen (A1-C2)
✅ Personalisierte Übungen
✅ Wöchentliche Fortschritts-Reports
✅ PDF/CSV Export
✅ Prioritäts-Support

*Preis:* Nur €9.99/Monat
*Trial:* 7 Tage kostenlos testen!

Bereit für Premium?
  `.trim();

  await sendMessage(
    chatId,
    upgradeText,
    createInlineKeyboard([
      [{ text: '🚀 Jetzt upgraden!', url: `${process.env.BACKEND_URL}/api/payments/checkout?telegram_id=${msg.from.id}` }],
      [{ text: '❌ Vielleicht später', callback_data: 'cancel' }]
    ])
  );
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

/**
 * Handle incoming text messages
 */
async function handleTextMessage(msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = msg.text;

  try {
    // Get or create user
    let user = await getUserByTelegramId(telegramId);

    if (!user) {
      // New user - create basic profile
      user = await createUserProfile({
        telegram_id: telegramId,
        display_name: msg.from.first_name || msg.from.username || 'User',
        registration_source: 'telegram',
        registration_step: 0,
        registration_completed: false
      });
    }

    // If registration not completed, handle registration flow
    if (!user.registration_completed) {
      await handleRegistrationStep(chatId, telegramId, text, user);
      return;
    }

    // Check message limits for free users
    if (user.subscription_tier === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const lastReset = user.last_message_reset?.split('T')[0];

      let messageCount = user.daily_message_count;

      if (lastReset !== today) {
        messageCount = 0;
        await updateUserProfile(user.id, {
          daily_message_count: 0,
          last_message_reset: today
        });
      }

      if (messageCount >= user.daily_message_limit) {
        await sendMessage(
          chatId,
          `Du hast dein Tageslimit von ${user.daily_message_limit} Nachrichten erreicht! 😔\n\n` +
          `Upgrade zu Premium für unbegrenzte Nachrichten!`,
          createInlineKeyboard([
            [{ text: '⭐ Jetzt upgraden', callback_data: 'upgrade' }]
          ])
        );
        return;
      }
    }

    // TODO: Handle actual chat message with AI
    // For now, just echo
    await sendMessage(
      chatId,
      `Du hast geschrieben: "${text}"\n\n` +
      `(AI Antwort kommt in der nächsten Phase!)`
    );

  } catch (error) {
    console.error('Error handling text message:', error);
    await sendMessage(chatId, 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
  }
}

/**
 * Handle callback queries (button clicks)
 */
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const telegramId = callbackQuery.from.id;

  try {
    // Acknowledge callback
    await bot.answerCallbackQuery(callbackQuery.id);

    // Handle different callbacks
    if (data.startsWith('lang_')) {
      // Language selection
      const language = data.replace('lang_', '');
      const user = await getUserByTelegramId(telegramId);

      await updateUserProfile(user.id, {
        preferred_language: language
      });

      // Continue to next registration step
      await handleRegistrationStep(chatId, telegramId, null, user, 1);

    } else if (data.startsWith('level_')) {
      // Level selection during registration
      const level = data.replace('level_', '');
      await handleLevelSelection(chatId, telegramId, level);

    } else if (data.startsWith('plan_')) {
      // Plan selection during registration
      const plan = data.replace('plan_', '');
      await handlePlanSelection(chatId, telegramId, plan);

    } else if (data === 'upgrade') {
      await handleUpgradeCommand(callbackQuery.message);

    } else if (data === 'lesson_new') {
      await sendMessage(chatId, '📚 Lektion wird geladen... (Coming soon!)');

    } else if (data === 'progress') {
      await handleStatsCommand(callbackQuery.message);

    } else if (data === 'settings') {
      await sendMessage(chatId, '⚙️ Einstellungen (Coming soon!)');

    } else if (data === 'cancel') {
      await sendMessage(chatId, 'Okay! Wenn du bereit bist, tippe /upgrade');
    }

  } catch (error) {
    console.error('Error handling callback query:', error);
  }
}

// ============================================================================
// WEBHOOK PROCESSOR
// ============================================================================

/**
 * Process incoming webhook update from Telegram
 */
export async function processUpdate(update) {
  try {
    if (update.message) {
      const msg = update.message;

      // Handle commands
      if (msg.text?.startsWith('/')) {
        const command = msg.text.split(' ')[0].substring(1);

        switch (command) {
          case 'start':
            await handleStartCommand(msg);
            break;
          case 'help':
            await handleHelpCommand(msg);
            break;
          case 'stats':
            await handleStatsCommand(msg);
            break;
          case 'upgrade':
            await handleUpgradeCommand(msg);
            break;
          default:
            await sendMessage(msg.chat.id, 'Unbekannter Befehl. Tippe /help für Hilfe.');
        }
      } else if (msg.text) {
        // Handle regular text message
        await handleTextMessage(msg);
      }
    } else if (update.callback_query) {
      // Handle button clicks
      await handleCallbackQuery(update.callback_query);
    }
  } catch (error) {
    console.error('Error processing update:', error);
    throw error;
  }
}

// Export bot instance for external use
export { bot, sendMessage, createInlineKeyboard };
