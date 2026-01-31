# Design Document: v0.5 Photo Upload + Offline Sync

## Overview

This design document describes the implementation of photo upload and offline sync functionality for the GAMA Photo Capture PWA. The feature uploads photos from IndexedDB to Supabase Storage, creates metadata records in the shipment_photos table, and provides queue management UI for monitoring sync status.

The implementation follows an offline-first architecture where photos are always saved locally first (established in v0.3), then synced to the cloud when online. This ensures no data loss even with unreliable network connections common in field operations.

## Architecture

### High-Level Component Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    App Components                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ AppHeader   │  │ QueuePage   │  │ GuidedCaptureSession    │  │
│  │ (badge)     │  │ (queue UI)  │  │ (capture flow)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Sync Layer                                    │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ useSyncManager      │  │ useUploadQueue                  │   │
│  │ (orchestrates sync) │  │ (queue state & actions)         │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ uploadService       │  │ storagePathService              │   │
│  │ (upload logic)      │  │ (path generation)               │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                    │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ IndexedDB (Dexie)   │  │ Supabase                        │   │
│  │ - photos table      │  │ - Storage (shipment-photos)     │   │
│  │ - offline blobs     │  │ - Database (shipment_photos)    │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Sync State Machine

```
                         ┌──────────────────────────────────┐
                         │                                  │
                         ▼                                  │
┌─────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  IDLE   │───▶│   PROCESSING    │───▶│    COMPLETE     │──┘
└─────────┘    └─────────────────┘    └─────────────────┘
     │                  │                     │
     │                  │                     │
     │                  ▼                     │
     │         ┌─────────────────┐            │
     │         │     PAUSED      │────────────┘
     │         │   (offline)     │
     │         └─────────────────┘
     │                  │
     │                  ▼
     │         ┌─────────────────┐
     └────────▶│     ERROR       │
               └─────────────────┘
```

### Upload Flow Sequence

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│ IndexedDB│     │UploadService │     │  Supabase   │     │ Supabase │
│          │     │              │     │  Storage    │     │ Database │
└────┬─────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
     │                  │                    │                 │
     │  Get pending     │                    │                 │
     │  photo           │                    │                 │
     │◄─────────────────│                    │                 │
     │                  │                    │                 │
     │  Update status   │                    │                 │
     │  to 'uploading'  │                    │                 │
     │◄─────────────────│                    │                 │
     │                  │                    │                 │
     │                  │  Upload blob       │                 │
     │                  │───────────────────▶│                 │
     │                  │                    │                 │
     │                  │  Return path       │                 │
     │                  │◄───────────────────│                 │
     │                  │                    │                 │
     │                  │  Insert metadata   │                 │
     │                  │────────────────────────────────────▶│
     │                  │                    │                 │
     │                  │  Return record     │                 │
     │                  │◄────────────────────────────────────│
     │                  │                    │                 │
     │  Delete blob     │                    │                 │
     │◄─────────────────│                    │                 │
     │                  │                    │                 │
```

## Components and Interfaces

### Component Hierarchy

```
App Layout
├── AppHeader (organisms - enhanced)
│   ├── OfflineIndicator (atoms - existing)
│   └── SyncStatusBadge (atoms - NEW)
│
├── QueuePage (pages - enhanced)
│   ├── QueueSummary (molecules - NEW)
│   ├── QueueList (organisms - NEW)
│   │   └── QueueItem (molecules - NEW)
│   │       ├── PhotoThumbnail (atoms - existing)
│   │       ├── UploadProgress (atoms - NEW)
│   │       └── QueueItemActions (atoms - NEW)
│   └── EmptyQueueState (atoms - NEW)
│
└── SyncProvider (providers - NEW)
    └── Wraps app to provide sync context
```

### New Component Interfaces

```typescript
// atoms/sync-status-badge.tsx
interface SyncStatusBadgeProps {
  /** Number of pending photos */
  pendingCount: number
  /** Whether currently uploading */
  isUploading: boolean
  /** Whether device is online */
  isOnline: boolean
  /** Click handler to navigate to queue */
  onClick: () => void
  /** Additional CSS classes */
  className?: string
}

// atoms/upload-progress.tsx
interface UploadProgressProps {
  /** Progress percentage (0-100) */
  progress: number
  /** Whether upload is in progress */
  isUploading: boolean
  /** Additional CSS classes */
  className?: string
}

// atoms/queue-item-actions.tsx
interface QueueItemActionsProps {
  /** Photo status */
  status: 'pending' | 'uploading' | 'failed'
  /** Callback to retry upload */
  onRetry: () => void
  /** Callback to delete photo */
  onDelete: () => void
  /** Whether actions are disabled */
  disabled?: boolean
}

// atoms/empty-queue-state.tsx
interface EmptyQueueStateProps {
  /** Additional CSS classes */
  className?: string
}

// molecules/queue-item.tsx
interface QueueItemProps {
  /** Photo data from IndexedDB */
  photo: OfflinePhoto
  /** Job number for display */
  jobNumber?: string
  /** Upload progress (0-100) */
  progress?: number
  /** Callback to retry upload */
  onRetry: () => void
  /** Callback to delete photo */
  onDelete: () => void
  /** Additional CSS classes */
  className?: string
}

// molecules/queue-summary.tsx
interface QueueSummaryProps {
  /** Total pending count */
  pendingCount: number
  /** Total failed count */
  failedCount: number
  /** Total uploading count */
  uploadingCount: number
  /** Total size in bytes */
  totalSize: number
  /** Whether currently syncing */
  isSyncing: boolean
  /** Callback to retry all failed */
  onRetryAll: () => void
  /** Additional CSS classes */
  className?: string
}

// organisms/queue-list.tsx
interface QueueListProps {
  /** Photos grouped by status */
  photos: {
    uploading: OfflinePhoto[]
    pending: OfflinePhoto[]
    failed: OfflinePhoto[]
  }
  /** Map of job IDs to job numbers */
  jobNumbers: Map<string, string>
  /** Current upload progress by photo ID */
  uploadProgress: Map<string, number>
  /** Callback to retry a photo */
  onRetry: (photoId: string) => void
  /** Callback to delete a photo */
  onDelete: (photoId: string) => void
  /** Additional CSS classes */
  className?: string
}
```

### Hook Interfaces

```typescript
// hooks/use-sync-manager.ts
interface UseSyncManagerOptions {
  /** Whether to auto-start sync when online */
  autoSync?: boolean  // default: true
  /** Maximum concurrent uploads */
  maxConcurrent?: number  // default: 1
  /** Maximum retry attempts */
  maxRetries?: number  // default: 3
}

interface UseSyncManagerReturn {
  /** Current sync state */
  state: SyncState
  /** Whether currently syncing */
  isSyncing: boolean
  /** Current upload progress by photo ID */
  uploadProgress: Map<string, number>
  /** Error message if any */
  error: string | null
  
  // Actions
  /** Start sync process */
  startSync: () => Promise<void>
  /** Pause sync process */
  pauseSync: () => void
  /** Retry a specific photo */
  retryPhoto: (photoId: string) => Promise<void>
  /** Retry all failed photos */
  retryAllFailed: () => Promise<void>
  /** Delete a photo from queue */
  deletePhoto: (photoId: string) => Promise<void>
}

type SyncState = 
  | 'idle'        // No pending uploads
  | 'processing'  // Actively uploading
  | 'paused'      // Paused (offline or manual)
  | 'complete'    // All uploads done
  | 'error'       // Error occurred

// hooks/use-upload-queue.ts
interface UseUploadQueueReturn {
  /** All photos in queue */
  photos: OfflinePhoto[]
  /** Photos grouped by status */
  grouped: {
    uploading: OfflinePhoto[]
    pending: OfflinePhoto[]
    failed: OfflinePhoto[]
  }
  /** Queue statistics */
  stats: {
    total: number
    pending: number
    uploading: number
    failed: number
    totalSize: number
  }
  /** Whether queue is loading */
  isLoading: boolean
  /** Refresh queue data */
  refresh: () => Promise<void>
}

// hooks/use-online-status.ts
interface UseOnlineStatusReturn {
  /** Whether device is online */
  isOnline: boolean
  /** Whether device is offline */
  isOffline: boolean
}
```

### Service Interfaces

```typescript
// lib/sync/upload-service.ts
interface UploadResult {
  success: boolean
  photoId: string
  storagePath?: string
  shipmentPhotoId?: string
  error?: string
}

interface UploadServiceOptions {
  /** Callback for progress updates */
  onProgress?: (photoId: string, progress: number) => void
}

/** Upload a single photo to Supabase */
async function uploadPhoto(
  photo: OfflinePhoto,
  userId: string,
  options?: UploadServiceOptions
): Promise<UploadResult>

/** Generate storage path for a photo */
function generateStoragePath(
  userId: string,
  photo: OfflinePhoto
): string

/** Verify upload was successful */
async function verifyUpload(
  photoId: string,
  storagePath: string
): Promise<boolean>

// lib/sync/storage-path-service.ts
interface StoragePathComponents {
  userId: string
  year: string
  month: string
  jobOrderId: string
  stage: string
  timestamp: number
  photoId: string
}

/** Generate storage path from components */
function buildStoragePath(components: StoragePathComponents): string

/** Parse storage path into components */
function parseStoragePath(path: string): StoragePathComponents | null

/** Extract year and month from Date */
function extractYearMonth(date: Date): { year: string; month: string }
```

## Data Models

### Enhanced OfflinePhoto (IndexedDB)

The existing OfflinePhoto interface in `lib/offline/db.ts` is sufficient. We add helper functions:

```typescript
// lib/offline/db.ts - additions

/** Get photos ready for upload (pending, not exceeding retry limit) */
export async function getUploadablePhotos(
  maxRetries: number = 3
): Promise<OfflinePhoto[]> {
  return db.photos
    .where('status')
    .anyOf(['pending', 'failed'])
    .filter(photo => (photo.retryCount || 0) < maxRetries)
    .sortBy('createdAt')
}

/** Update photo with retry info */
export async function updatePhotoRetry(
  id: string,
  error: string
): Promise<void> {
  const photo = await db.photos.get(id)
  if (photo) {
    await db.photos.update(id, {
      status: 'failed',
      retryCount: (photo.retryCount || 0) + 1,
      lastError: error,
      lastAttemptAt: new Date().toISOString()
    })
  }
}

/** Reset retry count for manual retry */
export async function resetPhotoRetry(id: string): Promise<void> {
  await db.photos.update(id, {
    status: 'pending',
    retryCount: 0,
    lastError: null
  })
}
```

### Extended OfflinePhoto Fields

```typescript
// Add to OfflinePhoto interface in lib/offline/db.ts
interface OfflinePhoto {
  // ... existing fields ...
  
  /** Number of upload retry attempts */
  retryCount?: number
  /** Last error message */
  lastError?: string | null
  /** Timestamp of last upload attempt */
  lastAttemptAt?: string | null
}
```

### Shipment Photo Insert

```typescript
// Type for inserting into shipment_photos
interface ShipmentPhotoInsert {
  id: string  // Use same ID as OfflinePhoto
  job_order_id: string
  checklist_item_id: string
  uploaded_by: string
  photo_type: string
  stage: string
  file_name: string
  file_size: number
  mime_type: string
  storage_bucket: string
  storage_path: string
  gps_latitude: number | null
  gps_longitude: number | null
  gps_accuracy: number | null
  taken_at: string
  uploaded_at: string
  upload_status: 'completed'
  sync_status: 'synced'
  notes: string | null
  has_damage: boolean
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Storage Path Format

*For any* photo with valid metadata (userId, jobOrderId, stage, takenAt, photoId), the generated storage path SHALL match the pattern `{userId}/{YYYY}/{MM}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg` where YYYY and MM are extracted from takenAt and timestamp is Unix seconds.

**Validates: Requirements 1.1, 8.1, 8.2, 8.3, 8.4**

### Property 2: Status Transition to Uploading

*For any* photo upload operation, the photo's status in IndexedDB SHALL be set to 'uploading' before the Supabase upload request is initiated.

**Validates: Requirements 1.2**

### Property 3: Metadata Preservation on Success

*For any* successful upload, the Shipment_Photo record in the database SHALL contain all fields from the original OfflinePhoto: job_order_id, checklist_item_id, stage, photo_type, gps_latitude, gps_longitude, gps_accuracy, taken_at, and notes. Additionally, upload_status SHALL be 'completed' and sync_status SHALL be 'synced'.

**Validates: Requirements 1.3, 1.6**

### Property 4: Blob Cleanup on Success

*For any* successful upload where both Storage upload and database insert succeed, the photo blob SHALL be deleted from IndexedDB.

**Validates: Requirements 1.4**

### Property 5: Error State Preservation

*For any* failed upload, the photo's status SHALL be 'failed', the blob SHALL remain in IndexedDB, and the error message SHALL be stored in lastError.

**Validates: Requirements 1.5**

### Property 6: Auto-Sync on Online

*For any* transition from offline to online state, if there are pending photos in the queue, the sync process SHALL start automatically within 1 second.

**Validates: Requirements 2.1**

### Property 7: FIFO Queue Processing

*For any* queue with multiple pending photos, photos SHALL be processed in ascending order of their createdAt timestamp (oldest first).

**Validates: Requirements 2.2, 2.5**

### Property 8: Sequential Upload

*For any* point during sync processing, at most one photo SHALL have status 'uploading' at a time.

**Validates: Requirements 2.3**

### Property 9: Pause on Offline

*For any* sync operation in progress, if the device goes offline, the sync SHALL pause and no new upload requests SHALL be initiated until online again.

**Validates: Requirements 2.4**

### Property 10: Retry Behavior

*For any* failed upload, the retryCount SHALL increment by 1. After 3 failures (retryCount >= 3), no automatic retry SHALL occur. Retry delays SHALL follow exponential backoff: 1s after 1st failure, 2s after 2nd, 4s after 3rd.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 11: Manual Retry Reset

*For any* manual retry action, the photo's retryCount SHALL be reset to 0 and status set to 'pending', and upload SHALL be attempted immediately.

**Validates: Requirements 3.6**

### Property 12: Queue UI Display

*For any* photo in the upload queue, the Queue_UI SHALL display: a thumbnail (from blob), job number (from jobOrderId lookup), stage, photo_type, and current status. Photos SHALL be grouped by status (uploading first, then pending, then failed).

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 13: Header Badge Count

*For any* queue state, the header badge SHALL display the sum of pending and uploading photos. If this count is 0, the badge SHALL be hidden.

**Validates: Requirements 5.1**

### Property 14: Blob Deletion Safety

*For any* upload operation, the IndexedDB blob SHALL NOT be deleted until BOTH the Storage upload succeeds AND the database record is verified to exist.

**Validates: Requirements 7.1, 7.3**

### Property 15: Resume on App Restart

*For any* app restart, photos with status 'pending' or 'uploading' (interrupted) SHALL remain in IndexedDB and be available for sync.

**Validates: Requirements 7.2**

### Property 16: Partial Upload Recovery

*For any* photo where the Storage blob exists but no database record exists, the Upload_Service SHALL create the missing database record using the stored metadata.

**Validates: Requirements 7.4**

## Error Handling

### Upload Errors

```typescript
type UploadErrorType = 
  | 'NETWORK_ERROR'      // Network request failed
  | 'STORAGE_ERROR'      // Supabase Storage error
  | 'DATABASE_ERROR'     // Supabase Database error
  | 'AUTH_ERROR'         // User not authenticated
  | 'QUOTA_EXCEEDED'     // Storage quota exceeded
  | 'INVALID_FILE'       // File too large or invalid format
  | 'UNKNOWN'            // Unknown error

interface UploadError {
  type: UploadErrorType
  message: string
  retryable: boolean
  photoId: string
}

function classifyError(error: unknown): UploadError {
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return { type: 'NETWORK_ERROR', message: error.message, retryable: true }
    }
    if (error.message.includes('storage')) {
      return { type: 'STORAGE_ERROR', message: error.message, retryable: true }
    }
    if (error.message.includes('auth') || error.message.includes('401')) {
      return { type: 'AUTH_ERROR', message: 'Please sign in again', retryable: false }
    }
    if (error.message.includes('quota')) {
      return { type: 'QUOTA_EXCEEDED', message: 'Storage quota exceeded', retryable: false }
    }
  }
  return { type: 'UNKNOWN', message: 'Upload failed', retryable: true }
}
```

### Retry Logic with Exponential Backoff

```typescript
const RETRY_DELAYS = [1000, 2000, 4000] // 1s, 2s, 4s

async function uploadWithRetry(
  photo: OfflinePhoto,
  userId: string,
  maxRetries: number = 3
): Promise<UploadResult> {
  let lastError: UploadError | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await uploadPhoto(photo, userId)
      if (result.success) return result
      lastError = classifyError(new Error(result.error))
    } catch (error) {
      lastError = classifyError(error)
    }
    
    if (!lastError?.retryable) break
    
    // Wait before retry
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
    }
  }
  
  return {
    success: false,
    photoId: photo.id,
    error: lastError?.message || 'Upload failed after retries'
  }
}
```

### Offline Detection and Pause

```typescript
// In useSyncManager hook
useEffect(() => {
  const handleOffline = () => {
    if (state === 'processing') {
      setState('paused')
      // Current upload will complete or fail, but no new ones start
    }
  }
  
  const handleOnline = () => {
    if (state === 'paused' && autoSync) {
      startSync()
    }
  }
  
  window.addEventListener('offline', handleOffline)
  window.addEventListener('online', handleOnline)
  
  return () => {
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('online', handleOnline)
  }
}, [state, autoSync])
```

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples and edge cases:

1. **Storage path generation**
   - Correct path format with all components
   - Year/month extraction from various dates
   - Unix timestamp conversion

2. **Upload service**
   - Successful upload flow
   - Error classification
   - Retry count increment

3. **Queue hooks**
   - Initial state loading
   - Status grouping
   - Statistics calculation

4. **UI components**
   - Badge shows correct count
   - Progress bar updates
   - Empty state renders

### Property-Based Tests

Property tests verify universal properties across generated inputs. Use `fast-check` for TypeScript property-based testing.

Configuration:
- Minimum 100 iterations per property test
- Tag format: `Feature: v0.5-photo-upload-sync, Property {N}: {description}`

Property tests to implement:

1. **Property 1: Storage path format**
   - Generate random photo metadata
   - Verify path matches expected pattern

2. **Property 3: Metadata preservation**
   - Generate random OfflinePhoto data
   - Verify all fields transfer to ShipmentPhoto

3. **Property 7: FIFO queue processing**
   - Generate random queues with various createdAt times
   - Verify processing order is ascending by createdAt

4. **Property 8: Sequential upload**
   - Generate concurrent upload scenarios
   - Verify only one 'uploading' status at a time

5. **Property 10: Retry behavior**
   - Generate failure sequences
   - Verify retry count and backoff timing

6. **Property 12: Queue UI display**
   - Generate random queue states
   - Verify all required fields are present and grouped correctly

7. **Property 13: Header badge count**
   - Generate various queue states
   - Verify badge count equals pending + uploading

8. **Property 14: Blob deletion safety**
   - Generate partial success scenarios
   - Verify blob not deleted until fully confirmed

### Integration Tests

1. **Full upload flow** - Capture → IndexedDB → Upload → Verify in Supabase
2. **Offline/online cycle** - Capture offline → Go online → Auto-sync
3. **Retry flow** - Fail upload → Auto-retry → Success
4. **Queue management** - View queue → Retry failed → Delete photo

## Implementation Notes

### Supabase Storage Upload

```typescript
async function uploadToStorage(
  blob: Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<{ path: string; error: string | null }> {
  const supabase = createClient()
  
  const { data, error } = await supabase.storage
    .from('shipment-photos')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false
    })
  
  if (error) {
    return { path: '', error: error.message }
  }
  
  return { path: data.path, error: null }
}
```

### Database Insert

```typescript
async function insertShipmentPhoto(
  photo: OfflinePhoto,
  userId: string,
  storagePath: string
): Promise<{ id: string; error: string | null }> {
  const supabase = createClient()
  
  const record: ShipmentPhotoInsert = {
    id: photo.id,
    job_order_id: photo.jobOrderId,
    checklist_item_id: photo.checklistItemId,
    uploaded_by: userId,
    photo_type: photo.photoType,
    stage: photo.stage,
    file_name: `${photo.id}.jpg`,
    file_size: photo.blob.size,
    mime_type: 'image/jpeg',
    storage_bucket: 'shipment-photos',
    storage_path: storagePath,
    gps_latitude: photo.metadata.gpsLatitude,
    gps_longitude: photo.metadata.gpsLongitude,
    gps_accuracy: photo.metadata.gpsAccuracy,
    taken_at: photo.metadata.takenAt,
    uploaded_at: new Date().toISOString(),
    upload_status: 'completed',
    sync_status: 'synced',
    notes: photo.notes,
    has_damage: photo.photoType === 'damage'
  }
  
  const { data, error } = await supabase
    .from('shipment_photos')
    .insert(record)
    .select('id')
    .single()
  
  if (error) {
    return { id: '', error: error.message }
  }
  
  return { id: data.id, error: null }
}
```

### Sync Provider Context

```typescript
// contexts/sync-context.tsx
interface SyncContextValue {
  // State
  isSyncing: boolean
  pendingCount: number
  failedCount: number
  uploadProgress: Map<string, number>
  isOnline: boolean
  
  // Actions
  startSync: () => Promise<void>
  pauseSync: () => void
  retryPhoto: (photoId: string) => Promise<void>
  retryAllFailed: () => Promise<void>
  deletePhoto: (photoId: string) => Promise<void>
  refreshQueue: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  // Implementation using useSyncManager and useUploadQueue hooks
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within SyncProvider')
  }
  return context
}
```

### Performance Considerations

- Upload one photo at a time to avoid overwhelming mobile connections
- Use Web Workers for blob processing if needed (future optimization)
- Debounce queue refresh to avoid excessive IndexedDB reads
- Cache job numbers to avoid repeated database lookups

### Accessibility

- Queue items have proper ARIA labels
- Progress indicators announce updates to screen readers
- Error messages are announced
- Retry/delete buttons have clear labels
