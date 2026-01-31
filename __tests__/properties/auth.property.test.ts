import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { NextRequest, NextResponse } from 'next/server'
import { ALLOWED_ROLES, isAllowedRole, type AllowedRole } from '@/types'

/**
 * Property-Based Tests for Authentication
 * 
 * **Validates: Requirements 3.2, 4.1, 4.3, 5.2, 5.4**
 * 
 * Feature: v0.1-foundation, Properties 2-5: Authentication
 */

// Mock the Supabase SSR module
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
  createBrowserClient: vi.fn(),
}))

/**
 * Protected routes in the application
 */
const PROTECTED_ROUTES = ['/camera', '/jobs', '/gallery', '/queue', '/settings']

/**
 * Generator for protected route paths.
 * Produces valid protected route paths with optional sub-paths.
 */
const protectedRouteArb: fc.Arbitrary<string> = fc.oneof(
  // Base protected routes
  fc.constantFrom(...PROTECTED_ROUTES),
  // Protected routes with sub-paths
  fc.tuple(
    fc.constantFrom(...PROTECTED_ROUTES),
    fc.stringMatching(/^\/[a-z0-9-]+$/)
  ).map(([base, subPath]) => `${base}${subPath}`)
)

/**
 * Generator for allowed roles.
 */
const allowedRoleArb: fc.Arbitrary<AllowedRole> = fc.constantFrom(...ALLOWED_ROLES)

/**
 * Generator for non-allowed roles.
 * Produces role strings that are NOT in the allowed roles list.
 */
const nonAllowedRoleArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom('admin', 'guest', 'viewer', 'customer', 'user', 'manager', 'staff'),
  fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => !ALLOWED_ROLES.includes(s as AllowedRole) && /^[a-z_]+$/.test(s))
)

/**
 * Generator for valid user IDs (UUIDs).
 */
const userIdArb: fc.Arbitrary<string> = fc.uuid()

/**
 * Generator for user profile data.
 */
const userProfileArb = (role: string) => fc.record({
  user_id: userIdArb,
  full_name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  role: fc.constant(role),
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
})

describe('Property 2: Unauthenticated Request Redirect', () => {
  /**
   * **Validates: Requirements 3.2, 5.2**
   * 
   * *For any* HTTP request to a protected route (camera, jobs, gallery, queue, settings)
   * without a valid authentication session, the middleware SHALL respond with a redirect
   * to the login page.
   */

  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  it('should redirect to /login for ANY protected route when user is not authenticated', async () => {
    await fc.assert(
      fc.asyncProperty(protectedRouteArb, async (route) => {
        vi.resetModules()
        
        // Mock Supabase to return no user (unauthenticated)
        const { createServerClient } = await import('@supabase/ssr')
        const mockCreateServerClient = vi.mocked(createServerClient)
        
        mockCreateServerClient.mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: null,
            }),
          },
        } as unknown as ReturnType<typeof createServerClient>)

        const { updateSession } = await import('@/lib/supabase/middleware')
        
        // Create a mock request for the protected route
        const request = new NextRequest(new URL(route, 'http://localhost:3001'))
        
        const response = await updateSession(request)
        
        // Should redirect to login
        expect(response.status).toBe(307) // Temporary redirect
        expect(response.headers.get('location')).toContain('/login')
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should NOT redirect for ANY protected route when user IS authenticated', async () => {
    await fc.assert(
      fc.asyncProperty(protectedRouteArb, userIdArb, async (route, userId) => {
        vi.resetModules()
        
        // Mock Supabase to return an authenticated user
        const { createServerClient } = await import('@supabase/ssr')
        const mockCreateServerClient = vi.mocked(createServerClient)
        
        mockCreateServerClient.mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: userId, email: 'test@example.com' } },
              error: null,
            }),
          },
        } as unknown as ReturnType<typeof createServerClient>)

        const { updateSession } = await import('@/lib/supabase/middleware')
        
        // Create a mock request for the protected route
        const request = new NextRequest(new URL(route, 'http://localhost:3001'))
        
        const response = await updateSession(request)
        
        // Should NOT redirect (status 200 means pass-through)
        expect(response.status).toBe(200)
        expect(response.headers.get('location')).toBeNull()
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 3: Role Verification on Authentication', () => {
  /**
   * **Validates: Requirements 4.1**
   * 
   * *For any* authenticated user, the application SHALL query the user_profiles table
   * and verify the user's role is in the allowed roles set before granting access
   * to protected features.
   */

  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  // Mock the Supabase server module
  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
  }))

  it('should query user_profiles and return allowed: true for ANY allowed role', async () => {
    await fc.assert(
      fc.asyncProperty(allowedRoleArb, userIdArb, async (role, userId) => {
        vi.resetModules()
        
        // Mock the Supabase server module
        vi.mock('@/lib/supabase/server', () => ({
          createClient: vi.fn(),
        }))
        
        const { createClient } = await import('@/lib/supabase/server')
        const mockCreateClient = vi.mocked(createClient)
        
        const mockProfile = {
          user_id: userId,
          full_name: 'Test User',
          email: 'test@example.com',
          role: role,
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
        const result = await checkUserRole(userId)

        // Should be allowed for any allowed role
        expect(result.allowed).toBe(true)
        expect(result.profile).not.toBeNull()
        expect(result.profile?.role).toBe(role)
        expect(result.error).toBeNull()
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should verify role is checked against ALLOWED_ROLES for ANY user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(allowedRoleArb, nonAllowedRoleArb),
        userIdArb,
        async (role, userId) => {
          vi.resetModules()
          
          // Mock the Supabase server module
          vi.mock('@/lib/supabase/server', () => ({
            createClient: vi.fn(),
          }))
          
          const { createClient } = await import('@/lib/supabase/server')
          const mockCreateClient = vi.mocked(createClient)
          
          const mockProfile = {
            user_id: userId,
            full_name: 'Test User',
            email: 'test@example.com',
            role: role,
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
          const result = await checkUserRole(userId)

          // Result should match whether role is in allowed list
          const expectedAllowed = isAllowedRole(role)
          expect(result.allowed).toBe(expectedAllowed)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 4: Access Denied for Invalid Roles', () => {
  /**
   * **Validates: Requirements 4.3**
   * 
   * *For any* authenticated user whose role is not in the allowed roles set
   * (owner, director, operations_manager, operations, ops, engineer),
   * the application SHALL display an access denied message and prevent access
   * to protected features.
   */

  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  it('should return allowed: false for ANY non-allowed role', async () => {
    await fc.assert(
      fc.asyncProperty(nonAllowedRoleArb, userIdArb, async (role, userId) => {
        vi.resetModules()
        
        // Mock the Supabase server module
        vi.mock('@/lib/supabase/server', () => ({
          createClient: vi.fn(),
        }))
        
        const { createClient } = await import('@/lib/supabase/server')
        const mockCreateClient = vi.mocked(createClient)
        
        const mockProfile = {
          user_id: userId,
          full_name: 'Test User',
          email: 'test@example.com',
          role: role,
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
        const result = await checkUserRole(userId)

        // Should NOT be allowed for any non-allowed role
        expect(result.allowed).toBe(false)
        expect(result.error).not.toBeNull()
        expect(result.error).toContain('does not have access')
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should include descriptive error message for ANY non-allowed role', async () => {
    await fc.assert(
      fc.asyncProperty(nonAllowedRoleArb, userIdArb, async (role, userId) => {
        vi.resetModules()
        
        // Mock the Supabase server module
        vi.mock('@/lib/supabase/server', () => ({
          createClient: vi.fn(),
        }))
        
        const { createClient } = await import('@/lib/supabase/server')
        const mockCreateClient = vi.mocked(createClient)
        
        const mockProfile = {
          user_id: userId,
          full_name: 'Test User',
          email: 'test@example.com',
          role: role,
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
        const result = await checkUserRole(userId)

        // Error message should mention the user's role
        expect(result.error).toContain(role)
        // Error message should list allowed roles
        expect(result.error).toContain('Allowed roles')
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return profile even when access is denied for ANY non-allowed role', async () => {
    await fc.assert(
      fc.asyncProperty(nonAllowedRoleArb, userIdArb, async (role, userId) => {
        vi.resetModules()
        
        // Mock the Supabase server module
        vi.mock('@/lib/supabase/server', () => ({
          createClient: vi.fn(),
        }))
        
        const { createClient } = await import('@/lib/supabase/server')
        const mockCreateClient = vi.mocked(createClient)
        
        const mockProfile = {
          user_id: userId,
          full_name: 'Test User',
          email: 'test@example.com',
          role: role,
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
        const result = await checkUserRole(userId)

        // Profile should still be returned even when access denied
        expect(result.profile).not.toBeNull()
        expect(result.profile?.user_id).toBe(userId)
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 5: URL Preservation on Redirect', () => {
  /**
   * **Validates: Requirements 5.4**
   * 
   * *For any* unauthenticated request to a protected route, the middleware SHALL
   * preserve the original requested URL in a query parameter, such that after
   * successful authentication the user is redirected back to the originally
   * requested page.
   */

  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  it('should preserve original URL in redirectTo query param for ANY protected route', async () => {
    await fc.assert(
      fc.asyncProperty(protectedRouteArb, async (route) => {
        vi.resetModules()
        
        // Mock Supabase to return no user (unauthenticated)
        const { createServerClient } = await import('@supabase/ssr')
        const mockCreateServerClient = vi.mocked(createServerClient)
        
        mockCreateServerClient.mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: null,
            }),
          },
        } as unknown as ReturnType<typeof createServerClient>)

        const { updateSession } = await import('@/lib/supabase/middleware')
        
        // Create a mock request for the protected route
        const request = new NextRequest(new URL(route, 'http://localhost:3001'))
        
        const response = await updateSession(request)
        
        // Should redirect to login with redirectTo param
        expect(response.status).toBe(307)
        const location = response.headers.get('location')
        expect(location).not.toBeNull()
        
        const redirectUrl = new URL(location!, 'http://localhost:3001')
        expect(redirectUrl.pathname).toBe('/login')
        expect(redirectUrl.searchParams.get('redirectTo')).toBe(route)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve exact path including sub-paths for ANY protected route', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.constantFrom(...PROTECTED_ROUTES),
          fc.stringMatching(/^\/[a-z0-9-]+$/)
        ).map(([base, sub]) => `${base}${sub}`),
        async (fullPath) => {
          vi.resetModules()
          
          // Mock Supabase to return no user (unauthenticated)
          const { createServerClient } = await import('@supabase/ssr')
          const mockCreateServerClient = vi.mocked(createServerClient)
          
          mockCreateServerClient.mockReturnValue({
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: null },
                error: null,
              }),
            },
          } as unknown as ReturnType<typeof createServerClient>)

          const { updateSession } = await import('@/lib/supabase/middleware')
          
          // Create a mock request for the protected route with sub-path
          const request = new NextRequest(new URL(fullPath, 'http://localhost:3001'))
          
          const response = await updateSession(request)
          
          // Should preserve the full path in redirectTo
          const location = response.headers.get('location')
          expect(location).not.toBeNull()
          
          const redirectUrl = new URL(location!, 'http://localhost:3001')
          expect(redirectUrl.searchParams.get('redirectTo')).toBe(fullPath)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('isAllowedRole Type Guard Property Tests', () => {
  /**
   * Additional property tests for the isAllowedRole type guard function.
   * Ensures the type guard correctly identifies allowed vs non-allowed roles.
   */

  it('should return true for ALL and ONLY allowed roles', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        (role) => {
          const result = isAllowedRole(role)
          const expected = ALLOWED_ROLES.includes(role as AllowedRole)
          return result === expected
        }
      ),
      { numRuns: 1000 }
    )
  })

  it('should return true for ANY role in ALLOWED_ROLES array', () => {
    fc.assert(
      fc.property(allowedRoleArb, (role) => {
        return isAllowedRole(role) === true
      }),
      { numRuns: 100 }
    )
  })

  it('should return false for ANY role NOT in ALLOWED_ROLES array', () => {
    fc.assert(
      fc.property(nonAllowedRoleArb, (role) => {
        return isAllowedRole(role) === false
      }),
      { numRuns: 100 }
    )
  })
})
