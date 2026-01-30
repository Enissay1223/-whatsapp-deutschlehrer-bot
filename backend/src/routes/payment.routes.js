/**
 * PAYMENT ROUTES
 * Handles Stripe checkout, webhooks, and subscription management
 */

import express from 'express';
import Stripe from 'stripe';
import {
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  handleSubscriptionUpdate,
  handleSubscriptionDeleted,
  handlePaymentSuccess
} from '../services/stripe.service.js';
import { getUserByTelegramId } from '../services/supabase.service.js';
import { sendMessage, createInlineKeyboard } from '../telegram/bot.handler.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ============================================================================
// CHECKOUT
// ============================================================================

/**
 * Create checkout session
 * GET /api/payments/checkout?telegram_id=123456
 */
router.get('/checkout', async (req, res) => {
  try {
    const { telegram_id } = req.query;

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    // Get user from database
    const user = await getUserByTelegramId(parseInt(telegram_id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already premium
    if (user.subscription_tier === 'premium' && user.subscription_status === 'active') {
      return res.redirect(`https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=already_premium`);
    }

    // Create checkout session
    const session = await createCheckoutSession(user.id, telegram_id);

    // Redirect to Stripe Checkout
    res.redirect(303, session.url);

  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * Payment success page
 * GET /api/payments/success?session_id=xxx
 */
router.get('/success', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).send('Missing session_id');
    }

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const telegramId = session.metadata.telegram_id;

    // Send success message to user via Telegram
    if (telegramId) {
      const successMessage = `
🎉 *Willkommen bei Premium!*

Dein Upgrade war erfolgreich! Du hast jetzt:

✅ Unbegrenzte Nachrichten
✅ Alle Lektionen (A1-C2)
✅ Personalisierte Übungen
✅ Wöchentliche Fortschritts-Reports
✅ PDF/CSV Export
✅ Prioritäts-Support

*7-Tage kostenlose Testphase aktiv!*

Viel Spaß beim Lernen! 🇩🇪
      `.trim();

      await sendMessage(telegramId, successMessage);
    }

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #667eea; }
          .checkmark { font-size: 80px; color: #4CAF50; }
          a {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1>Zahlung erfolgreich!</h1>
          <p>Dein Premium-Abo wurde aktiviert.</p>
          <p>Gehe zurück zu Telegram um loszulegen!</p>
          <a href="https://t.me/${process.env.TELEGRAM_BOT_USERNAME}">Zurück zum Bot</a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Success page error:', error);
    res.status(500).send('Error processing payment');
  }
});

/**
 * Payment canceled page
 * GET /api/payments/cancel
 */
router.get('/cancel', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Canceled</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          text-align: center;
          max-width: 400px;
        }
        h1 { color: #ff6b6b; }
        a {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 30px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Zahlung abgebrochen</h1>
        <p>Kein Problem! Du kannst jederzeit upgraden.</p>
        <a href="https://t.me/${process.env.TELEGRAM_BOT_USERNAME}">Zurück zum Bot</a>
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// STRIPE WEBHOOKS
// ============================================================================

/**
 * Stripe webhook endpoint
 * POST /api/payments/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('📨 Stripe webhook received:', event.type);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('✅ Checkout completed:', session.id);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('❌ Payment failed:', failedPayment.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Cancel subscription
 * POST /api/payments/cancel-subscription
 */
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { telegram_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const user = await getUserByTelegramId(parseInt(telegram_id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = await cancelSubscription(user.id);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      cancel_at: new Date(subscription.current_period_end * 1000).toISOString()
    });

  } catch (error) {
    console.error('❌ Cancel subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reactivate subscription
 * POST /api/payments/reactivate-subscription
 */
router.post('/reactivate-subscription', async (req, res) => {
  try {
    const { telegram_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const user = await getUserByTelegramId(parseInt(telegram_id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await reactivateSubscription(user.id);

    res.json({
      success: true,
      message: 'Subscription reactivated successfully'
    });

  } catch (error) {
    console.error('❌ Reactivate subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
