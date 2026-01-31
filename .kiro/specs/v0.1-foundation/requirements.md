# Requirements Document

## Introduction

This document defines the requirements for v0.1-foundation of the GAMA Photo Capture PWA - a satellite application for GAMA ERP. This phase establishes the foundational infrastructure including project setup, authentication integration, app shell with navigation, and database schema creation. The app shares the same Supabase project (ljbkjtaowrdddvjhsygj) with GAMA ERP for unified authentication and data access.

## Glossary

- **Photo_Capture_App**: The GAMA Photo Capture PWA application being developed
- **Supabase_Client**: The Supabase JavaScript client configured for database and auth operations
- **Auth_Session**: A valid Supabase authentication session representing a logged-in user
- **Protected_Route**: A route that requires valid authentication to access
- **App_Shell**: The main application layout including header and bottom navigation
- **Bottom_Nav**: The bottom navigation component with tabs for Camera, Jobs, Gallery, Queue, and Settings
- **App_Header**: The top header component displaying title, offline status, and upload queue indicator
- **User_Profile**: The user's profile record from the shared user_profiles table containing role information
- **Allowed_Roles**: The set of roles permitted to use the Photo Capture app: owner, director, operations_manager, operations, ops, engineer
- **PWA_Manifest**: The web app manifest file defining PWA metadata, icons, and display settings
- **Service_Worker**: A script that runs in the background enabling offline capabilities and caching

## Requirements

### Requirement 1: Project Initialization

**User Story:** As a developer, I want a properly configured Next.js 15 project with TypeScript, TailwindCSS, and shadcn/ui, so that I can build the Photo Capture app with modern tooling and consistent styling.

#### Acceptance Criteria

1. THE Photo_Capture_App SHALL be initialized as a Next.js 15 application using the App Router
2. THE Photo_Capture_App SHALL use TypeScript in strict mode for type safety
3. THE Photo_Capture_App SHALL use TailwindCSS for styling
4. THE Photo_Capture_App SHALL use shadcn/ui components with the new-york theme
5. THE Photo_Capture_App SHALL run on port 3001 in development mode
6. THE Photo_Capture_App SHALL have a proper directory structure following atomic design principles for components

### Requirement 2: Supabase Client Configuration

**User Story:** As a developer, I want properly configured Supabase clients for both server and client components, so that I can interact with the shared GAMA ERP database securely.

#### Acceptance Criteria

1. THE Photo_Capture_App SHALL configure a server-side Supabase_Client for Server Components and API routes
2. THE Photo_Capture_App SHALL configure a client-side Supabase_Client for Client Components
3. THE Supabase_Client SHALL connect to the shared GAMA ERP Supabase project (ljbkjtaowrdddvjhsygj)
4. THE Supabase_Client SHALL use environment variables for URL and anon key configuration
5. WHEN environment variables are missing, THEN THE Photo_Capture_App SHALL fail gracefully with a clear error message

### Requirement 3: Authentication Integration

**User Story:** As operations staff, I want to use my existing GAMA ERP login credentials, so that I don't need to create a separate account for the Photo Capture app.

#### Acceptance Criteria

1. THE Photo_Capture_App SHALL use the shared Supabase Auth from GAMA ERP
2. WHEN a user is not authenticated, THEN THE Photo_Capture_App SHALL redirect to the login page
3. WHEN a user authenticates successfully, THEN THE Photo_Capture_App SHALL create an Auth_Session
4. THE Photo_Capture_App SHALL provide a login page with Google OAuth sign-in option
5. WHEN a user logs out, THEN THE Photo_Capture_App SHALL clear the Auth_Session and redirect to login
6. THE Photo_Capture_App SHALL persist Auth_Session across browser sessions

### Requirement 4: Role-Based Access Control

**User Story:** As a system administrator, I want only authorized roles to access the Photo Capture app, so that sensitive shipment documentation is protected.

#### Acceptance Criteria

1. WHEN a user authenticates, THEN THE Photo_Capture_App SHALL verify the user has an Allowed_Role
2. THE Allowed_Roles SHALL include: owner, director, operations_manager, operations, ops, engineer
3. IF a user does not have an Allowed_Role, THEN THE Photo_Capture_App SHALL display an access denied message
4. THE Photo_Capture_App SHALL fetch User_Profile from the shared user_profiles table to determine role

### Requirement 5: Protected Route Middleware

**User Story:** As a developer, I want middleware that protects routes requiring authentication, so that unauthenticated users cannot access app features.

#### Acceptance Criteria

1. THE Photo_Capture_App SHALL implement middleware to check Auth_Session on Protected_Routes
2. WHEN accessing a Protected_Route without valid Auth_Session, THEN THE middleware SHALL redirect to login
3. THE middleware SHALL allow access to public routes (login page) without authentication
4. THE middleware SHALL preserve the original URL for redirect after successful login

### Requirement 6: App Shell Layout

**User Story:** As operations staff, I want a consistent app layout with easy navigation, so that I can quickly access different features of the app.

#### Acceptance Criteria

1. THE App_Shell SHALL include an App_Header at the top of the screen
2. THE App_Shell SHALL include a Bottom_Nav at the bottom of the screen
3. THE App_Shell SHALL have a main content area between header and navigation
4. THE App_Header SHALL display the current page title
5. THE App_Header SHALL display an offline status indicator
6. THE App_Header SHALL display an upload queue count indicator

### Requirement 7: Bottom Navigation

**User Story:** As operations staff, I want bottom navigation tabs, so that I can quickly switch between Camera, Jobs, Gallery, Queue, and Settings.

#### Acceptance Criteria

1. THE Bottom_Nav SHALL display five navigation tabs: Camera, Jobs, Gallery, Queue, Settings
2. THE Bottom_Nav SHALL highlight the currently active tab
3. WHEN a user taps a tab, THEN THE Photo_Capture_App SHALL navigate to the corresponding page
4. THE Bottom_Nav SHALL use appropriate icons for each tab
5. THE Bottom_Nav SHALL remain fixed at the bottom of the viewport

### Requirement 8: Route Structure with Placeholder Pages

**User Story:** As a developer, I want the complete route structure set up with placeholder pages, so that navigation works and future development can fill in functionality.

#### Acceptance Criteria

1. THE Photo_Capture_App SHALL have a /camera route as the default landing page
2. THE Photo_Capture_App SHALL have a /jobs route for job selection
3. THE Photo_Capture_App SHALL have a /gallery route for viewing photos
4. THE Photo_Capture_App SHALL have a /queue route for upload queue management
5. THE Photo_Capture_App SHALL have a /settings route for app configuration
6. THE Photo_Capture_App SHALL have a /login route for authentication
7. WHEN accessing the root path (/), THEN THE Photo_Capture_App SHALL redirect to /camera

### Requirement 9: PWA Foundation

**User Story:** As operations staff, I want the app to be installable on my device, so that I can access it like a native app.

#### Acceptance Criteria

1. THE Photo_Capture_App SHALL include a PWA_Manifest with app name, icons, and theme colors
2. THE PWA_Manifest SHALL define the app display mode as standalone
3. THE PWA_Manifest SHALL include icons in sizes 192x192 and 512x512
4. THE Photo_Capture_App SHALL register a basic Service_Worker for future offline support
5. THE Photo_Capture_App SHALL include appropriate meta tags for PWA support

### Requirement 10: Database Schema Setup

**User Story:** As a developer, I want the photo capture database tables created in Supabase, so that the app can store photo metadata and manage upload queues.

#### Acceptance Criteria

1. THE Photo_Capture_App SHALL have a shipment_photos table for storing photo metadata
2. THE shipment_photos table SHALL reference job_orders via job_order_id foreign key
3. THE shipment_photos table SHALL reference auth.users via uploaded_by foreign key
4. THE Photo_Capture_App SHALL have a photo_upload_queue table for offline sync tracking
5. THE Photo_Capture_App SHALL have a photo_tags table for flexible categorization
6. THE tables SHALL have appropriate indexes for query performance
7. THE tables SHALL have Row Level Security (RLS) policies enabled

### Requirement 11: Storage Bucket Configuration

**User Story:** As a developer, I want a Supabase storage bucket configured for photo uploads, so that photos can be stored securely in the cloud.

#### Acceptance Criteria

1. THE Photo_Capture_App SHALL use a storage bucket named "shipment-photos"
2. THE storage bucket SHALL be private (not publicly accessible)
3. THE storage bucket SHALL have a file size limit of 10MB
4. THE storage bucket SHALL allow MIME types: image/jpeg, image/png, image/webp, image/heic
5. THE storage bucket SHALL have RLS policies allowing users to upload to their own folder
6. THE storage bucket SHALL have RLS policies allowing users to read their own files
