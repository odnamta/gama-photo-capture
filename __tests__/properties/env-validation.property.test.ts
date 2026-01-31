import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-Based Tests for Environment Variable Validation
 * 
 * **Validates: Requirements 2.5**
 * 
 * Property 1: Environment Variable Validation
 * *For any* Supabase client initialization attempt where required environment variables
 * (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing or empty,
 * the initialization SHALL throw an error with a descriptive message indicating which
 * variable is missing.
 * 
 * Feature: v0.1-foundation, Property 1: Environment Variable Validation
 */
describe('Property 1: Environment Variable Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  /**
   * Generator for invalid environment variable values.
   * Produces: undefined, empty string, whitespace-only strings
   */
  const invalidEnvValueArb: fc.Arbitrary<string | undefined> = fc.oneof(
    fc.constant(undefined as undefined),
    fc.constant(''),
    // Generate whitespace-only strings (1-10 spaces)
    fc.integer({ min: 1, max: 10 }).map(n => ' '.repeat(n))
  )

  /**
   * Generator for valid URL values.
   * Produces valid HTTPS URLs that Supabase will accept.
   */
  const validUrlArb: fc.Arbitrary<string> = fc.webUrl({ 
    validSchemes: ['https'],
    withFragments: false,
    withQueryParameters: false
  })

  /**
   * Generator for valid anon key values.
   * Produces non-empty, non-whitespace strings that look like API keys.
   */
  const validAnonKeyArb: fc.Arbitrary<string> = fc.string({ minLength: 10, maxLength: 50 })
    .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9._-]+$/.test(s))

  /**
   * Generator for environment variable combinations.
   * Produces objects with url and anonKey that can be valid or invalid.
   */
  const envCombinationArb = fc.record({
    url: fc.oneof(invalidEnvValueArb, validUrlArb),
    anonKey: fc.oneof(invalidEnvValueArb, validAnonKeyArb)
  })

  /**
   * Helper to determine if a value is considered "missing" (undefined, empty, or whitespace-only)
   */
  function isMissing(value: string | undefined): boolean {
    return value === undefined || value.trim() === ''
  }

  describe('Client-side Supabase Client', () => {
    it('should throw descriptive error for ANY missing/empty/whitespace URL', async () => {
      await fc.assert(
        fc.asyncProperty(invalidEnvValueArb, validAnonKeyArb, async (invalidUrl, validKey) => {
          vi.resetModules()
          
          // Set up environment with invalid URL
          if (invalidUrl === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_URL = invalidUrl
          }
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = validKey

          const { createClient } = await import('@/lib/supabase/client')

          // Should throw with descriptive message about URL
          expect(() => createClient()).toThrow('NEXT_PUBLIC_SUPABASE_URL')
        }),
        { numRuns: 100 }
      )
    })

    it('should throw descriptive error for ANY missing/empty/whitespace anon key', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArb, invalidEnvValueArb, async (validUrl, invalidKey) => {
          vi.resetModules()
          
          // Set up environment with invalid anon key
          process.env.NEXT_PUBLIC_SUPABASE_URL = validUrl
          if (invalidKey === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = invalidKey
          }

          const { createClient } = await import('@/lib/supabase/client')

          // Should throw with descriptive message about anon key
          expect(() => createClient()).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        }),
        { numRuns: 100 }
      )
    })

    it('should throw error for ANY combination where both variables are invalid', async () => {
      await fc.assert(
        fc.asyncProperty(invalidEnvValueArb, invalidEnvValueArb, async (invalidUrl, invalidKey) => {
          vi.resetModules()
          
          // Set up environment with both invalid
          if (invalidUrl === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_URL = invalidUrl
          }
          if (invalidKey === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = invalidKey
          }

          const { createClient } = await import('@/lib/supabase/client')

          // Should throw (URL is checked first, so error should mention URL)
          expect(() => createClient()).toThrow('NEXT_PUBLIC_SUPABASE_URL')
        }),
        { numRuns: 100 }
      )
    })

    it('should NOT throw for ANY combination where both variables are valid', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArb, validAnonKeyArb, async (validUrl, validKey) => {
          vi.resetModules()
          
          // Set up environment with both valid
          process.env.NEXT_PUBLIC_SUPABASE_URL = validUrl
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = validKey

          const { createClient } = await import('@/lib/supabase/client')

          // Should NOT throw
          expect(() => createClient()).not.toThrow()
        }),
        { numRuns: 100 }
      )
    })

    it('should include .env.local in error message for ANY missing variable', async () => {
      await fc.assert(
        fc.asyncProperty(envCombinationArb, async ({ url, anonKey }) => {
          // Skip if both are valid (no error expected)
          if (!isMissing(url) && !isMissing(anonKey)) {
            return true
          }

          vi.resetModules()
          
          // Set up environment
          if (url === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_URL = url
          }
          if (anonKey === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey
          }

          const { createClient } = await import('@/lib/supabase/client')

          // Should throw with helpful .env.local message
          expect(() => createClient()).toThrow('.env.local')
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Server-side Supabase Client', () => {
    beforeEach(() => {
      // Mock cookies() for server-side tests
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))
    })

    it('should throw descriptive error for ANY missing/empty/whitespace URL', async () => {
      await fc.assert(
        fc.asyncProperty(invalidEnvValueArb, validAnonKeyArb, async (invalidUrl, validKey) => {
          vi.resetModules()
          
          // Re-mock after module reset
          vi.mock('next/headers', () => ({
            cookies: vi.fn().mockResolvedValue({
              getAll: vi.fn().mockReturnValue([]),
              set: vi.fn(),
            }),
          }))
          
          // Set up environment with invalid URL
          if (invalidUrl === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_URL = invalidUrl
          }
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = validKey

          const { createClient } = await import('@/lib/supabase/server')

          // Should throw with descriptive message about URL
          await expect(createClient()).rejects.toThrow('NEXT_PUBLIC_SUPABASE_URL')
        }),
        { numRuns: 100 }
      )
    })

    it('should throw descriptive error for ANY missing/empty/whitespace anon key', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArb, invalidEnvValueArb, async (validUrl, invalidKey) => {
          vi.resetModules()
          
          // Re-mock after module reset
          vi.mock('next/headers', () => ({
            cookies: vi.fn().mockResolvedValue({
              getAll: vi.fn().mockReturnValue([]),
              set: vi.fn(),
            }),
          }))
          
          // Set up environment with invalid anon key
          process.env.NEXT_PUBLIC_SUPABASE_URL = validUrl
          if (invalidKey === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = invalidKey
          }

          const { createClient } = await import('@/lib/supabase/server')

          // Should throw with descriptive message about anon key
          await expect(createClient()).rejects.toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        }),
        { numRuns: 100 }
      )
    })

    it('should throw error for ANY combination where both variables are invalid', async () => {
      await fc.assert(
        fc.asyncProperty(invalidEnvValueArb, invalidEnvValueArb, async (invalidUrl, invalidKey) => {
          vi.resetModules()
          
          // Re-mock after module reset
          vi.mock('next/headers', () => ({
            cookies: vi.fn().mockResolvedValue({
              getAll: vi.fn().mockReturnValue([]),
              set: vi.fn(),
            }),
          }))
          
          // Set up environment with both invalid
          if (invalidUrl === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_URL = invalidUrl
          }
          if (invalidKey === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = invalidKey
          }

          const { createClient } = await import('@/lib/supabase/server')

          // Should throw (URL is checked first, so error should mention URL)
          await expect(createClient()).rejects.toThrow('NEXT_PUBLIC_SUPABASE_URL')
        }),
        { numRuns: 100 }
      )
    })

    it('should NOT throw for ANY combination where both variables are valid', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArb, validAnonKeyArb, async (validUrl, validKey) => {
          vi.resetModules()
          
          // Re-mock after module reset
          vi.mock('next/headers', () => ({
            cookies: vi.fn().mockResolvedValue({
              getAll: vi.fn().mockReturnValue([]),
              set: vi.fn(),
            }),
          }))
          
          // Set up environment with both valid
          process.env.NEXT_PUBLIC_SUPABASE_URL = validUrl
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = validKey

          const { createClient } = await import('@/lib/supabase/server')

          // Should NOT throw
          await expect(createClient()).resolves.toBeDefined()
        }),
        { numRuns: 100 }
      )
    })

    it('should include .env.local in error message for ANY missing variable', async () => {
      await fc.assert(
        fc.asyncProperty(envCombinationArb, async ({ url, anonKey }) => {
          // Skip if both are valid (no error expected)
          if (!isMissing(url) && !isMissing(anonKey)) {
            return true
          }

          vi.resetModules()
          
          // Re-mock after module reset
          vi.mock('next/headers', () => ({
            cookies: vi.fn().mockResolvedValue({
              getAll: vi.fn().mockReturnValue([]),
              set: vi.fn(),
            }),
          }))
          
          // Set up environment
          if (url === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_URL = url
          }
          if (anonKey === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey
          }

          const { createClient } = await import('@/lib/supabase/server')

          // Should throw with helpful .env.local message
          await expect(createClient()).rejects.toThrow('.env.local')
          return true
        }),
        { numRuns: 100 }
      )
    })
  })
})
