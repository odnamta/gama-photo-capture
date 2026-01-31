'use client'

import { AlertCircle, Camera, CameraOff, RefreshCw, Settings, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { CameraError } from '@/hooks/use-camera'

interface CameraPermissionErrorProps {
  /** Error details */
  error: CameraError
  /** Callback to retry camera access */
  onRetry: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Get the appropriate icon for each error type
 */
function getErrorIcon(errorType: CameraError['type']) {
  switch (errorType) {
    case 'NOT_SUPPORTED':
      return CameraOff
    case 'PERMISSION_DENIED':
    case 'PERMISSION_DISMISSED':
      return XCircle
    case 'NOT_FOUND':
      return CameraOff
    case 'NOT_READABLE':
      return Camera
    case 'OVERCONSTRAINED':
      return AlertCircle
    case 'UNKNOWN':
    default:
      return AlertCircle
  }
}

/**
 * Get the error title based on error type
 */
function getErrorTitle(errorType: CameraError['type']): string {
  switch (errorType) {
    case 'NOT_SUPPORTED':
      return 'Camera Not Supported'
    case 'PERMISSION_DENIED':
      return 'Camera Access Denied'
    case 'PERMISSION_DISMISSED':
      return 'Permission Required'
    case 'NOT_FOUND':
      return 'No Camera Found'
    case 'NOT_READABLE':
      return 'Camera Unavailable'
    case 'OVERCONSTRAINED':
      return 'Camera Settings Error'
    case 'UNKNOWN':
    default:
      return 'Camera Error'
  }
}

/**
 * Get instructions for enabling camera based on error type
 */
function getInstructions(errorType: CameraError['type'], isPermanent: boolean): string {
  switch (errorType) {
    case 'NOT_SUPPORTED':
      return 'Your browser does not support camera access. Please use a modern browser like Chrome, Safari, or Firefox.'
    case 'PERMISSION_DENIED':
      return 'To enable camera access, go to your device settings and allow camera permissions for this app.'
    case 'PERMISSION_DISMISSED':
      return 'Camera permission is required to capture photos. Please tap "Try Again" to grant access.'
    case 'NOT_FOUND':
      return 'No camera was detected on your device. Please ensure your device has a camera and try again.'
    case 'NOT_READABLE':
      return 'The camera is currently in use by another application. Please close other apps using the camera and try again.'
    case 'OVERCONSTRAINED':
      return 'The camera does not support the required settings. Tap "Try Again" to use default settings.'
    case 'UNKNOWN':
    default:
      return isPermanent 
        ? 'An error occurred while accessing the camera. Please check your device settings.'
        : 'An error occurred while accessing the camera. Please try again.'
  }
}

/**
 * CameraPermissionError - Error display component for camera permission issues
 * 
 * Displays a user-friendly error message when camera access fails, with:
 * - Error-specific icon and title
 * - Clear explanation of the issue
 * - Instructions for resolving the problem
 * - "Try Again" button to re-request permission
 * - Settings link for permanent denials (iOS/Android)
 * 
 * @example
 * // Permission denied error
 * <CameraPermissionError
 *   error={{
 *     type: 'PERMISSION_DENIED',
 *     message: 'Camera access was denied.',
 *     isPermanent: true
 *   }}
 *   onRetry={() => startCamera()}
 * />
 * 
 * @example
 * // Camera in use error (non-permanent)
 * <CameraPermissionError
 *   error={{
 *     type: 'NOT_READABLE',
 *     message: 'Camera is in use by another app.',
 *     isPermanent: false
 *   }}
 *   onRetry={() => startCamera()}
 * />
 * 
 * @validates Requirements 5.1: Display clear error message explaining the issue
 * @validates Requirements 5.2: Provide instructions for enabling camera access
 * @validates Requirements 5.3: Display a "Try Again" button to re-request permission
 * @validates Requirements 5.4: Show a link to device settings if permanently denied
 */
export function CameraPermissionError({
  error,
  onRetry,
  className
}: CameraPermissionErrorProps) {
  const Icon = getErrorIcon(error.type)
  const title = getErrorTitle(error.type)
  const instructions = getInstructions(error.type, error.isPermanent)

  // Determine if we should show the settings link
  // Show for permanent denials where user needs to change device settings
  const showSettingsLink = error.isPermanent && 
    (error.type === 'PERMISSION_DENIED' || error.type === 'NOT_SUPPORTED')

  return (
    <div
      className={cn(
        // Container styles - centered content with padding
        'flex flex-col items-center justify-center',
        'w-full h-full min-h-[200px]',
        'p-6 text-center',
        'bg-muted/50 rounded-lg',
        className
      )}
      role="alert"
      aria-live="polite"
      data-testid="camera-permission-error"
    >
      {/* Error Icon */}
      <div 
        className={cn(
          'flex items-center justify-center',
          'w-16 h-16 rounded-full',
          'bg-destructive/10 text-destructive',
          'mb-4'
        )}
        aria-hidden="true"
      >
        <Icon className="h-8 w-8" />
      </div>

      {/* Error Title */}
      <h3 
        className="text-lg font-semibold text-foreground mb-2"
        data-testid="error-title"
      >
        {title}
      </h3>

      {/* Error Message (from error object) */}
      <p 
        className="text-sm text-muted-foreground mb-2"
        data-testid="error-message"
      >
        {error.message}
      </p>

      {/* Instructions */}
      <p 
        className="text-sm text-muted-foreground mb-6 max-w-xs"
        data-testid="error-instructions"
      >
        {instructions}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {/* Try Again Button */}
        <Button
          type="button"
          variant="default"
          onClick={onRetry}
          className="w-full"
          data-testid="retry-button"
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Try Again
        </Button>

        {/* Settings Link - shown for permanent denials */}
        {showSettingsLink && (
          <Button
            type="button"
            variant="outline"
            asChild
            className="w-full"
            data-testid="settings-link"
          >
            <a
              href="#settings"
              onClick={(e) => {
                e.preventDefault()
                // On mobile, we can't directly open settings, but we can provide guidance
                // This is a placeholder - actual implementation depends on platform
                // For now, we'll show an alert with instructions
                if (typeof window !== 'undefined') {
                  // Try to detect platform for more specific instructions
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                  const isAndroid = /Android/.test(navigator.userAgent)
                  
                  let settingsInstructions = 'Please open your device settings to enable camera access for this app.'
                  
                  if (isIOS) {
                    settingsInstructions = 'Go to Settings > Safari > Camera and select "Allow".'
                  } else if (isAndroid) {
                    settingsInstructions = 'Go to Settings > Apps > Browser > Permissions > Camera and enable it.'
                  }
                  
                  // Use alert as a simple cross-platform solution
                  // In a production app, this could be a modal or toast
                  alert(settingsInstructions)
                }
              }}
              aria-label="Open device settings instructions"
            >
              <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
              Open Settings
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
