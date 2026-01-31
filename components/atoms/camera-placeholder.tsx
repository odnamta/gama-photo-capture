'use client'

import { useRef, useCallback } from 'react'
import { Camera, ImagePlus, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraPlaceholderProps {
  onCapture: (blob: Blob) => void
  /** Whether this is being used as a fallback when camera is not supported */
  isFallback?: boolean
  className?: string
}

/**
 * CameraPlaceholder - File picker fallback for camera capture
 * 
 * Displays a placeholder UI that allows users to select images from their device.
 * Used as a fallback when:
 * - Camera is not supported (getUserMedia not available)
 * - Camera permission is permanently denied
 * - User prefers to select from gallery
 * 
 * When isFallback is true, shows a message indicating camera is unavailable.
 * 
 * @example
 * // Normal mode (v0.3 style)
 * <CameraPlaceholder
 *   onCapture={(blob) => handleCapture(blob)}
 * />
 * 
 * @example
 * // Fallback mode (camera not supported)
 * <CameraPlaceholder
 *   onCapture={(blob) => handleCapture(blob)}
 *   isFallback={true}
 * />
 * 
 * @validates Requirements 1.5: Handle browsers that don't support getUserMedia
 * @validates Requirements 8.5: Provide fallback for unsupported browsers
 */
export function CameraPlaceholder({
  onCapture,
  isFallback = false,
  className
}: CameraPlaceholderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onCapture(file)
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onCapture])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }, [handleClick])

  return (
    <div className={cn('relative', className)}>
      {/* Hidden file input for image selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        data-testid="camera-file-input"
      />

      {/* Camera viewfinder placeholder */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'w-full aspect-[4/3] rounded-lg',
          'bg-muted/50 border-2 border-dashed border-muted-foreground/30',
          'cursor-pointer transition-all duration-200',
          'hover:bg-muted/70 hover:border-muted-foreground/50',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'active:scale-[0.99]'
        )}
        aria-label={isFallback ? "Camera unavailable, tap to select from gallery" : "Tap to capture photo"}
        data-testid="camera-placeholder"
        data-fallback={isFallback}
      >
        {/* Viewfinder corners */}
        <div className="absolute inset-4 pointer-events-none">
          {/* Top-left corner */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60 rounded-tl" />
          {/* Top-right corner */}
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/60 rounded-tr" />
          {/* Bottom-left corner */}
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/60 rounded-bl" />
          {/* Bottom-right corner */}
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/60 rounded-br" />
        </div>

        {/* Center content */}
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          {isFallback ? (
            <>
              {/* Fallback mode: Show camera unavailable message */}
              <div className="relative">
                <Camera 
                  className="h-12 w-12 text-muted-foreground/40" 
                  aria-hidden="true"
                />
                <AlertCircle 
                  className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-500" 
                  aria-hidden="true"
                />
              </div>
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Camera unavailable
              </span>
              <span className="text-xs text-muted-foreground/70">
                Tap to select from gallery
              </span>
            </>
          ) : (
            <>
              {/* Normal mode: Show tap to capture */}
              <div className="relative">
                <Camera 
                  className="h-12 w-12 text-muted-foreground/60" 
                  aria-hidden="true"
                />
                <ImagePlus 
                  className="absolute -bottom-1 -right-1 h-5 w-5 text-primary/70" 
                  aria-hidden="true"
                />
              </div>
              <span className="text-sm font-medium">
                Tap to capture
              </span>
              <span className="text-xs text-muted-foreground/70">
                or select from gallery
              </span>
            </>
          )}
        </div>

        {/* Simulated camera grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {/* Horizontal lines */}
          <div className="absolute top-1/3 left-0 right-0 h-px bg-muted-foreground" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-muted-foreground" />
          {/* Vertical lines */}
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-muted-foreground" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-muted-foreground" />
        </div>
      </div>
    </div>
  )
}
