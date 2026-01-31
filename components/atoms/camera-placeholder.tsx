'use client'

import { useRef, useCallback } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraPlaceholderProps {
  onCapture: (blob: Blob) => void
  className?: string
}

/**
 * CameraPlaceholder - Placeholder camera viewfinder for v0.3
 * 
 * Displays a placeholder UI that simulates a camera viewfinder.
 * Includes a hidden file input for selecting images during testing.
 * When an image is selected, calls onCapture with the image blob.
 * 
 * This is a temporary component for v0.3. Real camera integration
 * will be implemented in v0.4.
 * 
 * @example
 * <CameraPlaceholder
 *   onCapture={(blob) => handleCapture(blob)}
 * />
 */
export function CameraPlaceholder({
  onCapture,
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
        aria-label="Tap to capture photo"
        data-testid="camera-placeholder"
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
