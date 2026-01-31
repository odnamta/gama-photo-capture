'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface StepProgressBarProps {
  currentStep: number      // 1-indexed for display
  totalSteps: number
  className?: string
}

/**
 * StepProgressBar - Displays step progress indicator for guided capture flow
 * 
 * Shows "Step X of Y" text with a visual progress bar.
 * Used in the guided capture flow to indicate progress through checklist items.
 * 
 * @example
 * <StepProgressBar currentStep={2} totalSteps={5} />
 * // Displays: "Step 2 of 5" with 40% progress bar
 */
export function StepProgressBar({ 
  currentStep, 
  totalSteps, 
  className 
}: StepProgressBarProps) {
  // Calculate progress percentage
  const progressPercentage = totalSteps > 0 
    ? (currentStep / totalSteps) * 100 
    : 0

  return (
    <div 
      className={cn('flex flex-col gap-2', className)}
      role="group"
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      <span 
        className="text-sm font-medium text-muted-foreground"
        aria-live="polite"
      >
        Step {currentStep} of {totalSteps}
      </span>
      <Progress 
        value={progressPercentage} 
        aria-label={`Progress: ${Math.round(progressPercentage)}% complete`}
        className="h-2"
      />
    </div>
  )
}
