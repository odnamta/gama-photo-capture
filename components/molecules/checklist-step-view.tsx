'use client'

import { useRef, useCallback } from 'react'
import { SkipForward } from 'lucide-react'
import { StepProgressBar } from '@/components/atoms/step-progress-bar'
import { StepInstructions } from '@/components/atoms/step-instructions'
import { CameraCapture, type CameraCaptureHandle } from '@/components/organisms/camera-capture'
import { CameraPlaceholder } from '@/components/atoms/camera-placeholder'
import { CaptureButton } from '@/components/atoms/capture-button'
import { Button } from '@/components/ui/button'
import { getLocalizedContent, getLocalizedContentNullable, type Locale } from '@/lib/utils/locale'
import { isCameraSupported } from '@/hooks/use-camera'
import type { PhotoChecklistItem } from '@/types/job'
import type { CaptureMetadata } from '@/types/capture'
import { cn } from '@/lib/utils'

interface ChecklistStepViewProps {
  item: PhotoChecklistItem
  stepNumber: number
  totalSteps: number
  locale: Locale
  /** Callback when photo is captured with blob and metadata */
  onCapture: (blob: Blob, metadata: CaptureMetadata) => void
  onSkip?: () => void  // Only provided for optional items
  className?: string
}

/**
 * ChecklistStepView - Molecule component for guided capture step
 * 
 * Combines StepProgressBar, StepInstructions, CameraCapture, and CaptureButton
 * to create a complete step view for the guided capture flow.
 * 
 * Features:
 * - Step progress indicator at the top
 * - Locale-aware instructions (title, description, tips)
 * - Real camera capture (with fallback to file picker if camera not supported)
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
 *   onCapture={(blob, metadata) => handleCapture(blob, metadata)}
 * />
 * 
 * @example
 * // Optional item (with skip button)
 * <ChecklistStepView
 *   item={optionalItem}
 *   stepNumber={4}
 *   totalSteps={5}
 *   locale="id"
 *   onCapture={(blob, metadata) => handleCapture(blob, metadata)}
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
  // Ref to access CameraCapture's capturePhoto method
  const cameraRef = useRef<CameraCaptureHandle>(null)
  
  // Check if camera is supported
  const cameraSupported = isCameraSupported()

  // Get locale-aware content
  const title = getLocalizedContent(locale, item.title, item.title_id)
  const description = getLocalizedContentNullable(locale, item.description, item.description_id)
  const tips = item.tips

  // Determine if skip button should be shown
  // Skip button is only shown for optional items (is_required=false)
  const showSkipButton = !item.is_required && onSkip !== undefined

  /**
   * Handle capture button click
   * Triggers capture via CameraCapture ref
   */
  const handleCaptureClick = useCallback(async () => {
    if (cameraRef.current?.isReady()) {
      await cameraRef.current.capturePhoto()
    }
  }, [])

  /**
   * Handle capture from CameraCapture component
   * Passes blob and metadata to parent
   */
  const handleCameraCapture = useCallback((blob: Blob, metadata: CaptureMetadata) => {
    onCapture(blob, metadata)
  }, [onCapture])

  /**
   * Handle fallback capture from CameraPlaceholder (file picker)
   * Creates basic metadata for file-based capture
   */
  const handleFallbackCapture = useCallback((blob: Blob) => {
    const metadata: CaptureMetadata = {
      takenAt: new Date(),
      gpsLatitude: null,
      gpsLongitude: null,
      gpsAccuracy: null
    }
    onCapture(blob, metadata)
  }, [onCapture])

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

      {/* Camera Capture - Flexible height */}
      <div className="flex-1 px-4 py-2 min-h-0">
        {cameraSupported ? (
          <CameraCapture
            ref={cameraRef}
            onCapture={handleCameraCapture}
            className="h-full"
          />
        ) : (
          <CameraPlaceholder
            onCapture={handleFallbackCapture}
            isFallback={true}
            className="h-full"
          />
        )}
      </div>

      {/* Action Buttons - Bottom */}
      <div className="px-4 pb-6 pt-4 space-y-3">
        {/* Main Capture Button - Only shown when camera is supported */}
        {cameraSupported && (
          <div className="flex justify-center">
            <CaptureButton 
              onCapture={handleCaptureClick}
              disabled={!cameraRef.current?.isReady()}
              aria-label={`Capture ${title}`}
            />
          </div>
        )}

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
