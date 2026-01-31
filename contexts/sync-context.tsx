'use client'

/**
 * Sync Context Provider for GAMA Photo Capture
 * 
 * Provides sync state and actions to all components via React Context.
 * Combines useSyncManager and useUploadQueue hooks into a single context.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - SyncProvider component
 * 
 * **Validates: Requirements 2.1, 2.6**
 */

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useSyncManager, type SyncState } from '@/hooks/use-sync-manager'
import { useUploadQueue, type GroupedPhotos, type QueueStats } from '@/hooks/use-upload-queue'
import { useOnlineStatus } from '@/hooks/use-online-status'

// ============================================
// TYPES
// ============================================

/**
 * Sync context value
 */
export interface SyncContextValue {
  // State
  /** Current sync state */
  syncState: SyncState
  /** Whether currently syncing */
  isSyncing: boolean
  /** Number of pending photos */
  pendingCount: number
  /** Number of failed photos */
  failedCount: number
  /** Number of photos currently uploading */
  uploadingCount: number
  /** Total number of photos in queue */
  totalCount: number
  /** Total size of photos in bytes */
  totalSize: number
  /** Current upload progress by photo ID */
  uploadProgress: Map<string, number>
  /** Whether device is online */
  isOnline: boolean
  /** Whether device is offline */
  isOffline: boolean
  /** Error message if any */
  error: string | null
  /** ID of photo currently being uploaded */
  currentPhotoId: string | null
  /** Photos grouped by status */
  groupedPhotos: GroupedPhotos
  /** Queue statistics */
  stats: QueueStats
  /** Whether queue is loading */
  isLoading: boolean
  
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
  /** Refresh queue data */
  refreshQueue: () => Promise<void>
}

// ============================================
// CONTEXT
// ============================================

const SyncContext = createContext<SyncContextValue | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

/**
 * Props for SyncProvider
 */
export interface SyncProviderProps {
  /** Child components */
  children: ReactNode
  /** Whether to auto-start sync when online (default: true) */
  autoSync?: boolean
}

/**
 * Sync Provider Component
 * 
 * Wraps the app to provide sync state and actions via context.
 * Combines useSyncManager and useUploadQueue hooks.
 * 
 * @example
 * ```tsx
 * // In app layout
 * <SyncProvider>
 *   {children}
 * </SyncProvider>
 * 
 * // In any component
 * const { pendingCount, startSync } = useSync()
 * ```
 * 
 * **Validates: Requirements 2.1, 2.6**
 */
export function SyncProvider({ children, autoSync = true }: SyncProviderProps) {
  const { isOnline, isOffline } = useOnlineStatus()
  
  const {
    state: syncState,
    isSyncing,
    uploadProgress,
    error,
    currentPhotoId,
    startSync,
    pauseSync,
    retryPhoto: retryPhotoAction,
    retryAllFailed: retryAllFailedAction,
    deletePhoto: deletePhotoAction,
  } = useSyncManager({ autoSync })
  
  const {
    grouped: groupedPhotos,
    stats,
    isLoading,
    refresh: refreshQueue,
  } = useUploadQueue()
  
  // Wrap actions to refresh queue after
  const retryPhoto = useCallback(async (photoId: string) => {
    await retryPhotoAction(photoId)
    await refreshQueue()
  }, [retryPhotoAction, refreshQueue])
  
  const retryAllFailed = useCallback(async () => {
    await retryAllFailedAction()
    await refreshQueue()
  }, [retryAllFailedAction, refreshQueue])
  
  const deletePhoto = useCallback(async (photoId: string) => {
    await deletePhotoAction(photoId)
    await refreshQueue()
  }, [deletePhotoAction, refreshQueue])
  
  const value: SyncContextValue = {
    // State
    syncState,
    isSyncing,
    pendingCount: stats.pending,
    failedCount: stats.failed,
    uploadingCount: stats.uploading,
    totalCount: stats.total,
    totalSize: stats.totalSize,
    uploadProgress,
    isOnline,
    isOffline,
    error,
    currentPhotoId,
    groupedPhotos,
    stats,
    isLoading,
    
    // Actions
    startSync,
    pauseSync,
    retryPhoto,
    retryAllFailed,
    deletePhoto,
    refreshQueue,
  }
  
  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to access sync context
 * 
 * Must be used within a SyncProvider.
 * 
 * @returns Sync context value
 * @throws Error if used outside SyncProvider
 * 
 * @example
 * ```tsx
 * const { pendingCount, isSyncing, startSync } = useSync()
 * ```
 */
export function useSync(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider')
  }
  return context
}

export default SyncProvider
