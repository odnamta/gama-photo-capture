'use client'

import { Lock, Camera, CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PhotoProgressBadge } from './photo-progress-badge'
import type { JobStage, StageProgress } from '@/types/job'
import { STAGE_LABELS, STAGE_DESCRIPTIONS, getStageStatus } from '@/types/job'
import { cn } from '@/lib/utils'

interface StageCardProps {
  stage: JobStage
  progress: StageProgress
  onStartCapture?: () => void
  className?: string
}

/**
 * Card for a job stage showing progress and capture button
 */
export function StageCard({ 
  stage, 
  progress, 
  onStartCapture,
  className 
}: StageCardProps) {
  const status = getStageStatus(progress)
  const labels = STAGE_LABELS[stage]
  const descriptions = STAGE_DESCRIPTIONS[stage]
  
  const progressPercent = progress.required > 0 
    ? Math.min((progress.completed / progress.required) * 100, 100)
    : progress.completed > 0 ? 100 : 0

  const isInTransit = stage === 'in_transit'

  return (
    <Card className={cn(
      'transition-opacity',
      progress.isLocked && 'opacity-60',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            {/* Stage Title */}
            <div className="flex items-center gap-2 mb-1">
              {status === 'complete' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : status === 'locked' ? (
                <Lock className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <h3 className="font-semibold">{labels.en}</h3>
            </div>
            
            {/* Indonesian subtitle */}
            <p className="text-xs text-muted-foreground mb-1">
              {labels.id}
            </p>

            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {descriptions.en}
            </p>
          </div>

          {/* Progress Badge */}
          <PhotoProgressBadge progress={progress} />
        </div>

        {/* Progress Bar (only for stages with required photos) */}
        {!isInTransit && progress.required > 0 && (
          <div className="mb-3">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {progress.completed} of {progress.required} required photos
            </p>
          </div>
        )}

        {/* Optional photos note for in_transit */}
        {isInTransit && (
          <p className="text-xs text-muted-foreground mb-3">
            All photos optional • {progress.completed} taken
          </p>
        )}

        {/* Locked message or Capture button */}
        {progress.isLocked ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-md p-3">
            <Lock className="h-4 w-4" />
            <span>Complete Job Start photos first</span>
          </div>
        ) : (
          <Button 
            onClick={onStartCapture}
            className="w-full"
            variant={status === 'complete' ? 'outline' : 'default'}
          >
            <Camera className="h-4 w-4 mr-2" />
            {status === 'complete' ? 'Add More Photos' : 'Start Capture'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
