# Implementation Plan: v0.3 Guided Capture Flow

## Overview

This implementation plan breaks down the Guided Capture Flow into discrete coding tasks. The flow walks users through step-by-step photo checklists per job stage, with camera placeholder in v0.3 (real camera in v0.4).

## Tasks

- [x] 1. Set up capture session infrastructure
  - [x] 1.1 Create capture session types and state management
    - Create `types/capture.ts` with CaptureSessionState, CapturedPhotoData, PreviewPhotoData interfaces
    - Create `hooks/use-capture-session.ts` with state management logic
    - Implement state transitions: capture → preview → next/complete
    - _Requirements: 3.1, 3.3, 3.4_
  
  - [x] 1.2 Write property test for state transitions
    - **Property 4: Capture triggers preview state**
    - **Property 7: Retake returns to capture state**
    - **Property 8: Confirm saves and advances**
    - **Validates: Requirements 3.3.3, 3.4.4, 3.4.5**

- [x] 2. Implement checklist loading and display
  - [x] 2.1 Create server action for loading checklist
    - Add `loadChecklist(stage)` to `lib/actions/capture.ts`
    - Add `loadExistingPhotos(jobId, stage)` for resume support
    - Query photo_checklists filtered by stage, ordered by sequence
    - _Requirements: 3.1.2, 3.7.1_
  
  - [x] 2.2 Write property test for checklist loading
    - **Property 1: Checklist loading returns correct items**
    - **Validates: Requirements 3.1.2**
  
  - [x] 2.3 Create StepProgressBar atom component
    - Display "Step X of Y" with progress bar
    - Accept currentStep (1-indexed) and totalSteps props
    - _Requirements: 3.1.4_
  
  - [x] 2.4 Write property test for step indicator
    - **Property 2: Step indicator accuracy**
    - **Validates: Requirements 3.1.4**

- [x] 3. Implement checklist step view
  - [x] 3.1 Create StepInstructions atom component
    - Display title, description, tips
    - Support locale switching (en/id)
    - _Requirements: 3.2.1, 3.2.2, 3.2.3_
  
  - [x] 3.2 Write property test for locale-aware content
    - **Property 3: Locale-aware content display**
    - **Validates: Requirements 3.2.1, 3.2.2, 3.2.3**
  
  - [x] 3.3 Create CameraPlaceholder atom component
    - Display placeholder UI for v0.3
    - Include file picker for testing (simulates capture)
    - Trigger onCapture callback with selected image
    - _Requirements: 3.3.1_
  
  - [x] 3.4 Create CaptureButton atom component
    - Large circular button (thumb-friendly)
    - Disabled and capturing states
    - _Requirements: 3.3.2_
  
  - [x] 3.5 Create ChecklistStepView molecule component
    - Combine StepProgressBar, StepInstructions, CameraPlaceholder, CaptureButton
    - Show Skip button only for optional items (is_required=false)
    - _Requirements: 3.2, 3.3, 3.5.1, 3.5.2_
  
  - [x] 3.6 Write property test for skip button visibility
    - **Property 9: Skip button visibility**
    - **Validates: Requirements 3.5.1, 3.5.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement photo preview and confirmation
  - [x] 5.1 Create GPS capture hook
    - Create `hooks/use-geolocation.ts`
    - Get current position with timeout
    - Return coordinates or null if unavailable
    - _Requirements: 3.3.4_
  
  - [x] 5.2 Write property test for GPS metadata
    - **Property 5: GPS metadata attachment**
    - **Validates: Requirements 3.3.4**
  
  - [x] 5.3 Create MetadataDisplay atom component
    - Display GPS coordinates (formatted)
    - Display timestamp
    - Show "GPS unavailable" if no coordinates
    - _Requirements: 3.4.2_
  
  - [x] 5.4 Write property test for metadata display
    - **Property 6: Preview displays photo metadata**
    - **Validates: Requirements 3.4.2**
  
  - [x] 5.5 Create PhotoPreviewSheet molecule component
    - Full-screen photo display
    - MetadataDisplay for GPS/timestamp
    - Optional notes input field
    - Retake and Confirm buttons
    - _Requirements: 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5_

- [x] 6. Implement skip and advance logic
  - [x] 6.1 Add skip handler to capture session hook
    - Add item to skippedItems set
    - Increment currentIndex
    - Do not add to captures map
    - _Requirements: 3.5.3, 3.5.4_
  
  - [x] 6.2 Write property test for skip advances
    - **Property 10: Skip advances to next item**
    - **Validates: Requirements 3.5.3**

- [x] 7. Implement completion summary
  - [x] 7.1 Create PhotoThumbnailGrid atom component
    - Grid of photo thumbnails
    - Show status badge (captured/skipped)
    - _Requirements: 3.6.2, 3.6.3_
  
  - [x] 7.2 Create CaptureCompleteSummary molecule component
    - Display "Stage Complete!" header
    - PhotoThumbnailGrid with all items
    - Show captured count and skipped count
    - Done button to return to job detail
    - _Requirements: 3.6.1, 3.6.2, 3.6.3, 3.6.4_
  
  - [x] 7.3 Write property test for completion summary
    - **Property 11: Completion summary content**
    - **Validates: Requirements 3.6.1, 3.6.2, 3.6.3**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement session resume and persistence
  - [x] 9.1 Calculate initial index from existing photos
    - Find first checklist item without corresponding photo
    - If all have photos, start at 0 (allow retakes)
    - _Requirements: 3.7.2, 3.7.3_
  
  - [x] 9.2 Write property test for session resume
    - **Property 13: Session resume position**
    - **Validates: Requirements 3.7.1, 3.7.2, 3.7.3**
  
  - [x] 9.3 Set up IndexedDB with Dexie
    - Create `lib/offline/db.ts` with PhotoCaptureDB class
    - Define photos table schema
    - _Requirements: 3.4.5 (offline support)_
  
  - [x] 9.4 Implement photo save to IndexedDB
    - Save photo blob and metadata on confirm
    - Generate UUID for each photo
    - Set status to 'pending'
    - _Requirements: 3.4.5_

- [x] 10. Implement main capture page and session orchestration
  - [x] 10.1 Create GuidedCaptureSession organism component
    - Orchestrate ChecklistStepView, PhotoPreviewSheet, CaptureCompleteSummary
    - Manage view state transitions
    - Handle exit with confirmation dialog
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 10.2 Create ExitConfirmDialog molecule component
    - Warn about unsaved captures
    - Confirm or cancel exit
    - _Requirements: 3.7 (session management)_
  
  - [x] 10.3 Create GuidedCapturePage (app/(main)/camera/page.tsx)
    - Parse job and stage from query params
    - Load checklist and existing photos
    - Render GuidedCaptureSession
    - Handle completion navigation back to job detail
    - _Requirements: 3.1.1, 3.6.4_

- [x] 11. Update job progress after completion
  - [x] 11.1 Create server action to check stage completion
    - Add `checkStageCompletion(jobId, stage)` to actions
    - Compare captured photos against required checklist items
    - _Requirements: 3.6.5_
  
  - [x] 11.2 Write property test for stage completion
    - **Property 12: Stage completion updates progress**
    - **Validates: Requirements 3.6.5**
  
  - [x] 11.3 Update job detail page to reflect completion
    - Refresh progress data after returning from capture
    - Stage card shows updated completion status
    - _Requirements: 3.6.5_

- [x] 12. Final checkpoint - Ensure all tests pass
  - All 782 tests pass
  - Build succeeds

## Notes

- All tasks including property-based tests are required
- v0.3 uses camera placeholder - real camera integration in v0.4
- IndexedDB setup prepares for offline sync (full sync in v0.5)
- Each task references specific requirements for traceability
- Property tests use fast-check library with minimum 100 iterations
