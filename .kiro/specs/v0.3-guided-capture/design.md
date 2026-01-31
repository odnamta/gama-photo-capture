# Design Document: v0.3 Guided Capture Flow

## Overview

The Guided Capture Flow is the core photo documentation experience for GAMA Photo Capture. It walks field staff through a step-by-step checklist of required and optional photos for each job stage (job_start, in_transit, job_end). The flow ensures compliance by enforcing required photos while allowing flexibility for optional documentation.

This design builds on v0.2 Job Selection, which provides the job detail page with stage cards. When users tap "Start Capture" on a stage card, they enter this guided flow.

## Architecture

### High-Level Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Job Detail    │────▶│  Guided Capture  │────▶│   Completion    │
│   (Stage Card)  │     │     Session      │     │    Summary      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Photo Preview   │
                        │    (Confirm)     │
                        └──────────────────┘
```

### State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  INIT   │───▶│ CAPTURE │───▶│ PREVIEW │───▶│  NEXT   │─────┘
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │              │              │
                    │              │              ▼
                    │              │         ┌─────────┐
                    │              └────────▶│ CAPTURE │ (retake)
                    │                        └─────────┘
                    │
                    ▼
               ┌─────────┐
               │  SKIP   │ (optional items only)
               └─────────┘
                    │
                    ▼
               ┌─────────┐
               │  NEXT   │
               └─────────┘
                    │
                    ▼
               ┌──────────┐
               │ COMPLETE │ (when currentIndex >= checklist.length)
               └──────────┘
```

### Route Structure

```
/camera?job={jobId}&stage={stage}  → GuidedCapturePage
```

The capture flow uses query parameters rather than nested routes to maintain simplicity and allow easy deep linking.

## Components and Interfaces

### Component Hierarchy

```
GuidedCapturePage (app/(main)/camera/page.tsx)
├── GuidedCaptureSession (organisms)
│   ├── StepProgressBar (atoms)
│   ├── ChecklistStepView (molecules)
│   │   ├── StepInstructions (atoms)
│   │   ├── CameraPlaceholder (atoms) [v0.3]
│   │   └── CaptureButton (atoms)
│   ├── PhotoPreviewSheet (molecules)
│   │   ├── PhotoDisplay (atoms)
│   │   ├── MetadataDisplay (atoms)
│   │   ├── NotesInput (atoms)
│   │   └── ActionButtons (atoms)
│   └── CaptureCompleteSummary (molecules)
│       ├── PhotoThumbnailGrid (atoms)
│       └── DoneButton (atoms)
└── ExitConfirmDialog (molecules)
```

### Component Interfaces

```typescript
// atoms/step-progress-bar.tsx
interface StepProgressBarProps {
  currentStep: number      // 1-indexed for display
  totalSteps: number
  className?: string
}

// atoms/step-instructions.tsx
interface StepInstructionsProps {
  title: string
  description: string | null
  tips: string | null
  className?: string
}

// atoms/camera-placeholder.tsx
interface CameraPlaceholderProps {
  onCapture: () => void
  className?: string
}

// atoms/capture-button.tsx
interface CaptureButtonProps {
  onCapture: () => void
  disabled?: boolean
  isCapturing?: boolean
  className?: string
}

// molecules/checklist-step-view.tsx
interface ChecklistStepViewProps {
  item: PhotoChecklistItem
  stepNumber: number
  totalSteps: number
  locale: 'en' | 'id'
  onCapture: () => void
  onSkip?: () => void  // Only provided for optional items
  className?: string
}

// molecules/photo-preview-sheet.tsx
interface PhotoPreviewSheetProps {
  photoUrl: string
  metadata: CaptureMetadata
  onConfirm: (notes?: string) => void
  onRetake: () => void
  isOpen: boolean
  className?: string
}

interface CaptureMetadata {
  takenAt: Date
  gpsLatitude: number | null
  gpsLongitude: number | null
  gpsAccuracy: number | null
}

// molecules/capture-complete-summary.tsx
interface CaptureCompleteSummaryProps {
  captures: CapturedPhoto[]
  skippedItems: PhotoChecklistItem[]
  onDone: () => void
  className?: string
}

interface CapturedPhoto {
  checklistItemId: string
  title: string
  thumbnailUrl: string
  status: 'captured' | 'skipped'
}

// organisms/guided-capture-session.tsx
interface GuidedCaptureSessionProps {
  jobId: string
  stage: JobStage
  checklist: PhotoChecklistItem[]
  existingPhotos: ExistingPhoto[]
  locale: 'en' | 'id'
  onComplete: () => void
  onExit: () => void
}

interface ExistingPhoto {
  checklistItemId: string
  thumbnailUrl: string
}
```

## Data Models

### Session State

```typescript
interface CaptureSessionState {
  // Session identity
  jobId: string
  stage: JobStage
  
  // Checklist data
  checklist: PhotoChecklistItem[]
  
  // Progress tracking
  currentIndex: number
  captures: Map<string, CapturedPhotoData>  // checklistItemId → photo data
  skippedItems: Set<string>                  // checklistItemId set
  
  // UI state
  viewState: 'capture' | 'preview' | 'complete'
  previewPhoto: PreviewPhotoData | null
}

interface CapturedPhotoData {
  checklistItemId: string
  blobUrl: string           // Object URL for display
  blob: Blob                // Actual image data
  metadata: CaptureMetadata
  notes: string | null
}

interface PreviewPhotoData {
  blobUrl: string
  blob: Blob
  metadata: CaptureMetadata
}
```

### Persistence Model

Photos are saved to IndexedDB immediately on confirm for offline support:

```typescript
interface OfflinePhoto {
  id: string                    // UUID
  jobOrderId: string
  checklistItemId: string
  stage: JobStage
  photoType: string
  blob: Blob
  metadata: {
    takenAt: string
    gpsLatitude: number | null
    gpsLongitude: number | null
    gpsAccuracy: number | null
  }
  notes: string | null
  status: 'pending' | 'uploading' | 'failed'
  createdAt: string
}
```

### Database Queries

```typescript
// Load checklist for stage
async function loadChecklist(stage: JobStage): Promise<PhotoChecklistItem[]> {
  const { data } = await supabase
    .from('photo_checklists')
    .select('*')
    .eq('stage', stage)
    .eq('is_active', true)
    .order('sequence')
  return data || []
}

// Load existing photos for job+stage
async function loadExistingPhotos(
  jobId: string, 
  stage: JobStage
): Promise<ExistingPhoto[]> {
  const { data } = await supabase
    .from('shipment_photos')
    .select('checklist_item_id, thumbnail_path, storage_path')
    .eq('job_order_id', jobId)
    .eq('stage', stage)
    .eq('is_deleted', false)
  
  return (data || []).map(p => ({
    checklistItemId: p.checklist_item_id,
    thumbnailUrl: p.thumbnail_path || p.storage_path
  }))
}

// Check stage completion
async function isStageComplete(
  jobId: string, 
  stage: JobStage
): Promise<boolean> {
  const checklist = await loadChecklist(stage)
  const requiredIds = checklist
    .filter(c => c.is_required)
    .map(c => c.id)
  
  const { data: photos } = await supabase
    .from('shipment_photos')
    .select('checklist_item_id')
    .eq('job_order_id', jobId)
    .eq('stage', stage)
    .eq('is_deleted', false)
    .in('checklist_item_id', requiredIds)
  
  const capturedIds = new Set(photos?.map(p => p.checklist_item_id))
  return requiredIds.every(id => capturedIds.has(id))
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Checklist Loading Returns Correct Items

*For any* job stage, loading the checklist should return only items where `stage` matches and `is_active` is true, ordered by `sequence` ascending.

**Validates: Requirements 3.1.2**

### Property 2: Step Indicator Accuracy

*For any* checklist with N items and current index I (0-indexed), the step indicator should display "Step {I+1} of {N}".

**Validates: Requirements 3.1.4**

### Property 3: Locale-Aware Content Display

*For any* checklist item and locale setting:
- If locale is 'id' and `title_id` is not null, display `title_id`; otherwise display `title`
- If locale is 'id' and `description_id` is not null, display `description_id`; otherwise display `description`
- Tips are displayed if not null (no locale variant)

**Validates: Requirements 3.2.1, 3.2.2, 3.2.3**

### Property 4: Capture Triggers Preview State

*For any* capture action in 'capture' view state, the system should transition to 'preview' view state with the captured photo data.

**Validates: Requirements 3.3.3**

### Property 5: GPS Metadata Attachment

*For any* photo capture where GPS is available, the captured photo metadata should include `gpsLatitude`, `gpsLongitude`, and `gpsAccuracy` values.

**Validates: Requirements 3.3.4**

### Property 6: Preview Displays Photo Metadata

*For any* photo in preview state with GPS data, the preview should display formatted coordinates and timestamp from the metadata.

**Validates: Requirements 3.4.2**

### Property 7: Retake Returns to Capture State

*For any* preview state, clicking retake should transition back to 'capture' view state without saving the photo or advancing the index.

**Validates: Requirements 3.4.4**

### Property 8: Confirm Saves and Advances

*For any* preview state with valid photo data, clicking confirm should:
1. Add the photo to the captures map
2. Increment currentIndex by 1
3. Transition to 'capture' state (or 'complete' if last item)

**Validates: Requirements 3.4.5**

### Property 9: Skip Button Visibility

*For any* checklist item, the skip button should be visible if and only if `is_required` is false.

**Validates: Requirements 3.5.1, 3.5.2**

### Property 10: Skip Advances to Next Item

*For any* optional checklist item, clicking skip should:
1. Add the item ID to skippedItems set
2. Increment currentIndex by 1
3. Not add any photo to captures map

**Validates: Requirements 3.5.3**

### Property 11: Completion Summary Content

*For any* completed capture session:
- All captured photos should appear in the summary with 'captured' status
- All skipped optional items should appear with 'skipped' status
- Required items that were captured should appear with 'captured' status

**Validates: Requirements 3.6.1, 3.6.2, 3.6.3**

### Property 12: Stage Completion Updates Progress

*For any* capture session where all required checklist items have been captured, the job's stage progress should reflect `isComplete: true`.

**Validates: Requirements 3.6.5**

### Property 13: Session Resume Position

*For any* capture session with existing photos:
- The initial currentIndex should be the index of the first checklist item without a corresponding photo
- If all items have photos, start at index 0 (allow retakes)

**Validates: Requirements 3.7.1, 3.7.2, 3.7.3**

## Error Handling

### GPS Errors

```typescript
// GPS is optional - capture anyway if unavailable
async function captureWithGPS(): Promise<CaptureMetadata> {
  const metadata: CaptureMetadata = {
    takenAt: new Date(),
    gpsLatitude: null,
    gpsLongitude: null,
    gpsAccuracy: null
  }
  
  try {
    const position = await getCurrentPosition({ timeout: 5000 })
    metadata.gpsLatitude = position.coords.latitude
    metadata.gpsLongitude = position.coords.longitude
    metadata.gpsAccuracy = position.coords.accuracy
  } catch (error) {
    // Log but don't block capture
    console.warn('GPS unavailable:', error)
  }
  
  return metadata
}
```

### Camera Errors (v0.3 Placeholder)

In v0.3, the camera is a placeholder. Errors will be handled in v0.4 when real camera integration is added.

### Offline Handling

```typescript
// Save to IndexedDB first, then attempt upload
async function savePhoto(photo: CapturedPhotoData, jobId: string, stage: JobStage) {
  const offlinePhoto: OfflinePhoto = {
    id: crypto.randomUUID(),
    jobOrderId: jobId,
    checklistItemId: photo.checklistItemId,
    stage,
    photoType: getPhotoType(photo.checklistItemId),
    blob: photo.blob,
    metadata: {
      takenAt: photo.metadata.takenAt.toISOString(),
      gpsLatitude: photo.metadata.gpsLatitude,
      gpsLongitude: photo.metadata.gpsLongitude,
      gpsAccuracy: photo.metadata.gpsAccuracy
    },
    notes: photo.notes,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  
  // Save to IndexedDB
  await db.photos.add(offlinePhoto)
  
  // Attempt background upload (non-blocking)
  uploadInBackground(offlinePhoto.id)
}
```

### Exit Confirmation

```typescript
// Warn user if they have unsaved captures
function handleExit(captures: Map<string, CapturedPhotoData>) {
  if (captures.size > 0) {
    // Show confirmation dialog
    return showExitConfirmDialog()
  }
  // Navigate back immediately
  router.push(`/jobs/${jobId}`)
}
```

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples and edge cases:

1. **Checklist loading** - Test with empty stage, single item, multiple items
2. **Locale selection** - Test fallback when `title_id` is null
3. **Step indicator** - Test boundary cases (step 1, last step)
4. **State transitions** - Test each transition in the state machine
5. **Skip button visibility** - Test required vs optional items

### Property-Based Tests

Property tests verify universal properties across generated inputs. Use `fast-check` for TypeScript property-based testing.

Configuration:
- Minimum 100 iterations per property test
- Tag format: `Feature: v0.3-guided-capture, Property {N}: {description}`

Property tests to implement:
1. **Property 1**: Generate random stages, verify checklist filtering
2. **Property 2**: Generate random checklist lengths and indices, verify step indicator
3. **Property 3**: Generate random checklist items and locales, verify content selection
4. **Property 8**: Generate random capture sequences, verify state transitions
5. **Property 9**: Generate random checklist items, verify skip button visibility
6. **Property 11**: Generate random capture sessions, verify summary content
7. **Property 13**: Generate random existing photo sets, verify resume position

### Integration Tests

1. **Full capture flow** - Start to completion with all required photos
2. **Skip flow** - Capture with skipped optional items
3. **Resume flow** - Exit and resume incomplete session
4. **Offline flow** - Capture while offline, verify IndexedDB storage

## Implementation Notes

### v0.3 Scope Limitations

- Camera is a **placeholder** - actual camera integration in v0.4
- Photo capture simulated with a test image or file picker
- No actual upload to Supabase Storage (IndexedDB only)
- GPS capture is real (uses browser Geolocation API)

### Performance Considerations

- Checklist loaded once on session start, cached in state
- Photos stored as Blob URLs for display, actual Blobs in IndexedDB
- Thumbnails generated client-side before storage
- Transitions between steps should be < 500ms

### Accessibility

- Step indicator announced to screen readers
- Capture button has clear focus state
- Skip button clearly labeled for optional items
- Exit confirmation is keyboard accessible
