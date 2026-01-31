/**
 * Authentication Types for GAMA Photo Capture PWA
 * 
 * These types are shared with GAMA ERP and define the role-based
 * access control for the Photo Capture application.
 */

/**
 * Allowed roles that can access the Photo Capture app.
 * These roles are defined in the shared user_profiles table.
 */
export type AllowedRole = 
  | 'owner' 
  | 'director' 
  | 'operations_manager' 
  | 'operations' 
  | 'ops' 
  | 'engineer';

/**
 * Array of allowed roles for runtime validation.
 * Use this for checking if a role is permitted to access the app.
 */
export const ALLOWED_ROLES: AllowedRole[] = [
  'owner',
  'director',
  'operations_manager',
  'operations',
  'ops',
  'engineer',
];

/**
 * User profile from the shared user_profiles table.
 * Contains essential user information and role for access control.
 */
export interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  role: AllowedRole;
  avatar_url?: string;
}

/**
 * Authentication state for the application.
 * Used by auth context/hooks to track current user state.
 */
export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Type guard to check if a string is a valid AllowedRole.
 * @param role - The role string to check
 * @returns True if the role is an allowed role
 */
export function isAllowedRole(role: string): role is AllowedRole {
  return ALLOWED_ROLES.includes(role as AllowedRole);
}
