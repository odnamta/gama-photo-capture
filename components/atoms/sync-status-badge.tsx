'use client'

/**
 * Sync Status Badge Component
 * 
 * Displays the number of pending uploads as a badge in the app header.
 * Shows upload animation when syncing, hides when count is 0.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - SyncStatusBadge atom
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface SyncStatusBadgeProps {
  /** Number of pending photos */
  pendingCount: number
  /** Whether currently uploading */
  isUploading: boolean
  /** Whether device is online */
  isOnline: boolean
  /** Click handler to navigate to queue */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

// ============================================
// COMPONENT
// ============================================

/**
 * Sync Status Badge
 * 
 * Shows pending upload count with visual feedback for sync status.
 * 
 * @example
 * ```tsx
 * <SyncStatusBadge
 *   pendingCount={5}
 *   isUploading={true}
 *   isOnline={true}
 *   onClick={() => router.push('/queue')}
 * />
 * ```
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
export function SyncStatusBadge({
  pendingCount,
  isUploading,
  isOnline,
  onClick,
  className,
}: SyncStatusBadgeProps) {
  // Hide badge when count is 0 and not uploading
  if (pendingCount === 0 && !isUploading) {
    return null
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center',
        'w-10 h-10 rounded-full',
        'hover:bg-muted transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
      aria-label={`${pendingCount} photos pending upload`}
    >
      {/* Icon */}
      {isUploading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : isOnline ? (
        <Cloud className="h-5 w-5 text-muted-foreground" />
      ) : (
        <CloudOff className="h-5 w-5 text-muted-foreground" />
      )}
      
      {/* Badge count */}
      {pendingCount > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1',
            'min-w-[18px] h-[18px] px-1',
            'flex items-center justify-center',
            'text-xs font-medium',
            'rounded-full',
            isUploading
              ? 'bg-primary text-primary-foreground'
              : 'bg-destructive text-destructive-foreground'
          )}
        >
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </button>
  )
}

export default SyncStatusBadge
