'use client'

import { cn } from '@/lib/utils'
import type { StageProgress, StageStatus } from '@/types/job'
import { getStageStatus, STAGE_STATUS_COLORS } from '@/types/job'

interface PhotoProgressBadgeProps {
  progress: StageProgress
  showTotal?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Badge showing photo completion progress (e.g., "3/4 photos")
 * Color-coded by status: red (not started), yellow (in progress), green (complete)
 */
export function PhotoProgressBadge({ 
  progress, 
  showTotal = false,
  size = 'md',
  className 
}: PhotoProgressBadgeProps) {
  const status = getStageStatus(progress)
  const colorClass = STAGE_STATUS_COLORS[status]
  
  const displayCount = showTotal ? progress.total : progress.required
  const label = progress.isLocked 
    ? 'Locked' 
    : `${progress.completed}/${displayCount}`

  return (
    <span 
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
