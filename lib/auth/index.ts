/**
 * Authentication utilities for GAMA Photo Capture PWA
 * 
 * This module provides role-based access control functions
 * that integrate with the shared GAMA ERP user_profiles table.
 */

export {
  checkUserRole,
  getUserProfile,
  isRoleAllowed,
  getAllowedRoles,
  type RoleCheckResult,
} from './check-role'
