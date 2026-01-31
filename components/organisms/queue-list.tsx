'use client'

/**
 * Queue List Component
 * 
 * Displays the list of photos in the upload queue, grouped by status.
 * Shows uploading photos first, then pending, then failed.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - QueueList organism
 * 
 * **Validates: Requirements 4.1, 4.6**
 */

import { QueueItem } from '@/components/molecules/queue-item'
import { EmptyQueueState } from '@/components/atoms/empty-queue-state'
import { cn } from '@/lib/utils'
import type { OfflinePhoto } from '@/lib/offline/db'

// ============================================
// TYPES
// ============================================

export interface QueueListProps {
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

// ============================================
// COMPONENT
// ============================================

/**
 * Queue List
 * 
 * Renders the upload queue with photos grouped by status.
 * 
 * @example
 * ```tsx
 * <QueueList
 *   photos={groupedPhotos}
 *   jobNumbers={jobNumberMap}
 *   uploadProgress={progressMap}
 *   onRetry={(id) => retryPhoto(id)}
 *   onDelete={(id) => deletePhoto(id)}
 * />
 * ```
 * 
 * **Validates: Requirements 4.1, 4.6**
 */
export function QueueList({
  photos,
  jobNumbers,
  uploadProgress,
  onRetry,
  onDelete,
  className,
}: QueueListProps) {
  const totalCount = 
    photos.uploading.length + 
    photos.pending.length + 
    photos.failed.length
  
  // Show empty state if no photos
  if (totalCount === 0) {
    return <EmptyQueueState className={className} />
  }
  
  return (
    <div className={cn('flex flex-col gap-2 p-4', className)}>
      {/* Uploading section */}
      {photos.uploading.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Uploading ({photos.uploading.length})
          </h3>
          <div className="flex flex-col gap-2">
            {photos.uploading.map(photo => (
              <QueueItem
                key={photo.id}
                photo={photo}
                jobNumber={jobNumbers.get(photo.jobOrderId)}
                progress={uploadProgress.get(photo.id) ?? 0}
                onRetry={() => onRetry(photo.id)}
                onDelete={() => onDelete(photo.id)}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Pending section */}
      {photos.pending.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Pending ({photos.pending.length})
          </h3>
          <div className="flex flex-col gap-2">
            {photos.pending.map(photo => (
              <QueueItem
                key={photo.id}
                photo={photo}
                jobNumber={jobNumbers.get(photo.jobOrderId)}
                progress={0}
                onRetry={() => onRetry(photo.id)}
                onDelete={() => onDelete(photo.id)}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Failed section */}
      {photos.failed.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-destructive mb-2">
            Failed ({photos.failed.length})
          </h3>
          <div className="flex flex-col gap-2">
            {photos.failed.map(photo => (
              <QueueItem
                key={photo.id}
                photo={photo}
                jobNumber={jobNumbers.get(photo.jobOrderId)}
                progress={0}
                onRetry={() => onRetry(photo.id)}
                onDelete={() => onDelete(photo.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default QueueList
