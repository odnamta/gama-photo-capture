import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ALLOWED_ROLES } from '@/types'
import { isRoleAllowed, getAllowedRoles } from '@/lib/auth/check-role'

// Mock the Supabase server module at the top level
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

/**
 * Unit tests for role verification functions
 * Validates: Requirements 4.1, 4.4
 */
describe('Role Verification', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    // Set valid environment variables for Supabase client
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('isRoleAllowed', () => {
    it('should return true for all allowed roles (Requirement 4.2)', () => {
      for (const role of ALLOWED_ROLES) {
        expect(isRoleAllowed(role)).toBe(true)
      }
    })

    it('should return false for non-allowed roles (Requirement 4.3)', () => {
      const nonAllowedRoles = ['admin', 'guest', 'viewer', 'customer', 'unknown', '']
      for (const role of nonAllowedRoles) {
        expect(isRoleAllowed(role)).toBe(false)
      }
    })

    it('should be case-sensitive for role matching', () => {
      expect(isRoleAllowed('Owner')).toBe(false)
      expect(isRoleAllowed('OWNER')).toBe(false)
      expect(isRoleAllowed('owner')).toBe(true)
    })
  })

  describe('getAllowedRoles', () => {
    it('should return all six allowed roles (Requirement 4.2)', () => {
      const roles = getAllowedRoles()
      expect(roles).toHaveLength(6)
      expect(roles).toContain('owner')
      expect(roles).toContain('director')
      expect(roles).toContain('operations_manager')
      expect(roles).toContain('operations')
      expect(roles).toContain('ops')
      expect(roles).toContain('engineer')
    })

    it('should return a readonly array', () => {
      const roles = getAllowedRoles()
      // TypeScript should prevent modification, but we verify the reference is stable
      expect(roles).toBe(ALLOWED_ROLES)
    })
  })

  describe('checkUserRole', () => {
    it('should return allowed: false when user profile is not found (Requirement 4.4)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)
      
      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'No rows found' },
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createClient>)

      const { checkUserRole } = await import('@/lib/auth/check-role')
      const result = await checkUserRole('non-existent-user-id')

      expect(result.allowed).toBe(false)
      expect(result.profile).toBeNull()
      expect(result.error).toContain('User profile not found')
    })

    it('should return allowed: true for user with allowed role (Requirement 4.1)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)
      
      const mockProfile = {
        user_id: 'test-user-id',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'operations',
        avatar_url: null,
      }

      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createClient>)

      const { checkUserRole } = await import('@/lib/auth/check-role')
      const result = await checkUserRole('test-user-id')

      expect(result.allowed).toBe(true)
      expect(result.profile).not.toBeNull()
      expect(result.profile?.role).toBe('operations')
      expect(result.error).toBeNull()
    })

    it('should return allowed: false for user with non-allowed role (Requirement 4.3)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)
      
      const mockProfile = {
        user_id: 'test-user-id',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'customer', // Not an allowed role
        avatar_url: null,
      }

      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createClient>)

      const { checkUserRole } = await import('@/lib/auth/check-role')
      const result = await checkUserRole('test-user-id')

      expect(result.allowed).toBe(false)
      expect(result.profile).not.toBeNull()
      expect(result.error).toContain('does not have access')
    })

    it('should include allowed roles in error message for non-allowed role', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)
      
      const mockProfile = {
        user_id: 'test-user-id',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'guest',
        avatar_url: null,
      }

      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createClient>)

      const { checkUserRole } = await import('@/lib/auth/check-role')
      const result = await checkUserRole('test-user-id')

      expect(result.error).toContain('owner')
      expect(result.error).toContain('director')
      expect(result.error).toContain('operations_manager')
    })

    it('should handle database errors gracefully', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)
      
      mockCreateClient.mockRejectedValue(new Error('Database connection failed'))

      const { checkUserRole } = await import('@/lib/auth/check-role')
      const result = await checkUserRole('test-user-id')

      expect(result.allowed).toBe(false)
      expect(result.profile).toBeNull()
      expect(result.error).toContain('Database connection failed')
    })
  })

  describe('getUserProfile', () => {
    it('should return null when profile is not found', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)
      
      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'No rows found' },
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createClient>)

      const { getUserProfile } = await import('@/lib/auth/check-role')
      const profile = await getUserProfile('non-existent-user-id')

      expect(profile).toBeNull()
    })

    it('should return profile with correct structure when found', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)
      
      const mockData = {
        user_id: 'test-user-id',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'engineer',
        avatar_url: 'https://example.com/avatar.jpg',
      }

      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createClient>)

      const { getUserProfile } = await import('@/lib/auth/check-role')
      const profile = await getUserProfile('test-user-id')

      expect(profile).not.toBeNull()
      expect(profile?.user_id).toBe('test-user-id')
      expect(profile?.full_name).toBe('Test User')
      expect(profile?.email).toBe('test@example.com')
      expect(profile?.role).toBe('engineer')
      expect(profile?.avatar_url).toBe('https://example.com/avatar.jpg')
    })

    it('should handle null avatar_url correctly', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockCreateClient = vi.mocked(createClient)
      
      const mockData = {
        user_id: 'test-user-id',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'ops',
        avatar_url: null,
      }

      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createClient>)

      const { getUserProfile } = await import('@/lib/auth/check-role')
      const profile = await getUserProfile('test-user-id')

      expect(profile).not.toBeNull()
      expect(profile?.avatar_url).toBeUndefined()
    })
  })
})
