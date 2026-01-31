'use client'

import { Check, SkipForward, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Represents a photo item in the thumbnail grid
 */
export interface CapturedPhoto {
  /** ID of the checklist item this photo corresponds to */
  checklistItemId: string
  /** Title of the checklist item */
  title: string
  /** URL of the thumbnail image (empty string for skipped items) */
  thumbnailUrl: string
  /** Status of the item: captured or skipped */
  status: 'captured' | 'skipped'
}

interface PhotoThumbnailGridProps {
  /** Array of captured/skipped photo items to display */
  photos: CapturedPhoto[]
  /** Optional CSS class name */
  className?: string
}

/**
 * PhotoThumbnailGrid - Displays a grid of photo thumbnails with status badges
 * 
 * Used in the completion summary to show all captured and skipped photos
 * from a capture session. Each item shows:
 * - Thumbnail image for captured photos
 * - Placeholder icon for skipped items
 * - Status badge (checkmark for captured, skip icon for skipped)
 * - Title of the checklist item
 * 
 * **Validates: Requirements 3.6.2, 3.6.3**
 * 
 * @example
 * // Display captured and skipped photos
 * <PhotoThumbnailGrid
 *   photos={[
 *     { checklistItemId: '1', title: 'Cargo Front', thumbnailUrl: '/thumb1.jpg', status: 'captured' },
 *     { checklistItemId: '2', title: 'Damage', thumbnailUrl: '', status: 'skipped' },
 *   ]}
 * />
 */
export function PhotoThumbnailGrid({
  photos,
  className
}: PhotoThumbnailGridProps) {
  if (photos.length === 0) {
    return null
  }

  return (
    <div 
      className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', className)}
      role="list"
      aria-label="Captured photos"
    >
      {photos.map((photo) => (
        <PhotoThumbnailItem key={photo.checklistItemId} photo={photo} />
      ))}
    </div>
  )
}

/**
 * Individual thumbnail item in the grid
 */
function PhotoThumbnailItem({ photo }: { photo: CapturedPhoto }) {
  const isCaptured = photo.status === 'captured'
  
  return (
    <div 
      className="flex flex-col gap-1.5"
      role="listitem"
      aria-label={`${photo.title}: ${photo.status}`}
    >
      {/* Thumbnail container */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {isCaptured && photo.thumbnailUrl ? (
          // Captured photo thumbnail
          <img
            src={photo.thumbnailUrl}
            alt={photo.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          // Skipped item placeholder
          <div 
            className="flex h-full w-full items-center justify-center bg-muted"
            aria-hidden="true"
          >
            <ImageOff className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Status badge */}
        <StatusBadge status={photo.status} />
      </div>
      
      {/* Title */}
      <span 
        className={cn(
          'truncate text-xs font-medium',
          isCaptured ? 'text-foreground' : 'text-muted-foreground'
        )}
        title={photo.title}
      >
        {photo.title}
      </span>
    </div>
  )
}

/**
 * Status badge overlay for thumbnail
 */
function StatusBadge({ status }: { status: 'captured' | 'skipped' }) {
  const isCaptured = status === 'captured'
  
  return (
    <div 
      className={cn(
        'absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full',
        isCaptured 
          ? 'bg-green-500 text-white' 
          : 'bg-amber-500 text-white'
      )}
      aria-hidden="true"
      data-testid={`status-badge-${status}`}
    >
      {isCaptured ? (
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      ) : (
        <SkipForward className="h-3.5 w-3.5" strokeWidth={2.5} />
      )}
    </div>
  )
}

// Export helper for testing
export { StatusBadge, PhotoThumbnailItem }
