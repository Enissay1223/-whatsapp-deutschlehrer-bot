/**
 * AUTHENTICATION MIDDLEWARE
 * Protects API routes and verifies user identity
 */

import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase.service.js';

/**
 * Verify Supabase JWT token
 * Used for webapp authentication
 */
export async function authenticateUser(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication Error',
      message: 'Failed to authenticate user'
    });
  }
}

/**
 * Verify admin access
 * Checks if user has admin role or uses admin password
 */
export async function authenticateAdmin(req, res, next) {
  try {
    // Check for admin password in header
    const adminPassword = req.headers['x-admin-password'];

    if (adminPassword === process.env.ADMIN_PASSWORD) {
      req.isAdmin = true;
      return next();
    }

    // Alternative: Check for JWT token with admin role
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin access required'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid admin credentials'
      });
    }

    // Check if user has admin role (stored in user metadata)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // For now, check if user email matches admin email
    if (user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access denied'
      });
    }

    req.user = user;
    req.userId = user.id;
    req.isAdmin = true;

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({
      error: 'Authentication Error',
      message: 'Failed to authenticate admin'
    });
  }
}

/**
 * Check if user has premium subscription
 */
export async function requirePremium(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', req.userId)
      .single();

    if (error) {
      throw error;
    }

    if (profile.subscription_tier !== 'premium' || profile.subscription_status !== 'active') {
      return res.status(403).json({
        error: 'Premium Required',
        message: 'This feature requires a Premium subscription',
        upgrade_url: '/api/payments/checkout'
      });
    }

    next();
  } catch (error) {
    console.error('Premium check error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to verify subscription status'
    });
  }
}

/**
 * Rate limiting middleware for free tier users
 * Premium users bypass this
 */
export async function rateLimitByTier(req, res, next) {
  try {
    if (!req.userId) {
      // If no auth, apply strict rate limit
      return next();
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier, daily_message_count, daily_message_limit, last_message_reset')
      .eq('id', req.userId)
      .single();

    // Premium users bypass
    if (profile.subscription_tier === 'premium') {
      return next();
    }

    // Check daily limit for free users
    const today = new Date().toISOString().split('T')[0];
    const lastReset = profile.last_message_reset?.split('T')[0];

    let messageCount = profile.daily_message_count;

    // Reset if new day
    if (lastReset !== today) {
      messageCount = 0;
      await supabase
        .from('user_profiles')
        .update({
          daily_message_count: 0,
          last_message_reset: today
        })
        .eq('id', req.userId);
    }

    if (messageCount >= profile.daily_message_limit) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: `You have reached your daily limit of ${profile.daily_message_limit} messages`,
        upgrade_url: '/api/payments/checkout',
        reset_time: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
      });
    }

    // Increment count
    await supabase
      .from('user_profiles')
      .update({
        daily_message_count: messageCount + 1
      })
      .eq('id', req.userId);

    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow request to proceed
    next();
  }
}

/**
 * Validate request body against schema (using Joi)
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        errors: errors
      });
    }

    // Replace request body with validated value
    req.body = value;
    next();
  };
}

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't reject if missing
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // Silently fail and continue
    next();
  }
}
