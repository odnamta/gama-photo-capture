'use client'

import { RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CameraSwitchButtonProps {
  /** Callback when switch is requested */
  onSwitch: () => void
  /** Whether switching is in progress */
  isSwitching: boolean
  /** Whether button should be visible */
  isVisible: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * CameraSwitchButton - Button to switch between front and back cameras
 * 
 * A circular icon button that allows users to toggle between device cameras.
 * The button is only visible when multiple cameras are available (isVisible=true).
 * 
 * Features:
 * - Conditional visibility based on hasMultipleCameras
 * - Disabled state during camera switching
 * - Loading spinner when switching is in progress
 * - Accessible with proper aria labels
 * 
 * @example
 * // Visible and ready to switch
 * <CameraSwitchButton
 *   onSwitch={() => switchCamera()}
 *   isSwitching={false}
 *   isVisible={true}
 * />
 * 
 * @example
 * // Switching in progress
 * <CameraSwitchButton
 *   onSwitch={() => {}}
 *   isSwitching={true}
 *   isVisible={true}
 * />
 * 
 * @example
 * // Hidden (only one camera available)
 * <CameraSwitchButton
 *   onSwitch={() => {}}
 *   isSwitching={false}
 *   isVisible={false}
 * />
 * 
 * @validates Requirements 2.1: Display camera switch button when multiple cameras are available
 * @validates Requirements 2.3: Hide camera switch button if only one camera is available
 */
export function CameraSwitchButton({
  onSwitch,
  isSwitching,
  isVisible,
  className
}: CameraSwitchButtonProps) {
  // Don't render if not visible (only one camera available)
  if (!isVisible) {
    return null
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={onSwitch}
      disabled={isSwitching}
      className={cn(
        // Base styles - circular button with semi-transparent background
        'rounded-full',
        'bg-black/50 hover:bg-black/70',
        'text-white',
        'backdrop-blur-sm',
        'border-0',
        
        // Transition for smooth state changes
        'transition-all duration-200',
        
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        className
      )}
      aria-label={isSwitching ? 'Switching camera...' : 'Switch camera'}
      aria-busy={isSwitching}
      data-testid="camera-switch-button"
    >
      {isSwitching ? (
        <Loader2 
          className="h-5 w-5 animate-spin" 
          aria-hidden="true"
        />
      ) : (
        <RefreshCw 
          className="h-5 w-5" 
          aria-hidden="true"
        />
      )}
    </Button>
  )
}
