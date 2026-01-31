/**
 * ADMIN ROUTES
 * Admin dashboard API endpoints
 */

import express from 'express';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware.js';
import {
  adminLogin,
  createAdminUser,
  getAdminUser
} from '../services/admin.service.js';
import { supabase } from '../services/supabase.service.js';

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES (No auth required)
// ============================================================================

/**
 * Admin login
 * POST /api/admin/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await adminLogin(email, password);

    res.json(result);

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * Initial admin setup (only if no admins exist)
 * POST /api/admin/setup
 */
router.post('/setup', async (req, res) => {
  try {
    // Check if any admin users exist
    const { data: existingAdmins } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0) {
      return res.status(403).json({
        error: 'Admin users already exist. Use /login instead.'
      });
    }

    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({
        error: 'Email, password, and displayName required'
      });
    }

    const admin = await createAdminUser(email, password, displayName, 'superadmin');

    res.json({
      success: true,
      message: 'Super admin created successfully',
      admin
    });

  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PROTECTED ROUTES (Require admin auth)
// ============================================================================

/**
 * Get current admin info
 * GET /api/admin/me
 */
router.get('/me', requireAdmin, async (req, res) => {
  try {
    const admin = await getAdminUser(req.admin.id);
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get dashboard statistics
 * GET /api/admin/stats
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Premium users
    const { count: premiumUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_tier', 'premium');

    // Total lessons
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    // Total revenue (this month)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: payments } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', firstDayOfMonth.toISOString());

    const monthlyRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    // New users this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: newUsersThisWeek } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString());

    res.json({
      totalUsers,
      premiumUsers,
      freeUsers: totalUsers - premiumUsers,
      totalLessons,
      monthlyRevenue,
      newUsersThisWeek
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all users with pagination
 * GET /api/admin/users?page=1&limit=50&tier=premium
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { tier, search } = req.query;

    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tier) {
      query = query.eq('subscription_tier', tier);
    }

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      users: data,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user details
 * GET /api/admin/users/:userId
 */
router.get('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Get user's lessons progress
    const { data: progress } = await supabase
      .from('user_lessons')
      .select('*, lesson:lessons(*)')
      .eq('user_id', userId);

    // Get conversation history count
    const { count: messageCount } = await supabase
      .from('conversation_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      ...user,
      lessonsProgress: progress,
      messageCount
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update user (e.g., ban, change tier)
 * PATCH /api/admin/users/:userId
 */
router.patch('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.id;
    delete updates.telegram_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
