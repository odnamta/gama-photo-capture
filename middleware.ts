import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js Middleware for GAMA Photo Capture PWA
 * 
 * This middleware handles:
 * 1. Session refresh and cookie management for Supabase Auth
 * 2. Route protection - redirects unauthenticated users to login
 * 3. URL preservation - saves original URL for post-login redirect
 * 
 * Protected routes: /camera, /jobs, /gallery, /queue, /settings
 * Public routes: /login
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
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
