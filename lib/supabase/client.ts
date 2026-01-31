import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

/**
 * Checks if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Checks if we're in a test environment
 */
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
}

/**
 * Validates that required Supabase environment variables are present.
 * Throws descriptive errors if any required variables are missing.
 * 
 * During build time (when not in browser and not in test), returns placeholder values
 * to allow static analysis to complete.
 */
function validateEnvironmentVariables(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build/SSG (not browser, not test), env vars might not be available
  // Return placeholders that will fail gracefully at runtime
  if (!isBrowser() && !isTestEnvironment()) {
    return {
      url: url || 'https://placeholder.supabase.co',
      anonKey: anonKey || 'placeholder-key'
    }
  }

  if (!url || url.trim() === '') {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
      'Please add this variable to your .env.local file with your Supabase project URL.'
    )
  }

  if (!anonKey || anonKey.trim() === '') {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Please add this variable to your .env.local file with your Supabase anon key.'
    )
  }

  return { url, anonKey }
}

/**
 * Creates a Supabase client for client-side usage (Client Components).
 * Uses browser storage for session management to maintain authentication state.
 * 
 * @returns A configured Supabase client for client-side operations
 * @throws Error if required environment variables are missing (in browser or test context)
 * 
 * @example
 * ```typescript
 * // In a Client Component
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 * 
 * const supabase = createClient()
 * const { data } = await supabase.from('shipment_photos').select('*')
 * ```
 */
export function createClient() {
  const { url, anonKey } = validateEnvironmentVariables()

  return createBrowserClient<Database>(url, anonKey)
}
