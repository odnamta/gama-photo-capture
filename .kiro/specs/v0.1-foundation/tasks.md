# Implementation Plan: v0.1-foundation

## Overview

This implementation plan covers the foundation phase of GAMA Photo Capture PWA. Tasks are organized to build incrementally, starting with project setup, then authentication, app shell, and finally database schema. Each task builds on previous work to ensure no orphaned code.

## Tasks

- [x] 1. Project Setup and Configuration
  - [x] 1.1 Initialize Next.js 15 project with TypeScript and App Router
    - Run `npx create-next-app@latest` with TypeScript, ESLint, Tailwind, App Router options
    - Configure port 3001 in package.json dev script
    - Verify strict mode in tsconfig.json
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 1.2 Configure TailwindCSS and shadcn/ui
    - Initialize shadcn/ui with `npx shadcn@latest init`
    - Select new-york style, slate base color
    - Install Button component for testing: `npx shadcn@latest add button`
    - _Requirements: 1.3, 1.4_

  - [x] 1.3 Set up directory structure
    - Create components/atoms, components/molecules, components/organisms, components/templates directories
    - Create lib/supabase, lib/utils directories
    - Create contexts, hooks, types directories
    - Create public/icons directory for PWA icons
    - _Requirements: 1.6_

  - [x] 1.4 Write unit tests for project configuration
    - Test tsconfig.json has strict mode enabled
    - Test components.json has new-york style
    - Test package.json dev script uses port 3001
    - _Requirements: 1.2, 1.4, 1.5_

- [x] 2. Supabase Client Configuration
  - [x] 2.1 Install Supabase dependencies
    - Install @supabase/supabase-js and @supabase/ssr packages
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Create server-side Supabase client
    - Create lib/supabase/server.ts with createClient function
    - Use cookies() for session management
    - Add environment variable validation with clear error messages
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 2.3 Create client-side Supabase client
    - Create lib/supabase/client.ts with createClient function
    - Use createBrowserClient from @supabase/ssr
    - Add environment variable validation
    - _Requirements: 2.2, 2.4, 2.5_

  - [x] 2.4 Create environment variables template
    - Create .env.local.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL
    - Add .env.local to .gitignore
    - _Requirements: 2.4_

  - [x] 2.5 Write property test for environment variable validation
    - **Property 1: Environment Variable Validation**
    - Test that missing env vars throw descriptive errors
    - **Validates: Requirements 2.5**

- [x] 3. Checkpoint - Verify Supabase Setup
  - Ensure Supabase clients compile without errors
  - Verify environment variable validation works
  - Ask the user if questions arise

- [x] 4. Authentication Integration
  - [x] 4.1 Create authentication types
    - Create types/index.ts with AllowedRole type and UserProfile interface
    - Define allowed roles: owner, director, operations_manager, operations, ops, engineer
    - _Requirements: 4.2_

  - [x] 4.2 Create middleware for route protection
    - Create middleware.ts at project root
    - Create lib/supabase/middleware.ts with updateSession helper
    - Configure matcher for protected routes (exclude login, api, static files)
    - Preserve original URL in redirect for post-login navigation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.3 Create login page
    - Create app/(auth)/login/page.tsx
    - Add Google OAuth sign-in button using Supabase Auth
    - Handle OAuth callback and redirect
    - Style with shadcn/ui components
    - _Requirements: 3.4_

  - [x] 4.4 Create auth layout
    - Create app/(auth)/layout.tsx for auth pages
    - Simple centered layout without app shell
    - _Requirements: 3.4_

  - [x] 4.5 Implement role verification
    - Create lib/auth/check-role.ts function
    - Query user_profiles table for user role
    - Return boolean for allowed/denied access
    - _Requirements: 4.1, 4.4_

  - [x] 4.6 Create access denied page
    - Create app/(main)/access-denied/page.tsx
    - Display message explaining access is restricted
    - Provide logout option
    - _Requirements: 4.3_

  - [x] 4.7 Write property tests for authentication
    - **Property 2: Unauthenticated Request Redirect**
    - **Property 3: Role Verification on Authentication**
    - **Property 4: Access Denied for Invalid Roles**
    - **Property 5: URL Preservation on Redirect**
    - **Validates: Requirements 3.2, 4.1, 4.3, 5.2, 5.4**

- [x] 5. Checkpoint - Verify Authentication
  - Test login flow with Google OAuth
  - Test redirect to login for unauthenticated access
  - Test role verification works
  - Ask the user if questions arise

- [x] 6. App Shell Components
  - [x] 6.1 Create OfflineIndicator atom
    - Create components/atoms/offline-indicator.tsx
    - Accept isOnline prop
    - Display wifi-off icon when offline
    - _Requirements: 6.5_

  - [x] 6.2 Create AppHeader organism
    - Create components/organisms/app-header.tsx
    - Accept title, showBack, showQueue props
    - Display title, offline indicator, queue count badge
    - Use shadcn/ui components for styling
    - _Requirements: 6.1, 6.4, 6.5, 6.6_

  - [x] 6.3 Create BottomNav organism
    - Create components/organisms/bottom-nav.tsx
    - Accept currentPath prop
    - Render five tabs: Camera, Jobs, Gallery, Queue, Settings
    - Highlight active tab based on currentPath
    - Use appropriate icons (Camera, Briefcase, Image, Upload, Settings)
    - Fixed position at bottom of viewport
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.4 Create AppLayout template
    - Create components/templates/app-layout.tsx
    - Compose AppHeader and BottomNav
    - Main content area with proper padding for header/nav
    - _Requirements: 6.2, 6.3_

  - [x] 6.5 Write property tests for UI components
    - **Property 6: Header Title Rendering**
    - **Property 7: Active Tab Highlighting**
    - **Validates: Requirements 6.4, 7.2**

- [x] 7. Route Structure and Placeholder Pages
  - [x] 7.1 Create main layout with app shell
    - Create app/(main)/layout.tsx
    - Wrap children with AppLayout
    - Add role verification check
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Create root page redirect
    - Update app/page.tsx to redirect to /camera
    - _Requirements: 8.7_

  - [x] 7.3 Create camera placeholder page
    - Create app/(main)/camera/page.tsx
    - Display "Camera - Coming Soon" placeholder
    - _Requirements: 8.1_

  - [x] 7.4 Create jobs placeholder page
    - Create app/(main)/jobs/page.tsx
    - Display "Jobs - Coming Soon" placeholder
    - _Requirements: 8.2_

  - [x] 7.5 Create gallery placeholder page
    - Create app/(main)/gallery/page.tsx
    - Display "Gallery - Coming Soon" placeholder
    - _Requirements: 8.3_

  - [x] 7.6 Create queue placeholder page
    - Create app/(main)/queue/page.tsx
    - Display "Queue - Coming Soon" placeholder
    - _Requirements: 8.4_

  - [x] 7.7 Create settings placeholder page
    - Create app/(main)/settings/page.tsx
    - Display "Settings - Coming Soon" placeholder
    - Add logout button
    - _Requirements: 8.5, 3.5_

  - [x] 7.8 Write unit tests for routes
    - Test all placeholder pages render
    - Test root redirects to /camera
    - Test login page is accessible
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 8. Checkpoint - Verify App Shell
  - Test navigation between all pages
  - Test header displays correct titles
  - Test bottom nav highlights active tab
  - Ask the user if questions arise

- [x] 9. PWA Foundation
  - [x] 9.1 Create PWA manifest
    - Create app/manifest.ts with MetadataRoute.Manifest
    - Set name, short_name, description, start_url, display: standalone
    - Configure theme_color and background_color
    - Add icon references (192x192, 512x512, maskable)
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 9.2 Create placeholder PWA icons
    - Create public/icons/icon-192.png (placeholder)
    - Create public/icons/icon-512.png (placeholder)
    - Create public/icons/maskable-icon.png (placeholder)
    - _Requirements: 9.3_

  - [x] 9.3 Add PWA meta tags to root layout
    - Update app/layout.tsx with viewport, themeColor metadata
    - Add apple-touch-icon link
    - Add manifest link
    - _Requirements: 9.5_

  - [x] 9.4 Create basic service worker registration
    - Create public/sw.js with minimal service worker (install, activate events)
    - Add service worker registration in app/layout.tsx or dedicated hook
    - _Requirements: 9.4_

  - [x] 9.5 Write unit tests for PWA configuration
    - Test manifest has required fields
    - Test manifest display is standalone
    - Test manifest has correct icon sizes
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 10. Database Schema Documentation
  - [x] 10.1 Create database migration SQL file
    - Create docs/database/001_photo_capture_schema.sql
    - Include shipment_photos table with all columns and constraints
    - Include photo_upload_queue table
    - Include photo_tags table
    - Include all indexes
    - Include RLS policies
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 10.2 Create storage bucket documentation
    - Document bucket name: shipment-photos
    - Document storage path convention
    - Document RLS policies for storage
    - _Requirements: 11.1, 11.5, 11.6_

  - [x] 10.3 Create TypeScript types for database
    - Create types/photo.ts with PhotoType, UploadStatus, SyncStatus
    - Create ShipmentPhoto, PhotoUploadQueue, PhotoTag interfaces
    - _Requirements: 10.1, 10.4, 10.5_

- [x] 11. Final Checkpoint - Foundation Complete
  - Run `npm run build` to verify no build errors
  - Run `npm run lint` to verify no linting errors
  - Test complete authentication flow
  - Test navigation through all pages
  - Verify PWA manifest loads correctly
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive testing from the start
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Database schema is documented but actual migration should be run manually in Supabase Dashboard
