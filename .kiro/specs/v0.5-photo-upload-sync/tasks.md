# Implementation Plan: v0.5 Photo Upload + Offline Sync

## Overview

This implementation plan breaks down the v0.5 Photo Upload + Offline Sync feature into discrete coding tasks. The implementation follows a bottom-up approach: first building the service layer (upload logic, path generation), then the hooks layer (sync management, queue state), and finally the UI components (queue page, header badge).

## Tasks

- [x] 1. Extend IndexedDB schema for retry tracking
  - [x] 1.1 Add retry fields to OfflinePhoto interface
    - Add `retryCount?: number` field
    - Add `lastError?: string | null` field
    - Add `lastAttemptAt?: string | null` field
    - Update Dexie schema version to 2
    - _Requirements: 3.1, 3.2_
  
  - [x] 1.2 Add helper functions for retry management
    - Implement `getUploadablePhotos(maxRetries)` - get photos ready for upload
    - Implement `updatePhotoRetry(id, error)` - increment retry count and set error
    - Implement `resetPhotoRetry(id)` - reset retry count for manual retry
    - _Requirements: 3.1, 3.6_
  
  - [x] 1.3 Write property test for retry count increment
    - **Property 10: Retry Behavior**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 2. Implement storage path service
  - [x] 2.1 Create storage path generation module
    - Create `lib/sync/storage-path.ts`
    - Implement `buildStoragePath(components)` function
    - Implement `extractYearMonth(date)` helper
    - Implement `generateStoragePath(userId, photo)` main function
    - Path format: `{userId}/{YYYY}/{MM}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 2.2 Write property test for storage path format
    - **Property 1: Storage Path Format**
    - **Validates: Requirements 1.1, 8.1, 8.2, 8.3, 8.4**

- [x] 3. Implement upload service
  - [x] 3.1 Create upload service module
    - Create `lib/sync/upload-service.ts`
    - Implement `uploadToStorage(blob, path)` - upload blob to Supabase Storage
    - Implement `insertShipmentPhoto(photo, userId, storagePath)` - create database record
    - Implement `verifyUpload(photoId)` - verify database record exists
    - _Requirements: 1.1, 1.3, 7.3_
  
  - [x] 3.2 Implement main upload function
    - Implement `uploadPhoto(photo, userId, options)` function
    - Update IndexedDB status to 'uploading' before upload
    - Upload blob to Storage
    - Insert metadata to database
    - Delete blob from IndexedDB on success
    - Update status to 'failed' on error
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [x] 3.3 Write property test for status transitions
    - **Property 2: Status Transition to Uploading**
    - **Validates: Requirements 1.2**
  
  - [x] 3.4 Write property test for metadata preservation
    - **Property 3: Metadata Preservation on Success**
    - **Validates: Requirements 1.3, 1.6**
  
  - [x] 3.5 Write property test for blob deletion safety
    - **Property 14: Blob Deletion Safety**
    - **Validates: Requirements 7.1, 7.3**

- [x] 4. Checkpoint - Ensure service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement online status hook
  - [x] 5.1 Create useOnlineStatus hook
    - Create `hooks/use-online-status.ts`
    - Track navigator.onLine state
    - Listen to online/offline events
    - Return `{ isOnline, isOffline }`
    - _Requirements: 2.1, 2.4_
  
  - [x] 5.2 Write unit tests for online status hook
    - Test initial state matches navigator.onLine
    - Test state updates on online/offline events
    - _Requirements: 2.1_

- [x] 6. Implement upload queue hook
  - [x] 6.1 Create useUploadQueue hook
    - Create `hooks/use-upload-queue.ts`
    - Load photos from IndexedDB
    - Group photos by status (uploading, pending, failed)
    - Calculate statistics (counts, total size)
    - Provide refresh function
    - _Requirements: 4.1, 4.3_
  
  - [x] 6.2 Write property test for queue grouping
    - **Property 12: Queue UI Display**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 7. Implement sync manager hook
  - [x] 7.1 Create useSyncManager hook
    - Create `hooks/use-sync-manager.ts`
    - Implement sync state machine (idle, processing, paused, complete, error)
    - Process queue in FIFO order (oldest first)
    - Upload one photo at a time
    - Track upload progress per photo
    - _Requirements: 2.2, 2.3, 2.5_
  
  - [x] 7.2 Implement auto-sync on online
    - Start sync automatically when online detected
    - Pause sync when offline detected
    - Resume sync when back online
    - _Requirements: 2.1, 2.4_
  
  - [x] 7.3 Implement retry logic with exponential backoff
    - Retry failed uploads up to 3 times
    - Use exponential backoff delays (1s, 2s, 4s)
    - Stop automatic retries after max attempts
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 7.4 Implement manual retry and delete actions
    - Implement `retryPhoto(photoId)` - reset retry count and upload
    - Implement `retryAllFailed()` - retry all failed photos
    - Implement `deletePhoto(photoId)` - remove from IndexedDB
    - _Requirements: 3.4, 3.5, 3.6, 4.5_
  
  - [x] 7.5 Write property test for FIFO processing
    - **Property 7: FIFO Queue Processing**
    - **Validates: Requirements 2.2, 2.5**
  
  - [x] 7.6 Write property test for sequential upload
    - **Property 8: Sequential Upload**
    - **Validates: Requirements 2.3**
  
  - [x] 7.7 Write property test for manual retry reset
    - **Property 11: Manual Retry Reset**
    - **Validates: Requirements 3.6**

- [x] 8. Checkpoint - Ensure hooks layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create sync context provider
  - [x] 9.1 Create SyncProvider component
    - Create `contexts/sync-context.tsx`
    - Combine useSyncManager and useUploadQueue hooks
    - Provide sync state and actions via context
    - Auto-start sync on mount if online
    - _Requirements: 2.1, 2.6_
  
  - [x] 9.2 Integrate SyncProvider into app layout
    - Wrap app with SyncProvider in root layout
    - Ensure provider is available to all pages
    - _Requirements: 2.6_

- [x] 10. Implement queue UI components
  - [x] 10.1 Create SyncStatusBadge atom
    - Create `components/atoms/sync-status-badge.tsx`
    - Display pending count badge
    - Show upload animation when syncing
    - Hide badge when count is 0
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 10.2 Create UploadProgress atom
    - Create `components/atoms/upload-progress.tsx`
    - Display progress bar (0-100%)
    - Animate during upload
    - _Requirements: 6.1, 6.2_
  
  - [x] 10.3 Create QueueItemActions atom
    - Create `components/atoms/queue-item-actions.tsx`
    - Retry button for failed photos
    - Delete button for failed photos
    - Disable during upload
    - _Requirements: 3.4, 4.5_
  
  - [x] 10.4 Create EmptyQueueState atom
    - Create `components/atoms/empty-queue-state.tsx`
    - Display message when queue is empty
    - Show checkmark icon
    - _Requirements: 4.6_
  
  - [x] 10.5 Write property test for header badge count
    - **Property 13: Header Badge Count**
    - **Validates: Requirements 5.1**

- [x] 11. Implement queue page molecules and organisms
  - [x] 11.1 Create QueueItem molecule
    - Create `components/molecules/queue-item.tsx`
    - Display thumbnail from blob
    - Show job number, stage, photo type
    - Show status and error message
    - Include progress bar and actions
    - _Requirements: 4.2, 4.4, 6.1_
  
  - [x] 11.2 Create QueueSummary molecule
    - Create `components/molecules/queue-summary.tsx`
    - Display total counts (pending, uploading, failed)
    - Display total size in MB
    - Include "Retry All" button
    - _Requirements: 4.3, 3.5_
  
  - [x] 11.3 Create QueueList organism
    - Create `components/organisms/queue-list.tsx`
    - Group photos by status (uploading first, then pending, then failed)
    - Render QueueItem for each photo
    - Handle empty state
    - _Requirements: 4.1, 4.6_

- [x] 12. Update app header and queue page
  - [x] 12.1 Enhance AppHeader with sync status
    - Add SyncStatusBadge to AppHeader
    - Connect to sync context for counts
    - Navigate to /queue on badge click
    - Show alongside offline indicator
    - _Requirements: 5.1, 5.4, 5.5_
  
  - [x] 12.2 Implement QueuePage
    - Update `app/(main)/queue/page.tsx`
    - Use sync context for state and actions
    - Render QueueSummary and QueueList
    - Handle loading and error states
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 12.3 Write unit tests for QueuePage
    - Test renders queue items correctly
    - Test retry and delete actions work
    - Test empty state displays
    - _Requirements: 4.1, 4.6_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` to verify no build errors

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows bottom-up approach: services → hooks → UI
