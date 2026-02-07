/**
 * ADMIN SERVICE
 * Handles admin authentication and authorization
 */

import { supabase } from './supabase.service.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Admin login with email and password
 */
export async function adminLogin(email, password) {
  try {
    // Get admin user from database
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    console.log('✅ Admin logged in:', email);

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        display_name: admin.display_name,
        role: admin.role
      }
    };

  } catch (error) {
    console.error('❌ Admin login error:', error);
    throw error;
  }
}

/**
 * Verify JWT token
 */
export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Create admin user (initial setup only)
 */
export async function createAdminUser(email, password, displayName, role = 'admin') {
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const { data, error } = await supabase
      .from('admin_users')
      .insert([{
        email,
        password_hash: passwordHash,
        display_name: displayName,
        role,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Admin user created:', email);

    return {
      id: data.id,
      email: data.email,
      display_name: data.display_name,
      role: data.role
    };

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

/**
 * Get admin user by ID
 */
export async function getAdminUser(adminId) {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, display_name, role, created_at, last_login_at')
      .eq('id', adminId)
      .single();

    if (error) throw error;

    return data;

  } catch (error) {
    console.error('❌ Error getting admin user:', error);
    throw error;
  }
}

export default {
  adminLogin,
  verifyAdminToken,
  createAdminUser,
  getAdminUser
};
