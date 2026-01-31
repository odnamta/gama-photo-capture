'use client'

/**
 * Upload Progress Component
 * 
 * Displays a progress bar for photo upload progress.
 * Animates during upload.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - UploadProgress atom
 * 
 * **Validates: Requirements 6.1, 6.2**
 */

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface UploadProgressProps {
  /** Progress percentage (0-100) */
  progress: number
  /** Whether upload is in progress */
  isUploading: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================
// COMPONENT
// ============================================

/**
 * Upload Progress Bar
 * 
 * Shows upload progress with animation during active upload.
 * 
 * @example
 * ```tsx
 * <UploadProgress progress={45} isUploading={true} />
 * ```
 * 
 * **Validates: Requirements 6.1, 6.2**
 */
export function UploadProgress({
  progress,
  isUploading,
  className,
}: UploadProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <Progress
        value={progress}
        className={cn(
          'h-2',
          isUploading && 'animate-pulse'
        )}
      />
      {isUploading && (
        <p className="text-xs text-muted-foreground mt-1">
          {progress}% uploaded
        </p>
      )}
    </div>
  )
}

export default UploadProgress
