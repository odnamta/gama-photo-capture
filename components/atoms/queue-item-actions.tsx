'use client'

/**
 * Queue Item Actions Component
 * 
 * Provides retry and delete buttons for queue items.
 * Disabled during upload.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - QueueItemActions atom
 * 
 * **Validates: Requirements 3.4, 4.5**
 */

import { RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface QueueItemActionsProps {
  /** Photo status */
  status: 'pending' | 'uploading' | 'failed'
  /** Callback to retry upload */
  onRetry: () => void
  /** Callback to delete photo */
  onDelete: () => void
  /** Whether actions are disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================
// COMPONENT
// ============================================

/**
 * Queue Item Actions
 * 
 * Shows retry and delete buttons for failed photos.
 * 
 * @example
 * ```tsx
 * <QueueItemActions
 *   status="failed"
 *   onRetry={() => retryPhoto(id)}
 *   onDelete={() => deletePhoto(id)}
 * />
 * ```
 * 
 * **Validates: Requirements 3.4, 4.5**
 */
export function QueueItemActions({
  status,
  onRetry,
  onDelete,
  disabled = false,
  className,
}: QueueItemActionsProps) {
  const isUploading = status === 'uploading'
  const isFailed = status === 'failed'
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Retry button - only for failed photos */}
      {isFailed && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={disabled || isUploading}
          className="h-8 px-2"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      )}
      
      {/* Delete button - for failed photos */}
      {isFailed && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={disabled || isUploading}
          className="h-8 px-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      )}
    </div>
  )
}

export default QueueItemActions
