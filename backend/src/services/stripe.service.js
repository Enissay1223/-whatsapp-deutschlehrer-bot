/**
 * STRIPE SERVICE
 * Handles payment processing and subscription management
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import {
  getUserProfile,
  updateUserProfile,
  createPaymentTransaction,
  createSubscriptionEvent
} from './supabase.service.js';

dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Pricing
const PREMIUM_PRICE = 9.99; // EUR
const TRIAL_DAYS = 7;

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

/**
 * Create or retrieve Stripe customer for user
 */
export async function getOrCreateCustomer(userId) {
  try {
    const user = await getUserProfile(userId);

    // Check if customer already exists
    if (user.stripe_customer_id) {
      return await stripe.customers.retrieve(user.stripe_customer_id);
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: user.email || `user_${userId}@deutschlehrer.app`,
      metadata: {
        user_id: userId,
        telegram_id: user.telegram_id?.toString() || '',
        display_name: user.display_name || 'User'
      }
    });

    // Save customer ID to database
    await updateUserProfile(userId, {
      stripe_customer_id: customer.id
    });

    console.log('✅ Stripe customer created:', customer.id);
    return customer;

  } catch (error) {
    console.error('❌ Error creating Stripe customer:', error);
    throw error;
  }
}

// ============================================================================
// CHECKOUT SESSION
// ============================================================================

/**
 * Create Stripe Checkout Session for Premium subscription
 */
export async function createCheckoutSession(userId, telegramId) {
  try {
    const user = await getUserProfile(userId);
    const customer = await getOrCreateCustomer(userId);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Deutschlehrer Premium',
              description: 'Unlimited messages, all lessons (A1-C2), personalized exercises, and more!',
              images: ['https://your-domain.com/premium-icon.png']
            },
            recurring: {
              interval: 'month'
            },
            unit_amount: Math.round(PREMIUM_PRICE * 100) // Convert to cents
          },
          quantity: 1
        }
      ],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          user_id: userId,
          telegram_id: telegramId?.toString() || ''
        }
      },
      success_url: `${process.env.BACKEND_URL}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BACKEND_URL}/api/payments/cancel`,
      metadata: {
        user_id: userId,
        telegram_id: telegramId?.toString() || ''
      }
    });

    console.log('✅ Checkout session created:', session.id);
    return session;

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    throw error;
  }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Activate premium subscription for user
 */
export async function activatePremiumSubscription(userId, subscriptionId, customerId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const updates = {
      subscription_tier: 'premium',
      subscription_status: subscription.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_started_at: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      daily_message_limit: 999999, // Unlimited
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null
    };

    await updateUserProfile(userId, updates);

    // Log subscription event
    await createSubscriptionEvent({
      user_id: userId,
      event_type: 'subscription_created',
      old_tier: 'free',
      new_tier: 'premium',
      amount: PREMIUM_PRICE,
      currency: 'EUR',
      stripe_event_id: subscriptionId
    });

    console.log('✅ Premium subscription activated for user:', userId);
    return updates;

  } catch (error) {
    console.error('❌ Error activating premium subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId) {
  try {
    const user = await getUserProfile(userId);

    if (!user.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    // Cancel at period end (user keeps access until end of billing period)
    const subscription = await stripe.subscriptions.update(
      user.stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    );

    await updateUserProfile(userId, {
      subscription_status: 'canceling'
    });

    // Log event
    await createSubscriptionEvent({
      user_id: userId,
      event_type: 'subscription_canceled',
      old_tier: 'premium',
      new_tier: 'premium', // Still premium until period ends
      stripe_event_id: subscription.id
    });

    console.log('✅ Subscription set to cancel at period end:', subscription.current_period_end);
    return subscription;

  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Reactivate canceled subscription
 */
export async function reactivateSubscription(userId) {
  try {
    const user = await getUserProfile(userId);

    if (!user.stripe_subscription_id) {
      throw new Error('No subscription found');
    }

    const subscription = await stripe.subscriptions.update(
      user.stripe_subscription_id,
      {
        cancel_at_period_end: false
      }
    );

    await updateUserProfile(userId, {
      subscription_status: 'active'
    });

    console.log('✅ Subscription reactivated');
    return subscription;

  } catch (error) {
    console.error('❌ Error reactivating subscription:', error);
    throw error;
  }
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle subscription created/updated
 */
export async function handleSubscriptionUpdate(subscription) {
  try {
    const userId = subscription.metadata.user_id;

    if (!userId) {
      console.warn('⚠️ No user_id in subscription metadata');
      return;
    }

    await activatePremiumSubscription(
      userId,
      subscription.id,
      subscription.customer
    );

    console.log('✅ Subscription updated for user:', userId);

  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
    throw error;
  }
}

/**
 * Handle subscription deleted/canceled
 */
export async function handleSubscriptionDeleted(subscription) {
  try {
    const userId = subscription.metadata.user_id;

    if (!userId) {
      console.warn('⚠️ No user_id in subscription metadata');
      return;
    }

    // Downgrade to free
    await updateUserProfile(userId, {
      subscription_tier: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      daily_message_limit: 10
    });

    // Log event
    await createSubscriptionEvent({
      user_id: userId,
      event_type: 'subscription_deleted',
      old_tier: 'premium',
      new_tier: 'free',
      stripe_event_id: subscription.id
    });

    console.log('✅ User downgraded to free:', userId);

  } catch (error) {
    console.error('❌ Error handling subscription deletion:', error);
    throw error;
  }
}

/**
 * Handle payment success
 */
export async function handlePaymentSuccess(paymentIntent) {
  try {
    const customerId = paymentIntent.customer;
    const amount = paymentIntent.amount / 100; // Convert from cents

    // Find user by customer ID
    const { supabase } = await import('./supabase.service.js');
    const { data: user } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!user) {
      console.warn('⚠️ No user found for customer:', customerId);
      return;
    }

    // Log payment transaction
    await createPaymentTransaction({
      user_id: user.id,
      stripe_payment_id: paymentIntent.id,
      amount: amount,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'succeeded',
      payment_method: paymentIntent.payment_method_types[0]
    });

    console.log('✅ Payment recorded:', paymentIntent.id);

  } catch (error) {
    console.error('❌ Error handling payment success:', error);
    throw error;
  }
}

export default {
  getOrCreateCustomer,
  createCheckoutSession,
  activatePremiumSubscription,
  cancelSubscription,
  reactivateSubscription,
  handleSubscriptionUpdate,
  handleSubscriptionDeleted,
  handlePaymentSuccess
};
