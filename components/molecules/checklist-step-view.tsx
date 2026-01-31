'use client'

import { SkipForward } from 'lucide-react'
import { StepProgressBar } from '@/components/atoms/step-progress-bar'
import { StepInstructions } from '@/components/atoms/step-instructions'
import { CameraPlaceholder } from '@/components/atoms/camera-placeholder'
import { CaptureButton } from '@/components/atoms/capture-button'
import { Button } from '@/components/ui/button'
import { getLocalizedContent, getLocalizedContentNullable, type Locale } from '@/lib/utils/locale'
import type { PhotoChecklistItem } from '@/types/job'
import { cn } from '@/lib/utils'

interface ChecklistStepViewProps {
  item: PhotoChecklistItem
  stepNumber: number
  totalSteps: number
  locale: Locale
  onCapture: () => void
  onSkip?: () => void  // Only provided for optional items
  className?: string
}

/**
 * ChecklistStepView - Molecule component for guided capture step
 * 
 * Combines StepProgressBar, StepInstructions, CameraPlaceholder, and CaptureButton
 * to create a complete step view for the guided capture flow.
 * 
 * Features:
 * - Step progress indicator at the top
 * - Locale-aware instructions (title, description, tips)
 * - Camera placeholder/viewfinder
 * - Large capture button
 * - Skip button for optional items only (is_required=false)
 * 
 * @example
 * // Required item (no skip button)
 * <ChecklistStepView
 *   item={checklistItem}
 *   stepNumber={1}
 *   totalSteps={5}
 *   locale="en"
 *   onCapture={() => handleCapture()}
 * />
 * 
 * @example
 * // Optional item (with skip button)
 * <ChecklistStepView
 *   item={optionalItem}
 *   stepNumber={4}
 *   totalSteps={5}
 *   locale="id"
 *   onCapture={() => handleCapture()}
 *   onSkip={() => handleSkip()}
 * />
 */
export function ChecklistStepView({
  item,
  stepNumber,
  totalSteps,
  locale,
  onCapture,
  onSkip,
  className
}: ChecklistStepViewProps) {
  // Get locale-aware content
  const title = getLocalizedContent(locale, item.title, item.title_id)
  const description = getLocalizedContentNullable(locale, item.description, item.description_id)
  const tips = item.tips

  // Determine if skip button should be shown
  // Skip button is only shown for optional items (is_required=false)
  const showSkipButton = !item.is_required && onSkip !== undefined

  return (
    <div 
      className={cn(
        'flex flex-col h-full',
        className
      )}
      data-testid="checklist-step-view"
    >
      {/* Step Progress Bar - Top */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar 
          currentStep={stepNumber} 
          totalSteps={totalSteps} 
        />
      </div>

      {/* Instructions Section */}
      <div className="px-4 py-3">
        <StepInstructions
          title={title}
          description={description}
          tips={tips}
        />
      </div>

      {/* Camera Placeholder - Flexible height */}
      <div className="flex-1 px-4 py-2 min-h-0">
        <CameraPlaceholder
          onCapture={(blob) => {
            // In the full implementation, this would pass the blob
            // For now, we just trigger the onCapture callback
            onCapture()
          }}
          className="h-full"
        />
      </div>

      {/* Action Buttons - Bottom */}
      <div className="px-4 pb-6 pt-4 space-y-3">
        {/* Main Capture Button - Centered */}
        <div className="flex justify-center">
          <CaptureButton 
            onCapture={onCapture}
            aria-label={`Capture ${title}`}
          />
        </div>

        {/* Skip Button - Only for optional items */}
        {showSkipButton && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground"
              data-testid="skip-button"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip this photo
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
