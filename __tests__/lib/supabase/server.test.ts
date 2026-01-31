import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit tests for server-side Supabase client
 * Validates: Requirements 2.1, 2.4, 2.5
 */
describe('Server-side Supabase Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset modules to ensure fresh imports
    vi.resetModules()
    // Create a copy of the original environment
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('Environment Variable Validation', () => {
    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing (Requirement 2.5)', async () => {
      // Remove the URL environment variable
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      // Mock cookies() to avoid Next.js server-side issues
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      // Import the module after setting up mocks
      const { createClient } = await import('@/lib/supabase/server')

      await expect(createClient()).rejects.toThrow(
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL'
      )
    })

    it('should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing (Requirement 2.5)', async () => {
      // Set URL but remove anon key
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      // Mock cookies() to avoid Next.js server-side issues
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      // Import the module after setting up mocks
      const { createClient } = await import('@/lib/supabase/server')

      await expect(createClient()).rejects.toThrow(
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY'
      )
    })

    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is empty string (Requirement 2.5)', async () => {
      // Set empty URL
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      // Mock cookies() to avoid Next.js server-side issues
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      // Import the module after setting up mocks
      const { createClient } = await import('@/lib/supabase/server')

      await expect(createClient()).rejects.toThrow(
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL'
      )
    })

    it('should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is empty string (Requirement 2.5)', async () => {
      // Set URL but empty anon key
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''

      // Mock cookies() to avoid Next.js server-side issues
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      // Import the module after setting up mocks
      const { createClient } = await import('@/lib/supabase/server')

      await expect(createClient()).rejects.toThrow(
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY'
      )
    })

    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is whitespace only (Requirement 2.5)', async () => {
      // Set whitespace-only URL
      process.env.NEXT_PUBLIC_SUPABASE_URL = '   '
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      // Mock cookies() to avoid Next.js server-side issues
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      // Import the module after setting up mocks
      const { createClient } = await import('@/lib/supabase/server')

      await expect(createClient()).rejects.toThrow(
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL'
      )
    })

    it('should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is whitespace only (Requirement 2.5)', async () => {
      // Set URL but whitespace-only anon key
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '   '

      // Mock cookies() to avoid Next.js server-side issues
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      // Import the module after setting up mocks
      const { createClient } = await import('@/lib/supabase/server')

      await expect(createClient()).rejects.toThrow(
        'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY'
      )
    })

    it('should include helpful message about .env.local in URL error', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      const { createClient } = await import('@/lib/supabase/server')

      await expect(createClient()).rejects.toThrow('.env.local')
    })

    it('should include helpful message about .env.local in anon key error', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      const { createClient } = await import('@/lib/supabase/server')

      await expect(createClient()).rejects.toThrow('.env.local')
    })
  })

  describe('Client Creation', () => {
    it('should create client successfully when environment variables are valid (Requirement 2.1)', async () => {
      // Set valid environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-value'

      // Mock cookies() to avoid Next.js server-side issues
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      // Import the module after setting up mocks
      const { createClient } = await import('@/lib/supabase/server')

      // Should not throw
      const client = await createClient()
      expect(client).toBeDefined()
    })

    it('should return a Supabase client with expected methods (Requirement 2.1)', async () => {
      // Set valid environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-value'

      // Mock cookies() to avoid Next.js server-side issues
      vi.mock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn(),
        }),
      }))

      // Import the module after setting up mocks
      const { createClient } = await import('@/lib/supabase/server')

      const client = await createClient()
      
      // Verify the client has expected Supabase methods
      expect(client.from).toBeDefined()
      expect(typeof client.from).toBe('function')
      expect(client.auth).toBeDefined()
      expect(client.storage).toBeDefined()
    })
  })
})
