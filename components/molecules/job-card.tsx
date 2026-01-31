'use client'

import { ChevronRight, Briefcase } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PhotoProgressBadge } from './photo-progress-badge'
import type { JobWithProgress } from '@/types/job'
import { cn } from '@/lib/utils'

interface JobCardProps {
  job: JobWithProgress
  onClick?: () => void
  className?: string
}

/**
 * Card displaying job info with photo progress indicators
 */
export function JobCard({ job, onClick, className }: JobCardProps) {
  const totalRequired = 
    job.progress.job_start.required + 
    job.progress.job_end.required
  
  const totalCompleted = 
    job.progress.job_start.completed + 
    job.progress.job_end.completed

  const isAllComplete = 
    job.progress.job_start.isComplete && 
    job.progress.job_end.isComplete

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent/50',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* JO Number and Status */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{job.joNumber}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                job.status === 'completed' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              )}>
                {job.status}
              </span>
            </div>

            {/* Customer Name */}
            <p className="text-sm text-muted-foreground truncate mb-2">
              {job.customerName}
            </p>

            {/* Description */}
            <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
              {job.description}
            </p>

            {/* Photo Progress */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Start:</span>
                <PhotoProgressBadge 
                  progress={job.progress.job_start} 
                  size="sm" 
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">End:</span>
                <PhotoProgressBadge 
                  progress={job.progress.job_end} 
                  size="sm" 
                />
              </div>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex items-center self-center">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
