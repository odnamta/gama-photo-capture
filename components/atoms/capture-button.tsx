'use client'

import { Camera, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CaptureButtonProps {
  onCapture: () => void
  disabled?: boolean
  isCapturing?: boolean
  className?: string
}

/**
 * CaptureButton - Large circular capture button for guided photo capture
 * 
 * A thumb-friendly circular button designed for mobile photo capture.
 * Features three states:
 * - Default: Ready to capture (camera icon)
 * - Capturing: Processing capture (loading spinner)
 * - Disabled: Cannot capture (grayed out, not clickable)
 * 
 * The button has a minimum touch target of 64x64px (exceeds 48x48px requirement)
 * for comfortable mobile use.
 * 
 * @example
 * // Default state
 * <CaptureButton onCapture={() => handleCapture()} />
 * 
 * @example
 * // Capturing state (shows spinner)
 * <CaptureButton onCapture={() => {}} isCapturing />
 * 
 * @example
 * // Disabled state
 * <CaptureButton onCapture={() => {}} disabled />
 */
export function CaptureButton({
  onCapture,
  disabled = false,
  isCapturing = false,
  className
}: CaptureButtonProps) {
  const isDisabled = disabled || isCapturing

  const handleClick = () => {
    if (!isDisabled) {
      onCapture()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !isDisabled) {
      event.preventDefault()
      onCapture()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      className={cn(
        // Base styles - large circular button
        'relative flex items-center justify-center',
        'w-16 h-16 rounded-full',
        'transition-all duration-200',
        
        // Default state - primary color with shadow
        'bg-primary text-primary-foreground',
        'shadow-lg shadow-primary/25',
        
        // Hover state (when not disabled)
        'hover:bg-primary/90 hover:scale-105 hover:shadow-xl hover:shadow-primary/30',
        
        // Active/pressed state
        'active:scale-95 active:shadow-md',
        
        // Focus state for accessibility
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'disabled:hover:scale-100 disabled:hover:shadow-lg disabled:hover:bg-primary',
        
        // Capturing state - subtle pulse animation
        isCapturing && 'animate-pulse',
        
        className
      )}
      aria-label={
        isCapturing 
          ? 'Capturing photo...' 
          : disabled 
            ? 'Capture disabled' 
            : 'Capture photo'
      }
      aria-busy={isCapturing}
      data-testid="capture-button"
    >
      {/* Outer ring for visual emphasis */}
      <span 
        className={cn(
          'absolute inset-0 rounded-full',
          'border-4 border-primary-foreground/20',
          isCapturing && 'border-primary-foreground/10'
        )}
        aria-hidden="true"
      />
      
      {/* Inner content - icon */}
      {isCapturing ? (
        <Loader2 
          className="h-7 w-7 animate-spin" 
          aria-hidden="true"
        />
      ) : (
        <Camera 
          className="h-7 w-7" 
          aria-hidden="true"
        />
      )}
    </button>
  )
}
