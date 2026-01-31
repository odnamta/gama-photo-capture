/**
 * Upload Service for GAMA Photo Capture
 * 
 * Handles uploading photos from IndexedDB to Supabase Storage and creating
 * metadata records in the shipment_photos table.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - Upload Service section
 * @see .kiro/steering/database-schema.md - shipment_photos table
 * 
 * **Validates: Requirements 1.1, 1.3, 7.3**
 */

import { createClient } from '@/lib/supabase/client'
import { generateStoragePath } from '@/lib/sync/storage-path'
import type { OfflinePhoto } from '@/lib/offline/db'
import type { ShipmentPhotoInsert } from '@/types/database'

// ============================================
// CONSTANTS
// ============================================

/** Storage bucket name for shipment photos */
export const STORAGE_BUCKET = 'shipment-photos'

/** Default MIME type for photos */
export const DEFAULT_MIME_TYPE = 'image/jpeg'

// ============================================
// INTERFACES
// ============================================

/**
 * Result of an upload operation
 */
export interface UploadResult {
  /** Whether the upload was successful */
  success: boolean
  /** The photo ID that was uploaded */
  photoId: string
  /** The storage path where the blob was uploaded (on success) */
  storagePath?: string
  /** The shipment photo record ID in the database (on success) */
  shipmentPhotoId?: string
  /** Error message (on failure) */
  error?: string
}

/**
 * Result of a storage upload operation
 */
export interface StorageUploadResult {
  /** Whether the upload was successful */
  success: boolean
  /** The storage path where the blob was uploaded (on success) */
  path?: string
  /** Error message (on failure) */
  error?: string
}

/**
 * Result of a database insert operation
 */
export interface DatabaseInsertResult {
  /** Whether the insert was successful */
  success: boolean
  /** The inserted record ID (on success) */
  id?: string
  /** Error message (on failure) */
  error?: string
}

/**
 * Options for upload operations
 */
export interface UploadServiceOptions {
  /** Callback for progress updates (0-100) */
  onProgress?: (photoId: string, progress: number) => void
}

// ============================================
// STORAGE UPLOAD FUNCTIONS
// ============================================

/**
 * Upload a blob to Supabase Storage
 * 
 * Uploads the photo blob to the shipment-photos bucket at the specified path.
 * The path should be generated using generateStoragePath() from storage-path.ts.
 * 
 * @param blob - The photo blob to upload
 * @param path - The storage path (e.g., "userId/2026/01/jobId/stage/timestamp_photoId.jpg")
 * @returns Upload result with success status and path or error
 * 
 * @example
 * const result = await uploadToStorage(photoBlob, 'user-123/2026/01/job-456/job_start/1234567890_photo-789.jpg')
 * if (result.success) {
 *   console.log('Uploaded to:', result.path)
 * }
 * 
 * **Validates: Requirements 1.1**
 */
export async function uploadToStorage(
  blob: Blob,
  path: string
): Promise<StorageUploadResult> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, {
        contentType: DEFAULT_MIME_TYPE,
        upsert: false, // Don't overwrite existing files
      })
    
    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }
    
    return {
      success: true,
      path: data.path,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown storage upload error'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// ============================================
// DATABASE INSERT FUNCTIONS
// ============================================

/**
 * Insert a shipment photo record into the database
 * 
 * Creates a new record in the shipment_photos table with all metadata
 * from the offline photo. Sets upload_status to 'completed' and
 * sync_status to 'synced'.
 * 
 * @param photo - The offline photo from IndexedDB
 * @param userId - The authenticated user's ID
 * @param storagePath - The path where the blob was uploaded in Storage
 * @returns Insert result with success status and record ID or error
 * 
 * @example
 * const result = await insertShipmentPhoto(offlinePhoto, 'user-123', 'path/to/photo.jpg')
 * if (result.success) {
 *   console.log('Created record:', result.id)
 * }
 * 
 * **Validates: Requirements 1.3**
 */
export async function insertShipmentPhoto(
  photo: OfflinePhoto,
  userId: string,
  storagePath: string
): Promise<DatabaseInsertResult> {
  try {
    const supabase = createClient()
    
    // Build the insert record with all metadata from the offline photo
    const record: ShipmentPhotoInsert = {
      id: photo.id, // Use same ID as OfflinePhoto for consistency
      job_order_id: photo.jobOrderId,
      checklist_item_id: photo.checklistItemId,
      uploaded_by: userId,
      photo_type: photo.photoType,
      stage: photo.stage,
      file_name: `${photo.id}.jpg`,
      file_size: photo.blob.size,
      mime_type: DEFAULT_MIME_TYPE,
      storage_bucket: STORAGE_BUCKET,
      storage_path: storagePath,
      thumbnail_path: null, // Thumbnails not implemented yet
      gps_latitude: photo.metadata.gpsLatitude,
      gps_longitude: photo.metadata.gpsLongitude,
      gps_accuracy: photo.metadata.gpsAccuracy,
      taken_at: photo.metadata.takenAt,
      uploaded_at: new Date().toISOString(),
      upload_status: 'completed',
      sync_status: 'synced',
      notes: photo.notes,
      has_damage: photo.photoType === 'damage',
      is_deleted: false,
      deleted_at: null,
    }
    
    const { data, error } = await supabase
      .from('shipment_photos')
      .insert(record)
      .select('id')
      .single()
    
    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }
    
    return {
      success: true,
      id: data.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown database insert error'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// ============================================
// VERIFICATION FUNCTIONS
// ============================================

/**
 * Verify that a shipment photo record exists in the database
 * 
 * Checks if a record with the given photo ID exists in the shipment_photos
 * table. This is used to verify that the database insert was successful
 * before deleting the local blob from IndexedDB.
 * 
 * @param photoId - The photo ID to verify
 * @returns true if the record exists, false otherwise
 * 
 * @example
 * const exists = await verifyUpload('photo-123')
 * if (exists) {
 *   // Safe to delete local blob
 * }
 * 
 * **Validates: Requirements 7.3**
 */
export async function verifyUpload(photoId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('shipment_photos')
      .select('id')
      .eq('id', photoId)
      .single()
    
    if (error) {
      // Record not found or other error
      return false
    }
    
    return data !== null
  } catch {
    return false
  }
}

/**
 * Check if a photo blob exists in Supabase Storage
 * 
 * Verifies that a blob exists at the given storage path. This is useful
 * for detecting partial uploads where the blob was uploaded but the
 * database record was not created.
 * 
 * @param storagePath - The storage path to check
 * @returns true if the blob exists, false otherwise
 * 
 * **Validates: Requirements 7.4**
 */
export async function verifyStorageBlob(storagePath: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Try to get the file metadata (doesn't download the actual file)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(storagePath.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: storagePath.split('/').pop(),
      })
    
    if (error) {
      return false
    }
    
    // Check if the file exists in the list
    const fileName = storagePath.split('/').pop()
    return data.some(file => file.name === fileName)
  } catch {
    return false
  }
}

// ============================================
// MAIN UPLOAD FUNCTION
// ============================================

/**
 * Upload a single photo to Supabase
 * 
 * This is the main function for uploading a photo. It:
 * 1. Generates the storage path
 * 2. Uploads the blob to Supabase Storage
 * 3. Creates the shipment_photos database record
 * 4. Returns the result
 * 
 * Note: This function does NOT update IndexedDB status or delete the blob.
 * Those operations should be handled by the caller (sync manager) to ensure
 * proper error handling and transaction management.
 * 
 * @param photo - The offline photo from IndexedDB
 * @param userId - The authenticated user's ID
 * @param options - Optional callbacks for progress updates
 * @returns Upload result with success status and details
 * 
 * @example
 * const result = await uploadPhoto(offlinePhoto, 'user-123', {
 *   onProgress: (photoId, progress) => console.log(`${photoId}: ${progress}%`)
 * })
 * if (result.success) {
 *   // Delete from IndexedDB
 * }
 * 
 * **Validates: Requirements 1.1, 1.3, 1.6**
 */
export async function uploadPhoto(
  photo: OfflinePhoto,
  userId: string,
  options?: UploadServiceOptions
): Promise<UploadResult> {
  const { onProgress } = options || {}
  
  try {
    // Report initial progress
    onProgress?.(photo.id, 0)
    
    // Step 1: Generate storage path
    const storagePath = generateStoragePath(userId, photo)
    onProgress?.(photo.id, 10)
    
    // Step 2: Upload blob to Storage
    const storageResult = await uploadToStorage(photo.blob, storagePath)
    
    if (!storageResult.success) {
      return {
        success: false,
        photoId: photo.id,
        error: `Storage upload failed: ${storageResult.error}`,
      }
    }
    
    onProgress?.(photo.id, 60)
    
    // Step 3: Insert database record
    const dbResult = await insertShipmentPhoto(photo, userId, storagePath)
    
    if (!dbResult.success) {
      // Note: Blob is uploaded but DB insert failed
      // This is a partial upload state that should be handled by recovery logic
      return {
        success: false,
        photoId: photo.id,
        storagePath, // Include path so caller can handle partial upload
        error: `Database insert failed: ${dbResult.error}`,
      }
    }
    
    onProgress?.(photo.id, 100)
    
    // Success!
    return {
      success: true,
      photoId: photo.id,
      storagePath,
      shipmentPhotoId: dbResult.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown upload error'
    return {
      success: false,
      photoId: photo.id,
      error: errorMessage,
    }
  }
}

/**
 * Recover from a partial upload
 * 
 * If a blob was uploaded to Storage but the database record was not created,
 * this function creates the missing database record.
 * 
 * @param photo - The offline photo from IndexedDB
 * @param userId - The authenticated user's ID
 * @param storagePath - The path where the blob was uploaded
 * @returns Upload result with success status
 * 
 * **Validates: Requirements 7.4**
 */
export async function recoverPartialUpload(
  photo: OfflinePhoto,
  userId: string,
  storagePath: string
): Promise<UploadResult> {
  try {
    // Verify the blob exists in storage
    const blobExists = await verifyStorageBlob(storagePath)
    
    if (!blobExists) {
      return {
        success: false,
        photoId: photo.id,
        error: 'Storage blob not found for recovery',
      }
    }
    
    // Check if database record already exists
    const recordExists = await verifyUpload(photo.id)
    
    if (recordExists) {
      // Already recovered or was never a partial upload
      return {
        success: true,
        photoId: photo.id,
        storagePath,
        shipmentPhotoId: photo.id,
      }
    }
    
    // Create the missing database record
    const dbResult = await insertShipmentPhoto(photo, userId, storagePath)
    
    if (!dbResult.success) {
      return {
        success: false,
        photoId: photo.id,
        storagePath,
        error: `Recovery failed: ${dbResult.error}`,
      }
    }
    
    return {
      success: true,
      photoId: photo.id,
      storagePath,
      shipmentPhotoId: dbResult.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown recovery error'
    return {
      success: false,
      photoId: photo.id,
      error: errorMessage,
    }
  }
}
