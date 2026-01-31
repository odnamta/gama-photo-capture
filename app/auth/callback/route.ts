import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * OAuth callback route handler
 * 
 * This route handles the callback from OAuth providers (Google).
 * It exchanges the authorization code for a session and redirects
 * the user to their intended destination.
 * 
 * Flow:
 * 1. User clicks "Sign in with Google" on login page
 * 2. User authenticates with Google
 * 3. Google redirects back to this callback URL with a code
 * 4. This handler exchanges the code for a session
 * 5. User is redirected to their original destination (or /camera)
 * 
 * @requirements 3.3 - WHEN a user authenticates successfully, THEN THE Photo_Capture_App SHALL create an Auth_Session
 * @requirements 5.4 - THE middleware SHALL preserve the original URL for redirect after successful login
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  
  // Get the authorization code from the URL
  const code = searchParams.get('code')
  
  // Get the redirect destination (preserved from the original request)
  const redirectTo = searchParams.get('redirectTo') || '/camera'
  
  // Get any error from the OAuth provider
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(loginUrl)
  }

  // If we have a code, exchange it for a session
  if (code) {
    const supabase = await createClient()
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('error', 'Authentication failed. Please try again.')
      return NextResponse.redirect(loginUrl)
    }

    // Successfully authenticated - redirect to the intended destination
    // Ensure the redirect path is safe (starts with /)
    const safePath = redirectTo.startsWith('/') ? redirectTo : '/camera'
    return NextResponse.redirect(new URL(safePath, origin))
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login', origin))
}
