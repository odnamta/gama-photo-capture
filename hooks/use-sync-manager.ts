'use client'

/**
 * Hook for managing photo upload synchronization
 * 
 * Orchestrates the upload process: monitors online status, processes
 * the upload queue in FIFO order, handles retries with exponential backoff,
 * and provides manual retry/delete actions.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - useSyncManager hook
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import {
  db,
  getUploadablePhotos,
  updatePhotoStatus,
  updatePhotoRetry,
  resetPhotoRetry,
  deletePhoto as deletePhotoFromDb,
  type OfflinePhoto,
} from '@/lib/offline/db'
import { uploadPhoto } from '@/lib/sync/upload-service'
import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

/**
 * Sync state machine states
 */
export type SyncState = 
  | 'idle'        // No pending uploads or waiting
  | 'processing'  // Actively uploading
  | 'paused'      // Paused (offline or manual)
  | 'complete'    // All uploads done
  | 'error'       // Error occurred

/**
 * Options for the sync manager hook
 */
export interface UseSyncManagerOptions {
  /** Whether to auto-start sync when online (default: true) */
  autoSync?: boolean
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number
}

/**
 * Return type for the useSyncManager hook
 */
export interface UseSyncManagerReturn {
  /** Current sync state */
  state: SyncState
  /** Whether currently syncing */
  isSyncing: boolean
  /** Current upload progress by photo ID (0-100) */
  uploadProgress: Map<string, number>
  /** Error message if any */
  error: string | null
  /** ID of photo currently being uploaded */
  currentPhotoId: string | null
  
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

// ============================================
// CONSTANTS
// ============================================

/** Exponential backoff delays in milliseconds */
const RETRY_DELAYS = [1000, 2000, 4000] // 1s, 2s, 4s

/** Default maximum retry attempts */
const DEFAULT_MAX_RETRIES = 3

// ============================================
// HOOK
// ============================================

/**
 * Hook for managing photo upload synchronization
 * 
 * @param options - Configuration options
 * @returns Sync state and actions
 * 
 * @example
 * ```tsx
 * const { state, isSyncing, startSync, retryPhoto } = useSyncManager()
 * 
 * // Start sync manually
 * await startSync()
 * 
 * // Retry a failed photo
 * await retryPhoto('photo-123')
 * ```
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 */
export function useSyncManager(options: UseSyncManagerOptions = {}): UseSyncManagerReturn {
  const { autoSync = true, maxRetries = DEFAULT_MAX_RETRIES } = options
  
  const { isOnline } = useOnlineStatus()
  
  const [state, setState] = useState<SyncState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map())
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null)
  
  // Refs for managing sync loop
  const isSyncingRef = useRef(false)
  const shouldPauseRef = useRef(false)
  
  /**
   * Get the current user ID from Supabase
   */
  const getUserId = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id ?? null
    } catch {
      return null
    }
  }, [])
  
  /**
   * Process a single photo upload
   */
  const processPhoto = useCallback(async (photo: OfflinePhoto, userId: string): Promise<boolean> => {
    try {
      // Update status to uploading
      await updatePhotoStatus(photo.id, 'uploading')
      setCurrentPhotoId(photo.id)
      
      // Upload with progress tracking
      const result = await uploadPhoto(photo, userId, {
        onProgress: (photoId, progress) => {
          setUploadProgress(prev => {
            const next = new Map(prev)
            next.set(photoId, progress)
            return next
          })
        },
      })
      
      if (result.success) {
        // Delete from IndexedDB on success
        await deletePhotoFromDb(photo.id)
        setUploadProgress(prev => {
          const next = new Map(prev)
          next.delete(photo.id)
          return next
        })
        return true
      } else {
        // Update retry info on failure
        await updatePhotoRetry(photo.id, result.error || 'Upload failed')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      await updatePhotoRetry(photo.id, errorMessage)
      return false
    } finally {
      setCurrentPhotoId(null)
    }
  }, [])
  
  /**
   * Main sync loop - processes queue in FIFO order
   */
  const syncLoop = useCallback(async () => {
    if (isSyncingRef.current) return
    
    isSyncingRef.current = true
    shouldPauseRef.current = false
    setState('processing')
    setError(null)
    
    try {
      const userId = await getUserId()
      if (!userId) {
        setError('Not authenticated')
        setState('error')
        isSyncingRef.current = false
        return
      }
      
      // Process photos one at a time (FIFO)
      while (!shouldPauseRef.current) {
        // Check if still online
        if (!navigator.onLine) {
          setState('paused')
          break
        }
        
        // Get next uploadable photo
        const photos = await getUploadablePhotos(maxRetries)
        if (photos.length === 0) {
          setState('complete')
          break
        }
        
        const photo = photos[0] // FIFO - oldest first
        const success = await processPhoto(photo, userId)
        
        if (!success) {
          // Check if we should apply backoff delay
          const updatedPhoto = await db.photos.get(photo.id)
          if (updatedPhoto && updatedPhoto.retryCount && updatedPhoto.retryCount < maxRetries) {
            const delayIndex = Math.min(updatedPhoto.retryCount - 1, RETRY_DELAYS.length - 1)
            const delay = RETRY_DELAYS[delayIndex]
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync error'
      setError(errorMessage)
      setState('error')
    } finally {
      isSyncingRef.current = false
    }
  }, [getUserId, maxRetries, processPhoto])
  
  /**
   * Start sync process
   */
  const startSync = useCallback(async () => {
    if (!isOnline) {
      setState('paused')
      return
    }
    await syncLoop()
  }, [isOnline, syncLoop])
  
  /**
   * Pause sync process
   */
  const pauseSync = useCallback(() => {
    shouldPauseRef.current = true
    setState('paused')
  }, [])
  
  /**
   * Retry a specific photo
   */
  const retryPhoto = useCallback(async (photoId: string) => {
    await resetPhotoRetry(photoId)
    if (isOnline && !isSyncingRef.current) {
      await startSync()
    }
  }, [isOnline, startSync])
  
  /**
   * Retry all failed photos
   */
  const retryAllFailed = useCallback(async () => {
    // Get all failed photos
    const failedPhotos = await db.photos.where('status').equals('failed').toArray()
    
    // Reset retry count for all
    for (const photo of failedPhotos) {
      await resetPhotoRetry(photo.id)
    }
    
    // Start sync if online
    if (isOnline && !isSyncingRef.current) {
      await startSync()
    }
  }, [isOnline, startSync])
  
  /**
   * Delete a photo from queue
   */
  const deletePhoto = useCallback(async (photoId: string) => {
    await deletePhotoFromDb(photoId)
  }, [])
  
  // Auto-sync when coming online
  useEffect(() => {
    if (autoSync && isOnline && state === 'paused') {
      startSync()
    }
  }, [autoSync, isOnline, state, startSync])
  
  // Pause when going offline
  useEffect(() => {
    if (!isOnline && state === 'processing') {
      pauseSync()
    }
  }, [isOnline, state, pauseSync])
  
  // Check for pending photos on mount
  useEffect(() => {
    const checkPending = async () => {
      const photos = await getUploadablePhotos(maxRetries)
      if (photos.length > 0 && autoSync && isOnline) {
        startSync()
      }
    }
    checkPending()
  }, [autoSync, isOnline, maxRetries, startSync])
  
  return {
    state,
    isSyncing: state === 'processing',
    uploadProgress,
    error,
    currentPhotoId,
    startSync,
    pauseSync,
    retryPhoto,
    retryAllFailed,
    deletePhoto,
  }
}

export default useSyncManager
