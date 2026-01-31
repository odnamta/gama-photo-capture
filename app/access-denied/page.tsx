'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ALLOWED_ROLES } from '@/types'

/**
 * Shield icon component for the access denied page
 */
function ShieldAlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01"
      />
    </svg>
  )
}

/**
 * Access Denied page for GAMA Photo Capture PWA
 * 
 * This page is displayed when a user authenticates successfully but their role
 * is not in the allowed roles list for the Photo Capture app.
 * 
 * Features:
 * - Clear message explaining access is restricted
 * - Lists allowed roles for reference
 * - Provides logout option to sign in with a different account
 * - Contact information for support
 * 
 * @requirements 4.3 - IF a user does not have an Allowed_Role, THEN THE Photo_Capture_App SHALL display an access denied message
 */
export default function AccessDeniedPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  /**
   * Handles user logout
   * Signs out from Supabase and redirects to login page
   */
  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails, redirect to login
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            {/* Access Denied Icon */}
            <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center">
              <ShieldAlertIcon className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            Your account does not have permission to access the Photo Capture app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Explanation */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <p className="text-sm text-muted-foreground">
              This application is restricted to users with specific roles in the GAMA ERP system.
            </p>
            <div className="text-sm">
              <p className="font-medium text-foreground mb-2">Allowed roles:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {ALLOWED_ROLES.map((role) => (
                  <li key={role} className="capitalize">
                    {role.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact info */}
          <p className="text-sm text-muted-foreground text-center">
            If you believe you should have access, please contact your system administrator.
          </p>

          {/* Logout Button */}
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
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
                Signing out...
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign out and try another account
              </>
            )}
          </Button>

          {/* Back to login link */}
          <p className="text-xs text-muted-foreground text-center">
            Need to sign in with a different account?{' '}
            <button
              onClick={handleLogout}
              className="text-primary hover:underline"
              disabled={isLoggingOut}
            >
              Sign out
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
