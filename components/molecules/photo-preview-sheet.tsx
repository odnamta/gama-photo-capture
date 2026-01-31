'use client'

import { useState } from 'react'
import Image from 'next/image'
import { RotateCcw, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MetadataDisplay } from '@/components/atoms/metadata-display'
import { cn } from '@/lib/utils'
import type { CaptureMetadata } from '@/types/capture'

interface PhotoPreviewSheetProps {
  /** URL of the captured photo to display */
  photoUrl: string
  /** Metadata captured with the photo (timestamp, GPS) */
  metadata: CaptureMetadata
  /** Callback when user confirms the photo, optionally with notes */
  onConfirm: (notes?: string) => void
  /** Callback when user wants to retake the photo */
  onRetake: () => void
  /** Whether the preview sheet is open/visible */
  isOpen: boolean
  /** Optional additional CSS classes */
  className?: string
}

/**
 * PhotoPreviewSheet - Full-screen photo preview with confirm/retake actions
 * 
 * Displays a captured photo in full-screen mode with:
 * - The captured photo image
 * - GPS coordinates and timestamp via MetadataDisplay
 * - Optional notes input field
 * - Retake button to discard and try again
 * - Confirm button to save and continue
 * 
 * This component is used in the guided capture flow after a photo is taken,
 * allowing users to review the photo before confirming or retaking.
 * 
 * **Validates: Requirements 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5**
 * 
 * @example
 * <PhotoPreviewSheet
 *   photoUrl={capturedPhotoUrl}
 *   metadata={{
 *     takenAt: new Date(),
 *     gpsLatitude: -6.2088,
 *     gpsLongitude: 106.8456,
 *     gpsAccuracy: 10
 *   }}
 *   onConfirm={(notes) => handleConfirm(notes)}
 *   onRetake={() => handleRetake()}
 *   isOpen={true}
 * />
 */
export function PhotoPreviewSheet({
  photoUrl,
  metadata,
  onConfirm,
  onRetake,
  isOpen,
  className
}: PhotoPreviewSheetProps) {
  const [notes, setNotes] = useState('')

  // Don't render if not open
  if (!isOpen) {
    return null
  }

  const handleConfirm = () => {
    // Pass notes only if not empty, otherwise undefined
    onConfirm(notes.trim() || undefined)
  }

  const handleRetake = () => {
    // Clear notes when retaking
    setNotes('')
    onRetake()
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-background',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      data-testid="photo-preview-sheet"
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Preview Photo</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRetake}
          aria-label="Close preview"
          data-testid="close-button"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Photo Display - Flexible height */}
      <div className="flex-1 relative min-h-0 bg-muted/30">
        <Image
          src={photoUrl}
          alt="Captured photo preview"
          fill
          className="object-contain"
          priority
          data-testid="preview-image"
        />
      </div>

      {/* Metadata and Actions - Bottom section */}
      <div className="px-4 py-4 space-y-4 border-t bg-background">
        {/* Metadata Display */}
        <MetadataDisplay 
          metadata={metadata} 
          data-testid="metadata-display"
        />

        {/* Notes Input */}
        <div className="space-y-2">
          <label 
            htmlFor="photo-notes" 
            className="text-sm font-medium text-muted-foreground"
          >
            Add note (optional):
          </label>
          <Textarea
            id="photo-notes"
            placeholder="e.g., Minor scratch - pre-existing"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
            rows={2}
            data-testid="notes-input"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleRetake}
            data-testid="retake-button"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={handleConfirm}
            data-testid="confirm-button"
          >
            <Check className="h-4 w-4 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}
