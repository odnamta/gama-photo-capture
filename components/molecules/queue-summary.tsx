'use client'

/**
 * Queue Summary Component
 * 
 * Displays summary statistics for the upload queue including
 * counts by status and total size. Includes "Retry All" button.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - QueueSummary molecule
 * 
 * **Validates: Requirements 4.3, 3.5**
 */

import { Cloud, CloudOff, Loader2, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface QueueSummaryProps {
  /** Total pending count */
  pendingCount: number
  /** Total failed count */
  failedCount: number
  /** Total uploading count */
  uploadingCount: number
  /** Total size in bytes */
  totalSize: number
  /** Whether currently syncing */
  isSyncing: boolean
  /** Whether device is online */
  isOnline: boolean
  /** Callback to retry all failed */
  onRetryAll: () => void
  /** Additional CSS classes */
  className?: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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
 * Queue Summary
 * 
 * Shows overview of upload queue status with action buttons.
 * 
 * @example
 * ```tsx
 * <QueueSummary
 *   pendingCount={5}
 *   failedCount={2}
 *   uploadingCount={1}
 *   totalSize={15000000}
 *   isSyncing={true}
 *   isOnline={true}
 *   onRetryAll={() => retryAllFailed()}
 * />
 * ```
 * 
 * **Validates: Requirements 4.3, 3.5**
 */
export function QueueSummary({
  pendingCount,
  failedCount,
  uploadingCount,
  totalSize,
  isSyncing,
  isOnline,
  onRetryAll,
  className,
}: QueueSummaryProps) {
  const totalCount = pendingCount + failedCount + uploadingCount
  
  return (
    <div className={cn('p-4 border-b bg-muted/30', className)}>
      {/* Status header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <>
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <span className="font-medium">Syncing...</span>
            </>
          ) : isOnline ? (
            <>
              <Cloud className="h-5 w-5 text-green-600" />
              <span className="font-medium">Online</span>
            </>
          ) : (
            <>
              <CloudOff className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Offline</span>
            </>
          )}
        </div>
        
        {/* Retry All button */}
        {failedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetryAll}
            disabled={!isOnline || isSyncing}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry All ({failedCount})
          </Button>
        )}
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Uploading */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10">
          <Loader2 className={cn(
            'h-4 w-4 text-primary',
            uploadingCount > 0 && 'animate-spin'
          )} />
          <div>
            <p className="text-lg font-semibold">{uploadingCount}</p>
            <p className="text-xs text-muted-foreground">Uploading</p>
          </div>
        </div>
        
        {/* Pending */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-lg font-semibold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        
        {/* Failed */}
        <div className={cn(
          'flex items-center gap-2 p-2 rounded-md',
          failedCount > 0 ? 'bg-destructive/10' : 'bg-muted'
        )}>
          <AlertCircle className={cn(
            'h-4 w-4',
            failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'
          )} />
          <div>
            <p className="text-lg font-semibold">{failedCount}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>
      </div>
      
      {/* Total info */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
        <span>{totalCount} photos in queue</span>
        <span>{formatFileSize(totalSize)} total</span>
      </div>
    </div>
  )
}

export default QueueSummary
