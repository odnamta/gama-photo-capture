'use client'

import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhotoThumbnailGrid, type CapturedPhoto } from '@/components/atoms/photo-thumbnail-grid'
import { cn } from '@/lib/utils'
import type { PhotoChecklistItem } from '@/types/job'

interface CaptureCompleteSummaryProps {
  /** Array of captured photos with their status */
  captures: CapturedPhoto[]
  /** Array of skipped checklist items */
  skippedItems: PhotoChecklistItem[]
  /** Callback when user clicks Done button */
  onDone: () => void
  /** Optional additional CSS classes */
  className?: string
}

/**
 * CaptureCompleteSummary - Displays completion summary after all checklist items are processed
 * 
 * Shows a summary screen with:
 * - "Stage Complete!" header with success icon
 * - PhotoThumbnailGrid showing all captured and skipped items
 * - Count of captured photos and skipped items
 * - Done button to return to job detail
 * 
 * This component is displayed at the end of a guided capture session
 * when all checklist items have been either captured or skipped.
 * 
 * **Validates: Requirements 3.6.1, 3.6.2, 3.6.3, 3.6.4**
 * 
 * @example
 * <CaptureCompleteSummary
 *   captures={[
 *     { checklistItemId: '1', title: 'Cargo Front', thumbnailUrl: '/thumb1.jpg', status: 'captured' },
 *     { checklistItemId: '2', title: 'Damage', thumbnailUrl: '', status: 'skipped' },
 *   ]}
 *   skippedItems={[{ id: '2', title: 'Damage', ... }]}
 *   onDone={() => router.push('/jobs/123')}
 * />
 */
export function CaptureCompleteSummary({
  captures,
  skippedItems,
  onDone,
  className
}: CaptureCompleteSummaryProps) {
  // Calculate counts
  const capturedCount = captures.filter(c => c.status === 'captured').length
  const skippedCount = skippedItems.length

  // Combine captures with skipped items for the grid
  // Skipped items need to be converted to CapturedPhoto format
  const allPhotos: CapturedPhoto[] = [
    ...captures,
    ...skippedItems
      .filter(item => !captures.some(c => c.checklistItemId === item.id))
      .map(item => ({
        checklistItemId: item.id,
        title: item.title,
        thumbnailUrl: '',
        status: 'skipped' as const
      }))
  ]

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background',
        className
      )}
      role="region"
      aria-label="Capture complete summary"
      data-testid="capture-complete-summary"
    >
      {/* Header Section */}
      <div className="px-4 py-6 text-center border-b">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle2 
            className="h-8 w-8 text-green-500" 
            aria-hidden="true"
            data-testid="success-icon"
          />
          <h1 
            className="text-2xl font-bold text-foreground"
            data-testid="header-title"
          >
            Stage Complete!
          </h1>
        </div>
        
        {/* Summary counts */}
        <p 
          className="text-muted-foreground"
          data-testid="summary-counts"
        >
          {capturedCount > 0 && (
            <span>
              {capturedCount} photo{capturedCount !== 1 ? 's' : ''} captured
            </span>
          )}
          {capturedCount > 0 && skippedCount > 0 && (
            <span> • </span>
          )}
          {skippedCount > 0 && (
            <span>
              {skippedCount} skipped
            </span>
          )}
          {capturedCount === 0 && skippedCount === 0 && (
            <span>No photos in this session</span>
          )}
        </p>
      </div>

      {/* Photo Grid Section - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {allPhotos.length > 0 ? (
          <PhotoThumbnailGrid 
            photos={allPhotos}
            data-testid="photo-grid"
          />
        ) : (
          <div 
            className="flex items-center justify-center h-full text-muted-foreground"
            data-testid="empty-state"
          >
            No photos to display
          </div>
        )}
      </div>

      {/* Footer with Done Button */}
      <div className="px-4 py-4 border-t bg-background">
        <Button
          variant="default"
          size="lg"
          className="w-full"
          onClick={onDone}
          data-testid="done-button"
        >
          Done
        </Button>
      </div>
    </div>
  )
}
