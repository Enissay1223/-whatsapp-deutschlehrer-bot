/**
 * WEBAPP ROUTES
 * API endpoints for the Next.js webapp (user-facing)
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { handleChatMessage } from '../services/chat.service.js';
import {
  getUserProfile,
  updateUserProfile,
  hasReachedMessageLimit,
  getUserProgress,
  getUserAchievements,
  getConversationHistory
} from '../services/supabase.service.js';
import { createCheckoutSession } from '../services/stripe.service.js';

const router = express.Router();

// ============================================================================
// AUTH MIDDLEWARE - Verify Supabase JWT from webapp
// ============================================================================

async function requireWebappAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const token = authHeader.substring(7);

    // Verify JWT with Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Ungueltige Sitzung' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Webapp auth error:', error);
    return res.status(401).json({ error: 'Authentifizierung fehlgeschlagen' });
  }
}

// ============================================================================
// PROFILE ROUTES
// ============================================================================

/**
 * Get user profile
 * GET /api/webapp/profile
 */
router.get('/profile', requireWebappAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profil nicht gefunden' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update user profile
 * PATCH /api/webapp/profile
 */
router.patch('/profile', requireWebappAuth, async (req, res) => {
  try {
    const allowedFields = ['display_name', 'native_language', 'german_level', 'learning_goal', 'preferred_language'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    const profile = await updateUserProfile(req.user.id, updates);
    res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PROGRESS ROUTES
// ============================================================================

/**
 * Get user learning progress
 * GET /api/webapp/progress
 */
router.get('/progress', requireWebappAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.id);
    const achievements = await getUserAchievements(req.user.id);
    const history = await getConversationHistory(req.user.id, 5);

    res.json({
      experience_points: profile?.experience_points || 0,
      current_level: profile?.current_level || 1,
      streak_days: profile?.streak_days || 0,
      german_level: profile?.german_level || 'A1',
      daily_message_count: profile?.daily_message_count || 0,
      daily_message_limit: profile?.daily_message_limit || 10,
      achievements: achievements || [],
      recent_messages: history?.length || 0,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CHAT ROUTES
// ============================================================================

/**
 * Send a chat message
 * POST /api/webapp/chat
 * Body: { message: string }
 */
router.post('/chat', requireWebappAuth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Nachricht darf nicht leer sein' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Nachricht zu lang (max. 2000 Zeichen)' });
    }

    // Check message limit
    const limitReached = await hasReachedMessageLimit(req.user.id);
    if (limitReached) {
      return res.status(429).json({
        error: 'Tageslimit erreicht. Upgrade auf Premium fuer unbegrenzte Nachrichten.',
        limitReached: true
      });
    }

    // Process chat message (reuse existing chat service)
    const result = await handleChatMessage(req.user.id, null, message.trim());

    res.json({
      aiResponse: result.aiResponse,
      xpAwarded: result.xpAwarded,
      hasCorrection: result.hasCorrection,
      recommendedLessons: result.recommendedLessons || [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Fehler bei der Verarbeitung. Bitte versuche es erneut.' });
  }
});

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

/**
 * Create Stripe checkout session for webapp users
 * POST /api/webapp/checkout
 */
router.post('/checkout', requireWebappAuth, async (req, res) => {
  try {
    const session = await createCheckoutSession(req.user.id, null);
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Checkout-Session' });
  }
});

export default router;
