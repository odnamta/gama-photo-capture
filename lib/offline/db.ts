/**
 * IndexedDB Database for GAMA Photo Capture
 * 
 * Uses Dexie.js as a wrapper around IndexedDB for offline photo storage.
 * Photos are saved here immediately on capture and synced to Supabase
 * when online (full sync implementation in v0.5).
 * 
 * @see .kiro/specs/v0.3-guided-capture/design.md - Persistence Model section
 * **Validates: Requirements 3.4.5 (offline support)**
 */

import Dexie, { type Table } from 'dexie'
import type { JobStage } from '@/types/job'

// ============================================
// OFFLINE PHOTO INTERFACE
// ============================================

/**
 * Photo stored in IndexedDB for offline support
 * 
 * Photos are saved here immediately on confirm, then uploaded
 * to Supabase Storage when online. The status field tracks
 * the upload state.
 */
export interface OfflinePhoto {
  /** Unique identifier (UUID) */
  id: string
  /** Job order ID this photo belongs to */
  jobOrderId: string
  /** Checklist item ID this photo fulfills */
  checklistItemId: string
  /** Job stage (job_start, in_transit, job_end) */
  stage: JobStage
  /** Photo type from checklist (cargo_before, cargo_after, document, damage, etc.) */
  photoType: string
  /** Actual image blob data */
  blob: Blob
  /** Capture metadata */
  metadata: {
    /** ISO timestamp when photo was taken */
    takenAt: string
    /** GPS latitude (null if unavailable) */
    gpsLatitude: number | null
    /** GPS longitude (null if unavailable) */
    gpsLongitude: number | null
    /** GPS accuracy in meters (null if unavailable) */
    gpsAccuracy: number | null
  }
  /** Optional notes added by user */
  notes: string | null
  /** Upload status: pending (not uploaded), uploading (in progress), failed (error occurred) */
  status: 'pending' | 'uploading' | 'failed'
  /** ISO timestamp when record was created */
  createdAt: string
  
  // ============================================
  // RETRY TRACKING FIELDS (v0.5)
  // ============================================
  
  /** Number of upload retry attempts (0 = never tried, increments on each failure) */
  retryCount?: number
  /** Last error message from failed upload attempt */
  lastError?: string | null
  /** ISO timestamp of last upload attempt */
  lastAttemptAt?: string | null
}

// ============================================
// DATABASE CLASS
// ============================================

/**
 * Dexie database class for GAMA Photo Capture
 * 
 * Provides typed access to IndexedDB tables with proper indexing
 * for efficient queries by status, job, and checklist item.
 */
export class PhotoCaptureDB extends Dexie {
  /** Photos table for offline storage */
  photos!: Table<OfflinePhoto, string>

  constructor() {
    super('GamaPhotoCapture')
    
    // Define database schema
    // Version 1: Initial schema with photos table
    this.version(1).stores({
      // Primary key: id
      // Indexes: status, jobOrderId, checklistItemId, createdAt
      // Compound index: [jobOrderId+stage] for efficient stage queries
      photos: 'id, status, jobOrderId, checklistItemId, createdAt, [jobOrderId+stage]'
    })
    
    // Version 2: Add retry tracking fields (v0.5)
    // No schema change needed since new fields are optional and not indexed
    // Dexie handles optional fields automatically - existing records will have undefined values
    this.version(2).stores({
      // Same indexes as v1 - new fields (retryCount, lastError, lastAttemptAt) are not indexed
      photos: 'id, status, jobOrderId, checklistItemId, createdAt, [jobOrderId+stage]'
    }).upgrade(tx => {
      // Migration: Initialize retry fields for existing photos
      // This ensures existing photos have consistent default values
      return tx.table('photos').toCollection().modify(photo => {
        if (photo.retryCount === undefined) {
          photo.retryCount = 0
        }
        if (photo.lastError === undefined) {
          photo.lastError = null
        }
        if (photo.lastAttemptAt === undefined) {
          photo.lastAttemptAt = null
        }
      })
    })
  }
}

// ============================================
// DATABASE INSTANCE
// ============================================

/**
 * Singleton database instance
 * 
 * Use this instance throughout the app for all IndexedDB operations.
 * The database is created lazily when first accessed.
 */
export const db = new PhotoCaptureDB()

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a UUID for new photos
 * Uses crypto.randomUUID() which is available in modern browsers
 */
export function generatePhotoId(): string {
  return crypto.randomUUID()
}

/**
 * Create an OfflinePhoto record from capture data
 * 
 * @param params - Photo creation parameters
 * @returns OfflinePhoto ready to be saved to IndexedDB
 */
export function createOfflinePhoto(params: {
  jobOrderId: string
  checklistItemId: string
  stage: JobStage
  photoType: string
  blob: Blob
  metadata: {
    takenAt: Date
    gpsLatitude: number | null
    gpsLongitude: number | null
    gpsAccuracy: number | null
  }
  notes: string | null
}): OfflinePhoto {
  return {
    id: generatePhotoId(),
    jobOrderId: params.jobOrderId,
    checklistItemId: params.checklistItemId,
    stage: params.stage,
    photoType: params.photoType,
    blob: params.blob,
    metadata: {
      takenAt: params.metadata.takenAt.toISOString(),
      gpsLatitude: params.metadata.gpsLatitude,
      gpsLongitude: params.metadata.gpsLongitude,
      gpsAccuracy: params.metadata.gpsAccuracy,
    },
    notes: params.notes,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Get all pending photos (not yet uploaded)
 * 
 * @returns Array of photos with status 'pending'
 */
export async function getPendingPhotos(): Promise<OfflinePhoto[]> {
  return db.photos.where('status').equals('pending').toArray()
}

/**
 * Get all failed photos (upload failed)
 * 
 * @returns Array of photos with status 'failed'
 */
export async function getFailedPhotos(): Promise<OfflinePhoto[]> {
  return db.photos.where('status').equals('failed').toArray()
}

/**
 * Get photos for a specific job and stage
 * 
 * @param jobOrderId - Job order ID
 * @param stage - Job stage
 * @returns Array of photos for the job+stage combination
 */
export async function getPhotosForJobStage(
  jobOrderId: string,
  stage: JobStage
): Promise<OfflinePhoto[]> {
  return db.photos
    .where('[jobOrderId+stage]')
    .equals([jobOrderId, stage])
    .toArray()
}

/**
 * Get photos for a specific job
 * 
 * @param jobOrderId - Job order ID
 * @returns Array of all photos for the job
 */
export async function getPhotosForJob(jobOrderId: string): Promise<OfflinePhoto[]> {
  return db.photos.where('jobOrderId').equals(jobOrderId).toArray()
}

/**
 * Update photo status
 * 
 * @param id - Photo ID
 * @param status - New status
 */
export async function updatePhotoStatus(
  id: string,
  status: 'pending' | 'uploading' | 'failed'
): Promise<void> {
  await db.photos.update(id, { status })
}

/**
 * Delete a photo from IndexedDB
 * 
 * @param id - Photo ID to delete
 */
export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id)
}

/**
 * Get count of photos by status
 * 
 * @returns Object with counts for each status
 */
export async function getPhotoCountsByStatus(): Promise<{
  pending: number
  uploading: number
  failed: number
  total: number
}> {
  const [pending, uploading, failed] = await Promise.all([
    db.photos.where('status').equals('pending').count(),
    db.photos.where('status').equals('uploading').count(),
    db.photos.where('status').equals('failed').count(),
  ])
  
  return {
    pending,
    uploading,
    failed,
    total: pending + uploading + failed,
  }
}

/**
 * Clear all photos from the database
 * Use with caution - primarily for testing or user-initiated clear
 */
export async function clearAllPhotos(): Promise<void> {
  await db.photos.clear()
}

// ============================================
// RETRY MANAGEMENT FUNCTIONS (v0.5)
// ============================================

/**
 * Get photos ready for upload (pending or failed with retryCount < maxRetries)
 * 
 * Returns photos in FIFO order (oldest first based on createdAt).
 * This function is used by the sync manager to determine which photos
 * should be uploaded next.
 * 
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Array of photos ready for upload, sorted by createdAt ascending
 * 
 * **Validates: Requirements 3.1, 3.6**
 */
export async function getUploadablePhotos(maxRetries: number = 3): Promise<OfflinePhoto[]> {
  // Get all photos with status 'pending' or 'failed'
  const photos = await db.photos
    .where('status')
    .anyOf(['pending', 'failed'])
    .toArray()
  
  // Filter out photos that have exceeded retry limit
  const uploadable = photos.filter(photo => {
    const retryCount = photo.retryCount ?? 0
    return retryCount < maxRetries
  })
  
  // Sort by createdAt ascending (oldest first - FIFO)
  return uploadable.sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

/**
 * Update photo with retry information after a failed upload attempt
 * 
 * Increments the retry count, sets the error message, and updates
 * the last attempt timestamp. Also sets status to 'failed'.
 * 
 * @param id - Photo ID
 * @param error - Error message from the failed upload attempt
 * 
 * **Validates: Requirements 3.1, 3.6**
 */
export async function updatePhotoRetry(id: string, error: string): Promise<void> {
  const photo = await db.photos.get(id)
  if (photo) {
    const currentRetryCount = photo.retryCount ?? 0
    await db.photos.update(id, {
      status: 'failed',
      retryCount: currentRetryCount + 1,
      lastError: error,
      lastAttemptAt: new Date().toISOString(),
    })
  }
}

/**
 * Reset retry count for manual retry
 * 
 * Resets the retry count to 0, clears the error message and last attempt
 * timestamp, and sets status back to 'pending'. This allows the photo
 * to be retried by the sync manager.
 * 
 * @param id - Photo ID
 * 
 * **Validates: Requirements 3.1, 3.6**
 */
export async function resetPhotoRetry(id: string): Promise<void> {
  await db.photos.update(id, {
    status: 'pending',
    retryCount: 0,
    lastError: null,
    lastAttemptAt: null,
  })
}

// ============================================
// PHOTO SAVE FUNCTION
// ============================================

/**
 * Save a captured photo to IndexedDB
 * 
 * This function takes the captured photo data from a capture session
 * and saves it to IndexedDB for offline support. The photo is saved
 * with status 'pending' and will be uploaded to Supabase when online.
 * 
 * @param capturedPhoto - The captured photo data from the capture session
 * @param jobId - The job order ID this photo belongs to
 * @param stage - The job stage (job_start, in_transit, job_end)
 * @param photoType - The photo type from the checklist item
 * @returns The ID of the saved photo
 * 
 * **Validates: Requirements 3.4.5 (offline support)**
 */
export async function savePhotoToIndexedDB(params: {
  capturedPhoto: {
    checklistItemId: string
    blob: Blob
    metadata: {
      takenAt: Date
      gpsLatitude: number | null
      gpsLongitude: number | null
      gpsAccuracy: number | null
    }
    notes: string | null
  }
  jobId: string
  stage: JobStage
  photoType: string
}): Promise<string> {
  const { capturedPhoto, jobId, stage, photoType } = params
  
  // Create the offline photo record using the helper function
  const offlinePhoto = createOfflinePhoto({
    jobOrderId: jobId,
    checklistItemId: capturedPhoto.checklistItemId,
    stage,
    photoType,
    blob: capturedPhoto.blob,
    metadata: {
      takenAt: capturedPhoto.metadata.takenAt,
      gpsLatitude: capturedPhoto.metadata.gpsLatitude,
      gpsLongitude: capturedPhoto.metadata.gpsLongitude,
      gpsAccuracy: capturedPhoto.metadata.gpsAccuracy,
    },
    notes: capturedPhoto.notes,
  })
  
  // Save to IndexedDB
  await db.photos.add(offlinePhoto)
  
  // Return the generated photo ID
  return offlinePhoto.id
}
