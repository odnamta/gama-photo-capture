'use client'

import { useCallback, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChecklistStepView } from '@/components/molecules/checklist-step-view'
import { PhotoPreviewSheet } from '@/components/molecules/photo-preview-sheet'
import { CaptureCompleteSummary } from '@/components/molecules/capture-complete-summary'
import { useCaptureSession } from '@/hooks/use-capture-session'
import { useGeolocation } from '@/hooks/use-geolocation'
import { savePhotoToIndexedDB } from '@/lib/offline/db'
import { cn } from '@/lib/utils'
import type { PhotoChecklistItem, JobStage } from '@/types/job'
import type { CapturedPhoto } from '@/components/atoms/photo-thumbnail-grid'
import type { PreviewPhotoData, CaptureMetadata } from '@/types/capture'

// ============================================
// TYPES
// ============================================

/**
 * Existing photo data for session resume
 */
export interface ExistingPhoto {
  checklistItemId: string
  thumbnailUrl: string
}

/**
 * Props for the GuidedCaptureSession component
 */
export interface GuidedCaptureSessionProps {
  /** Job order ID this session is for */
  jobId: string
  /** Stage being captured (job_start, in_transit, job_end) */
  stage: JobStage
  /** Ordered checklist items for this stage */
  checklist: PhotoChecklistItem[]
  /** Existing photos for session resume */
  existingPhotos: ExistingPhoto[]
  /** User's locale preference */
  locale: 'en' | 'id'
  /** Callback when capture session is complete */
  onComplete: () => void
  /** Callback when user exits the session */
  onExit: () => void
  /** Optional additional CSS classes */
  className?: string
}

// ============================================
// EXIT CONFIRM DIALOG
// ============================================

interface ExitConfirmDialogProps {
  isOpen: boolean
  capturedCount: number
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Simple exit confirmation dialog
 * Warns user about unsaved captures before exiting
 */
function ExitConfirmDialog({
  isOpen,
  capturedCount,
  onConfirm,
  onCancel
}: ExitConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
      aria-describedby="exit-dialog-description"
      data-testid="exit-confirm-dialog"
    >
      <div className="mx-4 w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 
              id="exit-dialog-title" 
              className="text-lg font-semibold"
              data-testid="exit-dialog-title"
            >
              Exit Capture Session?
            </h2>
            <p 
              id="exit-dialog-description" 
              className="mt-2 text-sm text-muted-foreground"
              data-testid="exit-dialog-description"
            >
              {capturedCount > 0
                ? `You have ${capturedCount} photo${capturedCount !== 1 ? 's' : ''} captured in this session. Your progress will be saved.`
                : 'Are you sure you want to exit? You can resume this session later.'}
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            data-testid="exit-cancel-button"
          >
            Continue Capture
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            data-testid="exit-confirm-button"
          >
            Exit
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * GuidedCaptureSession - Orchestrates the guided photo capture flow
 * 
 * This organism component manages the complete capture session experience:
 * 1. Shows ChecklistStepView for current checklist item
 * 2. On capture, gets GPS and transitions to PhotoPreviewSheet
 * 3. On confirm, saves to IndexedDB and advances to next item
 * 4. On retake, returns to capture view
 * 5. On skip (optional items), advances without saving
 * 6. When complete, shows CaptureCompleteSummary
 * 7. On done, calls onComplete callback
 * 
 * Handles exit with confirmation dialog when user has unsaved captures.
 * 
 * **Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6**
 * 
 * @example
 * <GuidedCaptureSession
 *   jobId="job-123"
 *   stage="job_start"
 *   checklist={checklistItems}
 *   existingPhotos={[]}
 *   locale="en"
 *   onComplete={() => router.push('/jobs/123')}
 *   onExit={() => router.push('/jobs/123')}
 * />
 */
export function GuidedCaptureSession({
  jobId,
  stage,
  checklist,
  existingPhotos,
  locale,
  onComplete,
  onExit,
  className
}: GuidedCaptureSessionProps) {
  // Exit confirmation dialog state
  const [showExitDialog, setShowExitDialog] = useState(false)
  
  // Geolocation hook for GPS capture
  const { getCurrentPosition } = useGeolocation()
  
  // Capture session state management
  const existingPhotoIds = existingPhotos.map(p => p.checklistItemId)
  const session = useCaptureSession({
    jobId,
    stage,
    checklist,
    existingPhotoIds
  })

  const {
    state,
    currentItem,
    canSkip,
    progress,
    capture,
    confirm,
    retake,
    skip
  } = session

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Handle photo capture from camera placeholder
   * Gets GPS coordinates and transitions to preview state
   */
  const handleCapture = useCallback(async () => {
    // Create a placeholder blob for v0.3 (real camera in v0.4)
    // In production, this would come from the camera
    const placeholderBlob = await createPlaceholderBlob()
    
    // Get GPS coordinates (non-blocking)
    const gpsResult = await getCurrentPosition({ timeout: 5000 })
    
    // Create capture metadata
    const metadata: CaptureMetadata = {
      takenAt: new Date(),
      gpsLatitude: gpsResult.success ? gpsResult.coordinates.latitude : null,
      gpsLongitude: gpsResult.success ? gpsResult.coordinates.longitude : null,
      gpsAccuracy: gpsResult.success ? gpsResult.coordinates.accuracy : null
    }
    
    // Create blob URL for preview
    const blobUrl = URL.createObjectURL(placeholderBlob)
    
    // Create preview photo data
    const previewPhoto: PreviewPhotoData = {
      blobUrl,
      blob: placeholderBlob,
      metadata
    }
    
    // Transition to preview state
    capture(previewPhoto)
  }, [capture, getCurrentPosition])

  /**
   * Handle photo confirmation
   * Saves to IndexedDB and advances to next item
   */
  const handleConfirm = useCallback(async (notes?: string) => {
    if (!state.previewPhoto || !currentItem) return
    
    // Save to IndexedDB for offline support
    try {
      await savePhotoToIndexedDB({
        capturedPhoto: {
          checklistItemId: currentItem.id,
          blob: state.previewPhoto.blob,
          metadata: state.previewPhoto.metadata,
          notes: notes ?? null
        },
        jobId,
        stage,
        photoType: currentItem.photo_type
      })
    } catch (error) {
      console.error('Failed to save photo to IndexedDB:', error)
      // Continue anyway - the photo is still in memory
    }
    
    // Confirm in session state (saves and advances)
    confirm(notes)
  }, [state.previewPhoto, currentItem, jobId, stage, confirm])

  /**
   * Handle photo retake
   * Returns to capture view without saving
   */
  const handleRetake = useCallback(() => {
    retake()
  }, [retake])

  /**
   * Handle skip for optional items
   * Advances without capturing
   */
  const handleSkip = useCallback(() => {
    skip()
  }, [skip])

  /**
   * Handle exit button click
   * Shows confirmation dialog if there are captures
   */
  const handleExitClick = useCallback(() => {
    // Always show confirmation dialog for better UX
    setShowExitDialog(true)
  }, [])

  /**
   * Handle exit confirmation
   * Exits the session
   */
  const handleExitConfirm = useCallback(() => {
    setShowExitDialog(false)
    onExit()
  }, [onExit])

  /**
   * Handle exit cancel
   * Closes the dialog and continues capture
   */
  const handleExitCancel = useCallback(() => {
    setShowExitDialog(false)
  }, [])

  /**
   * Handle done button in completion summary
   * Calls onComplete callback
   */
  const handleDone = useCallback(() => {
    onComplete()
  }, [onComplete])

  // ============================================
  // DERIVED DATA
  // ============================================

  /**
   * Build captures array for completion summary
   * Combines session captures with existing photos
   */
  const buildCapturesForSummary = useCallback((): CapturedPhoto[] => {
    const captures: CapturedPhoto[] = []
    
    // Add captured photos from this session
    state.captures.forEach((photo, checklistItemId) => {
      const item = checklist.find(c => c.id === checklistItemId)
      if (item) {
        captures.push({
          checklistItemId,
          title: item.title,
          thumbnailUrl: photo.blobUrl,
          status: 'captured'
        })
      }
    })
    
    // Add existing photos (from previous sessions)
    existingPhotos.forEach(existing => {
      // Don't add if already captured in this session
      if (!state.captures.has(existing.checklistItemId)) {
        const item = checklist.find(c => c.id === existing.checklistItemId)
        if (item) {
          captures.push({
            checklistItemId: existing.checklistItemId,
            title: item.title,
            thumbnailUrl: existing.thumbnailUrl,
            status: 'captured'
          })
        }
      }
    })
    
    return captures
  }, [state.captures, checklist, existingPhotos])

  /**
   * Get skipped items for completion summary
   */
  const getSkippedItems = useCallback((): PhotoChecklistItem[] => {
    return checklist.filter(item => state.skippedItems.has(item.id))
  }, [checklist, state.skippedItems])

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background',
        className
      )}
      data-testid="guided-capture-session"
    >
      {/* Header with Exit Button */}
      {state.viewState !== 'complete' && (
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h1 className="text-lg font-semibold" data-testid="session-title">
            {getStageTitle(stage, locale)}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExitClick}
            aria-label="Exit capture session"
            data-testid="exit-button"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        {/* Capture View */}
        {state.viewState === 'capture' && currentItem && (
          <ChecklistStepView
            item={currentItem}
            stepNumber={progress.current}
            totalSteps={progress.total}
            locale={locale}
            onCapture={handleCapture}
            onSkip={canSkip ? handleSkip : undefined}
            className="h-full"
            data-testid="checklist-step-view"
          />
        )}

        {/* Preview View */}
        {state.viewState === 'preview' && state.previewPhoto && (
          <PhotoPreviewSheet
            photoUrl={state.previewPhoto.blobUrl}
            metadata={state.previewPhoto.metadata}
            onConfirm={handleConfirm}
            onRetake={handleRetake}
            isOpen={true}
            data-testid="photo-preview-sheet"
          />
        )}

        {/* Complete View */}
        {state.viewState === 'complete' && (
          <CaptureCompleteSummary
            captures={buildCapturesForSummary()}
            skippedItems={getSkippedItems()}
            onDone={handleDone}
            className="h-full"
            data-testid="capture-complete-summary"
          />
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      <ExitConfirmDialog
        isOpen={showExitDialog}
        capturedCount={state.captures.size}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
      />
    </div>
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get localized stage title
 */
function getStageTitle(stage: JobStage, locale: 'en' | 'id'): string {
  const titles: Record<JobStage, { en: string; id: string }> = {
    job_start: { en: 'Job Start', id: 'Mulai Pekerjaan' },
    in_transit: { en: 'In Transit', id: 'Dalam Perjalanan' },
    job_end: { en: 'Job End', id: 'Selesai Pekerjaan' }
  }
  return titles[stage][locale]
}

/**
 * Create a placeholder blob for v0.3 testing
 * In v0.4, this will be replaced with actual camera capture
 */
async function createPlaceholderBlob(): Promise<Blob> {
  // Create a simple gray placeholder image using canvas
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Fill with gray background
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Add placeholder text
    ctx.fillStyle = '#6b7280'
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Photo Placeholder', canvas.width / 2, canvas.height / 2 - 20)
    ctx.font = '16px sans-serif'
    ctx.fillText('(Camera in v0.4)', canvas.width / 2, canvas.height / 2 + 20)
    
    // Add timestamp
    ctx.font = '12px sans-serif'
    ctx.fillText(new Date().toLocaleString(), canvas.width / 2, canvas.height / 2 + 50)
  }
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob(['placeholder'], { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.8)
  })
}

export default GuidedCaptureSession
