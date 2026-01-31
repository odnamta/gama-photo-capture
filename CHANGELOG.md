# Changelog

All notable changes to GAMA Photo Capture will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2026-01-31 - v0.5 Photo Upload + Offline Sync Complete

### ✨ Features
- Storage path generation service (`lib/sync/storage-path.ts`)
- Upload service for Supabase Storage and database (`lib/sync/upload-service.ts`)
- Online/offline status hook (`hooks/use-online-status.ts`)
- Upload queue hook (`hooks/use-upload-queue.ts`) - groups photos by status
- Sync manager hook (`hooks/use-sync-manager.ts`) - orchestrates upload process
- Sync context provider (`contexts/sync-context.tsx`) - app-wide sync state
- IndexedDB retry tracking fields (retryCount, lastError, lastAttemptAt)
- Helper functions: `getUploadablePhotos`, `updatePhotoRetry`, `resetPhotoRetry`

### 🧩 Components
- `SyncStatusBadge` atom - header badge with pending count and upload animation
- `UploadProgress` atom - progress bar for active uploads
- `QueueItemActions` atom - retry/delete buttons for failed photos
- `EmptyQueueState` atom - success message when queue is empty
- `QueueItem` molecule - photo card with thumbnail, metadata, status, actions
- `QueueSummary` molecule - stats overview with retry all button
- `QueueList` organism - grouped list of queue items
- Enhanced `AppHeader` with sync status badge
- Enhanced `AppLayout` with sync context integration

### 🔧 Improvements
- Extended IndexedDB schema to version 2 with retry tracking
- Storage path format: `{userId}/{YYYY}/{MM}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg`
- `useSyncExternalStore` for React 18+ online status tracking
- SSR-safe online status with server snapshot
- FIFO queue processing (oldest photos first)
- Sequential upload (one at a time)
- Exponential backoff retry (1s, 2s, 4s)
- Maximum 3 retry attempts before manual intervention required
- Auto-sync when coming online
- Pause sync when going offline

### 🧪 Tests
- 1440 tests passing (up from 1235)
- 77 property-based tests for upload-sync feature
- Property tests: Storage path format, status transitions, metadata preservation, blob deletion safety, retry behavior, FIFO processing, sequential upload, manual retry reset, queue grouping, header badge count

### 📝 Pages
- Updated `/queue` page with full queue management UI
- Queue summary with pending/uploading/failed counts
- Grouped photo list with thumbnails and actions
- Retry individual photos or retry all failed
- Delete failed photos from queue

---

## [0.4.0] - 2026-01-31 - v0.4 Real Camera + GPS Integration Complete

### ✨ Features
- Real device camera access using getUserMedia API
- Rear camera by default (facingMode: 'environment')
- Front/back camera switching on multi-camera devices
- Photo capture with automatic resize (max 2048px) and JPEG compression (80% quality)
- GPS integration with 5-second timeout (non-blocking)
- Camera permission error handling with retry and settings guidance
- Stream interruption handling with automatic restart
- Fallback to file picker when camera not supported

### 🧩 Components
- `CameraCapture` organism - integrates camera, GPS, and UI components
- `CameraPreview` atom - video element with iOS Safari support (playsinline)
- `CameraSwitchButton` atom - toggle between front/back cameras
- `CameraPermissionError` atom - error display with retry/settings
- Enhanced `GpsIndicator` atom - acquiring/available/unavailable states
- Updated `CameraPlaceholder` atom - fallback mode for unsupported browsers

### 🔧 Hooks & Utilities
- `useCamera` hook - camera stream management, switching, cleanup
- `processVideoFrame` utility - canvas capture, resize, compress
- `isCameraSupported` helper - check getUserMedia availability
- `stopAllTracks` helper - proper stream cleanup

### 🧪 Tests
- 1235 tests passing (up from 793)
- 131 property-based tests with fast-check (100+ iterations each)
- New property tests: stream cleanup, camera switch visibility, facingMode toggle, state preservation on switch, image resize, processed size, GPS metadata handling, GPS indicator status, state preservation on error

### 📝 Integration
- `ChecklistStepView` now uses real camera with file picker fallback
- `GuidedCaptureSession` receives blob + metadata directly from camera
- Removed `createPlaceholderBlob` function (no longer needed)

---

## [0.3.0] - 2026-01-31 - v0.3 Guided Capture Flow Complete

### ✨ Features
- Guided photo capture with step-by-step checklist flow
- Job stage support: job_start, in_transit, job_end
- Required vs optional photo handling with skip functionality
- Stage completion tracking with `checkStageCompletion` server action
- Session resume from existing photos
- Photo preview with GPS metadata and notes
- Completion summary with captured/skipped photo grid
- Exit confirmation dialog for unsaved captures
- IndexedDB persistence for offline support (via Dexie.js)

### 🧩 Components
- `GuidedCaptureSession` organism - orchestrates capture flow
- `ChecklistStepView` molecule - displays current checklist item
- `PhotoPreviewSheet` molecule - photo preview with confirm/retake
- `CaptureCompleteSummary` molecule - completion summary
- `StepProgressBar` atom - step indicator
- `StepInstructions` atom - localized instructions
- `CameraPlaceholder` atom - placeholder for v0.4 camera
- `CaptureButton` atom - large capture button
- `MetadataDisplay` atom - GPS/timestamp display
- `PhotoThumbnailGrid` atom - photo grid with status badges

### 🔧 Hooks & Actions
- `useCaptureSession` hook - session state management
- `useGeolocation` hook - GPS capture
- `loadChecklist` server action - load checklist items
- `loadExistingPhotos` server action - load existing photos for resume
- `checkStageCompletion` server action - check stage completion status
- `savePhotoToIndexedDB` - offline photo persistence

### 🧪 Tests
- 793 tests passing (up from 563)
- 14 property-based tests with fast-check (100+ iterations each)
- Property tests cover: checklist loading, step indicator, locale content, capture state transitions, GPS metadata, metadata display, skip button visibility, skip advances, completion summary, session resume, stage completion

### 📝 Documentation
- Updated camera page with guided capture flow
- Added JSDoc comments to all new components and hooks

---

## [Unreleased]

### ⚠️ Breaking Changes
- Changed app model from free-form to guided capture (Zipcar-style)
- Added `photo_checklists` table requirement
- Updated `shipment_photos` schema with `checklist_item_id` and `stage`

### ✨ Features (Planned)
- Real camera integration (v0.4)
- Photo upload to Supabase Storage (v0.5)
- Offline sync with background upload (v0.5)

### 📝 Documentation
- Updated project-context.md with Zipcar model
- Created database-schema.md with photo_checklists
- Replaced v0.2 spec with job selection + checklist status
- Created v0.3-guided-capture spec
- Created v0.4-camera-gps spec

---

## [0.3.0-spec] - 2026-01-31 - v0.3 Guided Capture Spec Complete

### 📝 Documentation
- Completed v0.3 Guided Capture spec with design.md and tasks.md
- Design includes state machine, component hierarchy, 13 correctness properties
- Tasks include 12 implementation tasks with property-based testing
- Ready for implementation phase

---

## [0.2.1] - 2026-01-31 - Database Types

### 🔧 Improvements
- Created manual `types/database.ts` with typed Supabase tables (avoids 300+ table context bloat from shared GAMA ERP)
- Updated Supabase clients to use `Database` type for type-safe queries
- Fixed nullable field types in `JobWithProgress` and `UserProfile` to match database schema

### 🧪 Tests
- 131 tests passing (no regressions)

---

## [0.2.0] - 2026-01-31 - Job Selection + Checklist Status

### ✨ Features
- Job list page showing user's assigned jobs via resource_assignments
- Job card component with photo progress indicators per stage
- Job detail page with stage cards (job_start, in_transit, job_end)
- Stage progress tracking (required vs completed photos)
- Stage locking: job_end locked until job_start is complete
- Photo progress badge component (color-coded: red/yellow/green)
- Stage card component with progress bar and capture button
- Empty state component for lists with no data
- Server actions for fetching jobs and job details

### 🎨 UI/UX
- Progress component from shadcn/ui
- Header action slot for custom buttons
- Refresh button on job list
- Back navigation on job detail

### 🧪 Tests
- 131 tests passing (15 new job type tests)
- Stage locking logic tests
- Photo requirements validation tests

### 📦 Dependencies
- @radix-ui/react-progress for Progress component

---

## [0.1.0] - 2026-01-31 - Foundation Complete ✅

### ✨ Features
- Next.js 16 project with TypeScript strict mode, TailwindCSS, shadcn/ui (new-york theme)
- Supabase client configuration (server + client) with environment variable validation
- Google OAuth authentication with Supabase Auth
- Role-based access control (owner, director, operations_manager, operations, ops, engineer)
- Protected route middleware with URL preservation for post-login redirect
- Login page with Google OAuth sign-in
- Access denied page for unauthorized roles
- App shell components (OfflineIndicator, AppHeader, BottomNav, AppLayout)
- All main routes with placeholder pages (Camera, Jobs, Gallery, Queue, Settings)
- PWA manifest with icons and service worker registration
- Database schema documentation (SQL migration, storage bucket docs, TypeScript types)

### 🎨 UI/UX
- Bottom navigation with 5 tabs (Camera, Jobs, Gallery, Queue, Settings)
- Fixed header with offline indicator and queue count badge
- Responsive app layout with proper spacing for fixed elements

### 📦 Dependencies
- @supabase/supabase-js, @supabase/ssr for Supabase integration
- fast-check for property-based testing
- vitest for unit testing
- lucide-react for icons

### 🧪 Tests
- 116 tests passing across 9 test files
- Property tests for environment validation, authentication, role verification, UI components
- Unit tests for routes, PWA configuration, project setup

### 📝 Documentation
- Database migration SQL: `docs/database/001_photo_capture_schema.sql`
- Storage bucket guide: `docs/database/002_storage_bucket.md`
- TypeScript types: `types/photo.ts`

---

## [0.0.1] - 2026-01-31 - Project Initialization

### ✨ Features
- Initial project structure created
- Kiro agent steering files configured
- PRD document completed

### 📝 Documentation
- Created `.kiro/steering/general.md` - Code conventions
- Created `.kiro/steering/project-context.md` - Project overview
- Created `.kiro/steering/database-schema.md` - Schema reference
- Created `.kiro/steering/formatting-standards.md` - Date/currency formatting
- Created `.kiro/hooks/update-project-context.md` - Auto-documentation hook
- Created `.kiro/hooks/update-database-schema.md` - Schema sync hook
- Created `CHANGELOG.md` - Version history tracking

---

## Version History Guidelines

### Version Numbering: v0.X.Y

| Segment | Meaning | Example |
|---------|---------|---------|
| **0** | Pre-1.0 (development) | v0.x.x |
| **X** | Major feature/module | v0.1 → v0.2 (new module) |
| **Y** | Sub-feature/enhancement | v0.1.0 → v0.1.1 (enhancement) |

### Changelog Entry Format

```markdown
## [X.X.X] - YYYY-MM-DD - [Title]

### ✨ Features
- New feature description

### 🐛 Bug Fixes
- Fixed [issue] that caused [problem]

### 🔧 Improvements
- Improved [area] for better [outcome]

### 📦 Dependencies
- Added/Updated [package] for [reason]

### ⚠️ Breaking Changes
- [Description of breaking change]

### 🗑️ Deprecated
- [Feature] is deprecated in favor of [replacement]

### 📝 Documentation
- Updated [document] with [changes]
```

### Emoji Reference

| Emoji | Category |
|-------|----------|
| ✨ | Features |
| 🐛 | Bug Fixes |
| 🔧 | Improvements |
| 📦 | Dependencies |
| ⚠️ | Breaking Changes |
| 🗑️ | Deprecated |
| 📝 | Documentation |
| 🚀 | Performance |
| 🔒 | Security |
| ♻️ | Refactor |
| 🎨 | UI/UX |
| 🧪 | Tests |

---

## Planned Milestones

### v0.1.0 - Foundation (Week 1-2) ✅
- [x] Project setup
- [x] Authentication integration
- [x] App shell with navigation
- [x] Database tables documented (run migration manually)

### v0.2.0 - Job Selection + Checklist Status (Week 3) ✅
- [x] Fetch jobs assigned to current user
- [x] Job list UI showing today's jobs
- [x] Job card shows checklist progress
- [x] Job detail page with stage cards
- [x] Stage locking (job_end requires job_start)

### v0.3.0 - Guided Capture Flow (Week 4-5) ✅
- [x] Create photo_checklists table with seed data
- [x] Step-by-step capture flow
- [x] Instructions and tips display
- [x] Preview with confirm/retake
- [x] Handle required vs optional items

### v0.4.0 - Camera + GPS (Week 6) ✅
- [x] Real camera access
- [x] GPS capture
- [x] Photo compression
- [x] Fallback to file picker

### v0.5.0 - Offline Support (Week 7-8)
- [ ] IndexedDB setup with Dexie.js
- [ ] Offline photo capture
- [ ] Background sync
- [ ] Queue management UI

### v0.6.0 - PWA & Polish (Week 9-10)
- [ ] Full PWA configuration
- [ ] Install prompt
- [ ] Settings page
- [ ] Performance optimization

### v1.0.0 - Production Release
- [ ] All features complete
- [ ] Testing completed
- [ ] Documentation finalized
- [ ] Deployed to production

---

*This changelog is maintained by the Kiro agent hook `update-project-context`.*
