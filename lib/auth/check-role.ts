import { createClient } from '@/lib/supabase/server'
import { ALLOWED_ROLES, isAllowedRole, type AllowedRole, type UserProfile } from '@/types'

/**
 * Result of a role check operation.
 */
export interface RoleCheckResult {
  /** Whether the user has an allowed role */
  allowed: boolean
  /** The user's profile if found */
  profile: UserProfile | null
  /** Error message if the check failed */
  error: string | null
}

/**
 * Fetches the user profile from the user_profiles table.
 * 
 * @param userId - The user's ID from Supabase Auth
 * @returns The user profile or null if not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, email, role, avatar_url')
    .eq('user_id', userId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return {
    user_id: data.user_id,
    full_name: data.full_name,
    email: data.email,
    role: data.role as AllowedRole,
    avatar_url: data.avatar_url ?? undefined,
  }
}

/**
 * Checks if a user has an allowed role to access the Photo Capture app.
 * 
 * This function queries the user_profiles table to get the user's role
 * and verifies it against the list of allowed roles.
 * 
 * Allowed roles: owner, director, operations_manager, operations, ops, engineer
 * 
 * @param userId - The user's ID from Supabase Auth
 * @returns A RoleCheckResult indicating if access is allowed
 * 
 * @example
 * ```typescript
 * import { checkUserRole } from '@/lib/auth/check-role'
 * 
 * const result = await checkUserRole(user.id)
 * if (!result.allowed) {
 *   // Redirect to access denied page
 * }
 * ```
 */
export async function checkUserRole(userId: string): Promise<RoleCheckResult> {
  try {
    const profile = await getUserProfile(userId)
    
    if (!profile) {
      return {
        allowed: false,
        profile: null,
        error: 'User profile not found. Please contact your administrator.',
      }
    }
    
    if (!isAllowedRole(profile.role)) {
      return {
        allowed: false,
        profile,
        error: `Your role "${profile.role}" does not have access to the Photo Capture app. Allowed roles: ${ALLOWED_ROLES.join(', ')}.`,
      }
    }
    
    return {
      allowed: true,
      profile,
      error: null,
    }
  } catch (error) {
    return {
      allowed: false,
      profile: null,
      error: error instanceof Error ? error.message : 'Failed to verify user role.',
    }
  }
}

/**
 * Simple boolean check if a role string is allowed.
 * Use this for quick validation without database lookup.
 * 
 * @param role - The role string to check
 * @returns True if the role is in the allowed roles list
 * 
 * @example
 * ```typescript
 * import { isRoleAllowed } from '@/lib/auth/check-role'
 * 
 * if (isRoleAllowed(userRole)) {
 *   // Grant access
 * }
 * ```
 */
export function isRoleAllowed(role: string): boolean {
  return isAllowedRole(role)
}

/**
 * Gets the list of allowed roles.
 * Useful for displaying in error messages or UI.
 * 
 * @returns Array of allowed role strings
 */
export function getAllowedRoles(): readonly AllowedRole[] {
  return ALLOWED_ROLES
}
