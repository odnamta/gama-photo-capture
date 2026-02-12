'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Google icon component for the OAuth button
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/**
 * Loading fallback for the login form while search params are being read
 */
function LoginFormSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse" />
          </div>
          <div className="h-8 bg-muted rounded animate-pulse w-3/4 mx-auto" />
          <div className="h-4 bg-muted rounded animate-pulse w-2/3 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-12 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2 mx-auto" />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Login form component that uses search params
 * Separated to allow Suspense boundary wrapping
 */
function LoginForm() {
  const searchParams = useSearchParams()
  
  // Get error from query params (set by OAuth callback on failure)
  const errorFromCallback = searchParams.get('error')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(errorFromCallback)

  /**
   * Handles Google OAuth sign-in
   * Redirects to Google for authentication, then back to the app
   */
  async function handleGoogleSignIn() {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get the redirect URL from query params, default to /camera
      const redirectTo = searchParams.get('redirectTo') || '/camera'
      
      // Build the callback URL for OAuth
      // This URL will be called after Google authentication
      // IMPORTANT: For shared Supabase projects, we must explicitly set the redirect URL
      // to ensure the OAuth flow returns to THIS app, not the main ERP
      // The redirectTo URL MUST be in the Supabase Dashboard's Redirect URLs list
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('redirectTo', redirectTo)

      console.log('OAuth redirectTo URL:', callbackUrl.toString())

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      console.log('OAuth response:', { url: data?.url, error: authError })

      if (authError) {
        throw authError
      }
      
      // Note: If successful, the browser will redirect to Google
      // No need to handle success here as the page will navigate away
    } catch (err) {
      console.error('Login error:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : 'An unexpected error occurred. Please try again.'
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            {/* App Logo/Icon placeholder */}
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">GAMA Photo Capture</CardTitle>
          <CardDescription>
            Sign in to capture and manage shipment photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error message display */}
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {/* Google Sign-in Button */}
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <GoogleIcon className="h-5 w-5 mr-2" />
                Sign in with Google
              </>
            )}
          </Button>

          {/* Info text */}
          <p className="text-xs text-muted-foreground text-center">
            Use your GAMA ERP account to sign in
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Login page for GAMA Photo Capture PWA
 * 
 * Features:
 * - Google OAuth sign-in using Supabase Auth
 * - Preserves redirect URL from query params for post-login navigation
 * - Error handling with user-friendly messages
 * - Styled with shadcn/ui components
 * 
 * @requirements 3.4 - THE Photo_Capture_App SHALL provide a login page with Google OAuth sign-in option
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
