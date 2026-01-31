'use client'

/**
 * Queue Item Component
 * 
 * Displays a single photo in the upload queue with thumbnail,
 * metadata, status, progress bar, and action buttons.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - QueueItem molecule
 * 
 * **Validates: Requirements 4.2, 4.4, 6.1**
 */

import { useEffect, useState } from 'react'
import { AlertCircle, Clock, Loader2 } from 'lucide-react'
import { UploadProgress } from '@/components/atoms/upload-progress'
import { QueueItemActions } from '@/components/atoms/queue-item-actions'
import { cn } from '@/lib/utils'
import type { OfflinePhoto } from '@/lib/offline/db'

// ============================================
// TYPES
// ============================================

export interface QueueItemProps {
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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format stage name for display
 */
function formatStage(stage: string): string {
  switch (stage) {
    case 'job_start':
      return 'Job Start'
    case 'in_transit':
      return 'In Transit'
    case 'job_end':
      return 'Job End'
    default:
      return stage
  }
}

/**
 * Format photo type for display
 */
function formatPhotoType(photoType: string): string {
  return photoType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================
// COMPONENT
// ============================================

/**
 * Queue Item
 * 
 * Displays a photo in the upload queue with all relevant information.
 * 
 * @example
 * ```tsx
 * <QueueItem
 *   photo={photo}
 *   jobNumber="JO-2026-001"
 *   progress={45}
 *   onRetry={() => retryPhoto(photo.id)}
 *   onDelete={() => deletePhoto(photo.id)}
 * />
 * ```
 * 
 * **Validates: Requirements 4.2, 4.4, 6.1**
 */
export function QueueItem({
  photo,
  jobNumber,
  progress = 0,
  onRetry,
  onDelete,
  className,
}: QueueItemProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  
  // Create object URL for thumbnail
  useEffect(() => {
    if (photo.blob) {
      const url = URL.createObjectURL(photo.blob)
      setThumbnailUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [photo.blob])
  
  const isUploading = photo.status === 'uploading'
  const isFailed = photo.status === 'failed'
  const isPending = photo.status === 'pending'
  
  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg border bg-card',
        isFailed && 'border-destructive/50 bg-destructive/5',
        isUploading && 'border-primary/50 bg-primary/5',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${photo.photoType} photo`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        
        {/* Status overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {formatPhotoType(photo.photoType)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {jobNumber || 'Unknown Job'} • {formatStage(photo.stage)}
            </p>
          </div>
          
          {/* Status badge */}
          <div className="flex-shrink-0">
            {isUploading && (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Pending
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                Failed
              </span>
            )}
          </div>
        </div>
        
        {/* File size and retry info */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{formatFileSize(photo.blob?.size ?? 0)}</span>
          {photo.retryCount && photo.retryCount > 0 && (
            <span>• {photo.retryCount} retries</span>
          )}
        </div>
        
        {/* Error message */}
        {isFailed && photo.lastError && (
          <p className="text-xs text-destructive mt-1 truncate">
            {photo.lastError}
          </p>
        )}
        
        {/* Progress bar for uploading */}
        {isUploading && (
          <div className="mt-2">
            <UploadProgress progress={progress} isUploading={true} />
          </div>
        )}
        
        {/* Actions for failed photos */}
        {isFailed && (
          <div className="mt-2">
            <QueueItemActions
              status={photo.status}
              onRetry={onRetry}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default QueueItem
