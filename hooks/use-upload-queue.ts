'use client'

/**
 * Hook for managing the upload queue state
 * 
 * Provides access to photos in IndexedDB that are pending upload,
 * grouped by status with statistics for UI display.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - useUploadQueue hook
 * 
 * **Validates: Requirements 4.1, 4.3**
 */

import { useCallback, useEffect, useState } from 'react'
import { db, type OfflinePhoto } from '@/lib/offline/db'

// ============================================
// TYPES
// ============================================

/**
 * Photos grouped by upload status
 */
export interface GroupedPhotos {
  /** Photos currently being uploaded */
  uploading: OfflinePhoto[]
  /** Photos waiting to be uploaded */
  pending: OfflinePhoto[]
  /** Photos that failed to upload */
  failed: OfflinePhoto[]
}

/**
 * Queue statistics
 */
export interface QueueStats {
  /** Total number of photos in queue */
  total: number
  /** Number of pending photos */
  pending: number
  /** Number of photos currently uploading */
  uploading: number
  /** Number of failed photos */
  failed: number
  /** Total size of all photos in bytes */
  totalSize: number
}

/**
 * Return type for the useUploadQueue hook
 */
export interface UseUploadQueueReturn {
  /** All photos in the queue */
  photos: OfflinePhoto[]
  /** Photos grouped by status */
  grouped: GroupedPhotos
  /** Queue statistics */
  stats: QueueStats
  /** Whether the queue is currently loading */
  isLoading: boolean
  /** Error message if loading failed */
  error: string | null
  /** Refresh the queue data from IndexedDB */
  refresh: () => Promise<void>
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Group photos by their upload status
 * 
 * Groups photos into uploading, pending, and failed categories.
 * Within each group, photos are sorted by createdAt (oldest first).
 * 
 * @param photos - Array of photos to group
 * @returns Grouped photos object
 */
export function groupPhotosByStatus(photos: OfflinePhoto[]): GroupedPhotos {
  const uploading: OfflinePhoto[] = []
  const pending: OfflinePhoto[] = []
  const failed: OfflinePhoto[] = []
  
  for (const photo of photos) {
    switch (photo.status) {
      case 'uploading':
        uploading.push(photo)
        break
      case 'pending':
        pending.push(photo)
        break
      case 'failed':
        failed.push(photo)
        break
    }
  }
  
  // Sort each group by createdAt (oldest first - FIFO)
  const sortByCreatedAt = (a: OfflinePhoto, b: OfflinePhoto) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  }
  
  uploading.sort(sortByCreatedAt)
  pending.sort(sortByCreatedAt)
  failed.sort(sortByCreatedAt)
  
  return { uploading, pending, failed }
}

/**
 * Calculate queue statistics from photos
 * 
 * @param photos - Array of photos
 * @param grouped - Grouped photos object
 * @returns Queue statistics
 */
export function calculateQueueStats(
  photos: OfflinePhoto[],
  grouped: GroupedPhotos
): QueueStats {
  // Calculate total size of all blobs
  const totalSize = photos.reduce((sum, photo) => {
    return sum + (photo.blob?.size ?? 0)
  }, 0)
  
  return {
    total: photos.length,
    pending: grouped.pending.length,
    uploading: grouped.uploading.length,
    failed: grouped.failed.length,
    totalSize,
  }
}

// ============================================
// HOOK
// ============================================

/**
 * Hook for managing the upload queue state
 * 
 * Loads photos from IndexedDB, groups them by status, and calculates
 * statistics. Provides a refresh function to reload the data.
 * 
 * @returns Upload queue state and actions
 * 
 * @example
 * ```tsx
 * const { photos, grouped, stats, isLoading, refresh } = useUploadQueue()
 * 
 * // Display pending count
 * <Badge>{stats.pending}</Badge>
 * 
 * // List failed photos
 * {grouped.failed.map(photo => (
 *   <QueueItem key={photo.id} photo={photo} />
 * ))}
 * ```
 * 
 * **Validates: Requirements 4.1, 4.3**
 */
export function useUploadQueue(): UseUploadQueueReturn {
  const [photos, setPhotos] = useState<OfflinePhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Load all photos from IndexedDB
   */
  const loadPhotos = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get all photos from IndexedDB
      const allPhotos = await db.photos.toArray()
      
      setPhotos(allPhotos)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load photos'
      setError(errorMessage)
      setPhotos([])
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  /**
   * Refresh the queue data
   */
  const refresh = useCallback(async () => {
    await loadPhotos()
  }, [loadPhotos])
  
  // Load photos on mount
  useEffect(() => {
    loadPhotos()
  }, [loadPhotos])
  
  // Calculate grouped photos and stats
  const grouped = groupPhotosByStatus(photos)
  const stats = calculateQueueStats(photos, grouped)
  
  return {
    photos,
    grouped,
    stats,
    isLoading,
    error,
    refresh,
  }
}

export default useUploadQueue
