/**
 * AUTHENTICATION MIDDLEWARE
 * Protects admin routes
 */

import { verifyAdminToken } from '../services/admin.service.js';

/**
 * Require admin authentication
 */
export function requireAdmin(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAdminToken(token);

    // Attach admin info to request
    req.admin = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Require super admin role
 */
export function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Super admin access required'
    });
  }

  next();
}

export default {
  requireAdmin,
  requireSuperAdmin
};
