import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

/**
 * Validates that required Supabase environment variables are present.
 * During build time, returns placeholder values to allow static analysis.
 */
function validateEnvironmentVariables(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build/SSG, env vars might not be available
  // Return placeholders that will be replaced at runtime
  if (!url || url.trim() === '') {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      // During build, return placeholder
      return {
        url: 'https://placeholder.supabase.co',
        anonKey: anonKey || 'placeholder-key'
      }
    }
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
      'Please add this variable to your .env.local file with your Supabase project URL.'
    )
  }

  if (!anonKey || anonKey.trim() === '') {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return { url, anonKey: 'placeholder-key' }
    }
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Please add this variable to your .env.local file with your Supabase anon key.'
    )
  }

  return { url, anonKey }
}

/**
 * Creates a Supabase client for server-side usage (Server Components, API Routes, Server Actions).
 * Uses cookies for session management to maintain authentication state.
 * 
 * @returns A configured Supabase client for server-side operations
 * @throws Error if required environment variables are missing
 * 
 * @example
 * ```typescript
 * // In a Server Component or API Route
 * import { createClient } from '@/lib/supabase/server'
 * 
 * export async function GET() {
 *   const supabase = await createClient()
 *   const { data, error } = await supabase.from('shipment_photos').select('*')
 *   // ...
 * }
 * ```
 */
export async function createClient() {
  const { url, anonKey } = validateEnvironmentVariables()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
