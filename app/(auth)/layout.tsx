import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login - GAMA Photo Capture',
  description: 'Sign in to GAMA Photo Capture',
}

/**
 * Auth layout for authentication pages (login, etc.)
 * 
 * This is a simple layout without the app shell (no header, no bottom nav).
 * Auth pages handle their own centering and styling.
 * 
 * @requirements 3.4 - Simple centered layout without app shell for auth pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
