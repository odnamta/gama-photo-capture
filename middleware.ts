import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js Middleware for GAMA Photo Capture PWA
 *
 * This middleware handles:
 * 1. Session refresh and cookie management for Supabase Auth
 * 2. Route protection - redirects unauthenticated users to login
 * 3. URL preservation - saves original URL for post-login redirect
 * 4. Security headers (HSTS, CSP, X-Frame-Options, etc.)
 *
 * Protected routes: /camera, /jobs, /gallery, /queue, /settings
 * Public routes: /login
 */
export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Security headers
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), interest-cohort=()')
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '))

  return response
}

/**
 * Matcher configuration for middleware
 * 
 * Excludes:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 * - icons/* (PWA icons)
 * - sw.js (service worker)
 * - manifest.webmanifest (PWA manifest)
 * - api/* routes (handled separately)
 * 
 * Includes all other routes for session management
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icons (PWA icons directory)
     * - sw.js (service worker)
     * - manifest (PWA manifest)
     * - api (API routes - handled separately)
     * 
     * This regex pattern ensures middleware runs on:
     * - All page routes (/camera, /jobs, /gallery, /queue, /settings, /login)
     * - Root path (/)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest|api).*)',
  ],
}
