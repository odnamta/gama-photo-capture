'use client'

/**
 * Empty Queue State Component
 * 
 * Displays a message when the upload queue is empty.
 * Shows a checkmark icon to indicate all uploads are complete.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - EmptyQueueState atom
 * 
 * **Validates: Requirements 4.6**
 */

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface EmptyQueueStateProps {
  /** Additional CSS classes */
  className?: string
}

// ============================================
// COMPONENT
// ============================================

/**
 * Empty Queue State
 * 
 * Shows when there are no photos in the upload queue.
 * 
 * @example
 * ```tsx
 * {photos.length === 0 && <EmptyQueueState />}
 * ```
 * 
 * **Validates: Requirements 4.6**
 */
export function EmptyQueueState({ className }: EmptyQueueStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        className
      )}
    >
      <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 mb-4">
        <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">All Synced!</h3>
      <p className="text-muted-foreground text-center text-sm">
        All photos have been uploaded successfully.
        <br />
        No pending uploads in the queue.
      </p>
    </div>
  )
}

export default EmptyQueueState
