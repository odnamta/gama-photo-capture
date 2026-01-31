/**
 * Photo Types for GAMA Photo Capture
 * 
 * These types define the data structures for photos, upload queue,
 * and related entities used throughout the application.
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Types of photos that can be captured
 */
export type PhotoType = 'before' | 'after' | 'damage' | 'document' | 'survey' | 'other'

/**
 * Upload status for photos
 */
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed'

/**
 * Sync status for offline functionality
 */
export type SyncStatus = 'local' | 'syncing' | 'synced'

// ============================================
// DATABASE TYPES
// ============================================

/**
 * Shipment photo record from the database
 */
export interface ShipmentPhoto {
  id: string
  job_order_id: string | null
  uploaded_by: string | null
  photo_type: PhotoType
  file_name: string
  file_size: number
  mime_type: string
  storage_bucket: string
  storage_path: string
  thumbnail_path: string | null
  gps_latitude: number | null
  gps_longitude: number | null
  gps_accuracy: number | null
  device_id: string | null
  device_model: string | null
  taken_at: string
  uploaded_at: string | null
  created_at: string
  upload_status: UploadStatus
  sync_status: SyncStatus
  notes: string | null
  is_deleted: boolean
  deleted_at: string | null
}

/**
 * Photo upload queue record from the database
 */
export interface PhotoUploadQueue {
  id: string
  photo_id: string
  local_blob_key: string
  retry_count: number
  last_attempt_at: string | null
  error_message: string | null
  priority: number
  created_at: string
}

/**
 * Photo tag record from the database
 */
export interface PhotoTag {
  id: string
  photo_id: string
  tag: string
  created_at: string
}

// ============================================
// APPLICATION TYPES
// ============================================

/**
 * Photo data for display in the UI
 */
export interface Photo {
  id: string
  jobOrderId: string | null
  photoType: PhotoType
  fileName: string
  fileSize: number
  storagePath: string
  thumbnailPath?: string
  gpsLatitude?: number
  gpsLongitude?: number
  gpsAccuracy?: number
  takenAt: string
  uploadedAt?: string
  uploadStatus: UploadStatus
  syncStatus: SyncStatus
  notes?: string
}

/**
 * Metadata captured when taking a photo
 */
export interface PhotoMetadata {
  takenAt: string
  gpsLatitude?: number
  gpsLongitude?: number
  gpsAccuracy?: number
  deviceId?: string
  deviceModel?: string
}

/**
 * Queue item for display in the UI
 */
export interface QueueItem {
  id: string
  photoType: PhotoType
  jobOrderId: string | null
  status: 'pending' | 'uploading' | 'failed'
  retryCount: number
  errorMessage?: string
  createdAt: string
}

/**
 * Job summary for photo capture context
 */
export interface JobSummary {
  id: string
  jobNumber: string
  customerName: string
  projectName: string
  origin?: string
  destination?: string
  cargoDescription?: string
  status: string
  photoCount: {
    before: number
    after: number
    damage: number
    document: number
    survey: number
    other: number
    total: number
  }
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input for creating a new photo record
 */
export interface CreatePhotoInput {
  jobOrderId: string | null
  photoType: PhotoType
  fileName: string
  fileSize: number
  mimeType?: string
  takenAt: string
  gpsLatitude?: number
  gpsLongitude?: number
  gpsAccuracy?: number
  deviceId?: string
  deviceModel?: string
  notes?: string
}

/**
 * Input for updating a photo record
 */
export interface UpdatePhotoInput {
  thumbnailPath?: string
  uploadStatus?: UploadStatus
  uploadedAt?: string
  notes?: string
}

// ============================================
// OFFLINE TYPES
// ============================================

/**
 * Offline photo stored in IndexedDB
 */
export interface OfflinePhoto {
  id: string
  blob: Blob
  metadata: {
    jobOrderId: string | null
    photoType: PhotoType
    fileName: string
    fileSize: number
    mimeType: string
    takenAt: string
    gpsLatitude?: number
    gpsLongitude?: number
    gpsAccuracy?: number
    deviceId?: string
    notes?: string
  }
  status: 'pending' | 'uploading' | 'failed'
  retryCount: number
  lastAttempt?: string
  errorMessage?: string
  createdAt: string
}

/**
 * Cached job for offline access
 */
export interface CachedJob {
  id: string
  data: JobSummary
  cachedAt: string
}

// ============================================
// CONSTANTS
// ============================================

/**
 * All valid photo types
 */
export const PHOTO_TYPES: PhotoType[] = ['before', 'after', 'damage', 'document', 'survey', 'other']

/**
 * All valid upload statuses
 */
export const UPLOAD_STATUSES: UploadStatus[] = ['pending', 'uploading', 'completed', 'failed']

/**
 * All valid sync statuses
 */
export const SYNC_STATUSES: SyncStatus[] = ['local', 'syncing', 'synced']

/**
 * Photo type labels for display
 */
export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: 'Before',
  after: 'After',
  damage: 'Damage',
  document: 'Document',
  survey: 'Survey',
  other: 'Other',
}

/**
 * Upload status labels for display
 */
export const UPLOAD_STATUS_LABELS: Record<UploadStatus, string> = {
  pending: 'Pending',
  uploading: 'Uploading',
  completed: 'Completed',
  failed: 'Failed',
}
