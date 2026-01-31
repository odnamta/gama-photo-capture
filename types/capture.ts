/**
 * Capture Session Types for GAMA Photo Capture
 * 
 * These types define the data structures for the guided capture flow,
 * including session state, captured photo data, and preview state.
 * 
 * @see .kiro/specs/v0.3-guided-capture/design.md for architecture details
 */

import type { JobStage, PhotoChecklistItem } from './job'

// ============================================
// VIEW STATE
// ============================================

/**
 * View states for the capture session
 * - capture: Camera/capture view, ready to take photo
 * - preview: Reviewing captured photo before confirm/retake
 * - complete: All items processed, showing summary
 */
export type CaptureViewState = 'capture' | 'preview' | 'complete'

// ============================================
// METADATA TYPES
// ============================================

/**
 * Metadata captured with each photo
 * GPS data is optional (may be unavailable)
 */
export interface CaptureMetadata {
  /** When the photo was taken */
  takenAt: Date
  /** GPS latitude (null if unavailable) */
  gpsLatitude: number | null
  /** GPS longitude (null if unavailable) */
  gpsLongitude: number | null
  /** GPS accuracy in meters (null if unavailable) */
  gpsAccuracy: number | null
}

// ============================================
// PHOTO DATA TYPES
// ============================================

/**
 * Data for a photo currently in preview state
 * Contains the blob and metadata but not yet associated with a checklist item
 */
export interface PreviewPhotoData {
  /** Object URL for displaying the photo */
  blobUrl: string
  /** Actual image blob data */
  blob: Blob
  /** Capture metadata (timestamp, GPS) */
  metadata: CaptureMetadata
}

/**
 * Data for a confirmed/captured photo
 * Associated with a specific checklist item
 */
export interface CapturedPhotoData {
  /** ID of the checklist item this photo fulfills */
  checklistItemId: string
  /** Object URL for displaying the photo */
  blobUrl: string
  /** Actual image blob data */
  blob: Blob
  /** Capture metadata (timestamp, GPS) */
  metadata: CaptureMetadata
  /** Optional notes added by user */
  notes: string | null
}

// ============================================
// SESSION STATE
// ============================================

/**
 * Complete state for a capture session
 * Manages the guided flow through checklist items
 */
export interface CaptureSessionState {
  // Session identity
  /** Job order ID this session is for */
  jobId: string
  /** Stage being captured (job_start, in_transit, job_end) */
  stage: JobStage
  
  // Checklist data
  /** Ordered list of checklist items for this stage */
  checklist: PhotoChecklistItem[]
  
  // Progress tracking
  /** Current index in the checklist (0-indexed) */
  currentIndex: number
  /** Map of captured photos by checklist item ID */
  captures: Map<string, CapturedPhotoData>
  /** Set of skipped checklist item IDs */
  skippedItems: Set<string>
  
  // UI state
  /** Current view state */
  viewState: CaptureViewState
  /** Photo data when in preview state */
  previewPhoto: PreviewPhotoData | null
}

// ============================================
// SESSION ACTIONS
// ============================================

/**
 * Actions that can be performed on a capture session
 */
export type CaptureSessionAction =
  | { type: 'CAPTURE'; payload: PreviewPhotoData }
  | { type: 'CONFIRM'; payload: { notes: string | null } }
  | { type: 'RETAKE' }
  | { type: 'SKIP' }
  | { type: 'RESET' }

// ============================================
// HOOK RETURN TYPE
// ============================================

/**
 * Return type for the useCaptureSession hook
 */
export interface UseCaptureSessionReturn {
  /** Current session state */
  state: CaptureSessionState
  
  /** Current checklist item (null if complete) */
  currentItem: PhotoChecklistItem | null
  
  /** Whether the current item can be skipped */
  canSkip: boolean
  
  /** Whether all required items are captured */
  isComplete: boolean
  
  /** Progress stats */
  progress: {
    current: number
    total: number
    captured: number
    skipped: number
  }
  
  // Actions
  /** Capture a photo (transitions to preview) */
  capture: (photo: PreviewPhotoData) => void
  /** Confirm the previewed photo (saves and advances) */
  confirm: (notes?: string | null) => void
  /** Retake the photo (returns to capture without saving) */
  retake: () => void
  /** Skip the current item (only for optional items) */
  skip: () => void
  /** Reset the session */
  reset: () => void
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Options for initializing a capture session
 */
export interface CaptureSessionOptions {
  /** Job order ID */
  jobId: string
  /** Stage to capture */
  stage: JobStage
  /** Checklist items for the stage */
  checklist: PhotoChecklistItem[]
  /** IDs of checklist items that already have photos */
  existingPhotoIds?: string[]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create initial capture session state
 */
export function createInitialState(options: CaptureSessionOptions): CaptureSessionState {
  const { jobId, stage, checklist, existingPhotoIds = [] } = options
  
  // Find the first item without an existing photo
  const existingSet = new Set(existingPhotoIds)
  let startIndex = checklist.findIndex(item => !existingSet.has(item.id))
  
  // If all items have photos, start at 0 (allow retakes)
  if (startIndex === -1) {
    startIndex = 0
  }
  
  return {
    jobId,
    stage,
    checklist,
    currentIndex: startIndex,
    captures: new Map(),
    skippedItems: new Set(),
    viewState: 'capture',
    previewPhoto: null,
  }
}

/**
 * Create empty capture metadata with current timestamp
 */
export function createEmptyMetadata(): CaptureMetadata {
  return {
    takenAt: new Date(),
    gpsLatitude: null,
    gpsLongitude: null,
    gpsAccuracy: null,
  }
}
