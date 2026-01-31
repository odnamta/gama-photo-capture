'use client'

import { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { CameraPreview } from '@/components/atoms/camera-preview'
import { CameraSwitchButton } from '@/components/atoms/camera-switch-button'
import { GpsIndicator, type GpsStatus } from '@/components/atoms/gps-indicator'
import { CameraPermissionError } from '@/components/atoms/camera-permission-error'
import { useCamera, type CameraError } from '@/hooks/use-camera'
import { useGeolocation } from '@/hooks/use-geolocation'
import { processVideoFrame } from '@/lib/utils/photo-processor'
import type { CaptureMetadata } from '@/types/capture'

// ============================================
// TYPES
// ============================================

/**
 * Props for the CameraCapture component
 */
export interface CameraCaptureProps {
  /** Callback when photo is captured */
  onCapture: (blob: Blob, metadata: CaptureMetadata) => void
  /** Callback when camera error occurs */
  onError?: (error: CameraError) => void
  /** Whether capture is currently disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Ref handle for CameraCapture component
 * Allows parent components to trigger capture imperatively
 */
export interface CameraCaptureHandle {
  /** Capture a photo from the current video frame */
  capturePhoto: () => Promise<void>
  /** Check if camera is ready for capture */
  isReady: () => boolean
}

// ============================================
// CONSTANTS
// ============================================

/** GPS timeout in milliseconds */
const GPS_TIMEOUT_MS = 5000

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map geolocation state to GPS indicator status
 */
function getGpsStatus(
  isLoading: boolean,
  hasCoordinates: boolean,
  hasError: boolean
): GpsStatus {
  if (isLoading) {
    return 'acquiring'
  }
  if (hasCoordinates) {
    return 'available'
  }
  if (hasError) {
    return 'unavailable'
  }
  // Default to acquiring if no state yet
  return 'acquiring'
}

// ============================================
// COMPONENT
// ============================================

/**
 * CameraCapture - Real camera capture organism component
 * 
 * Integrates the useCamera hook with UI components to provide a complete
 * camera capture experience. Replaces the CameraPlaceholder from v0.3.
 * 
 * Features:
 * - Live camera preview with CameraPreview component
 * - Camera switching with CameraSwitchButton (when multiple cameras available)
 * - GPS status indicator with GpsIndicator
 * - Permission error handling with CameraPermissionError
 * - Automatic camera start on mount
 * - Automatic cleanup on unmount
 * 
 * The component exposes a `capturePhoto` method via ref that can be called
 * by parent components (like CaptureButton) to trigger photo capture.
 * 
 * @example
 * const cameraRef = useRef<CameraCaptureHandle>(null)
 * 
 * <CameraCapture
 *   ref={cameraRef}
 *   onCapture={(blob, metadata) => {
 *     console.log('Photo captured:', blob.size, metadata)
 *   }}
 *   onError={(error) => {
 *     console.error('Camera error:', error)
 *   }}
 * />
 * 
 * // Trigger capture from parent
 * await cameraRef.current?.capturePhoto()
 * 
 * @validates Requirements 1.1: Request camera access using navigator.mediaDevices.getUserMedia
 * @validates Requirements 1.2: Request rear camera by default using facingMode: 'environment'
 * @validates Requirements 1.3: Display live video stream in a video element
 * @validates Requirements 4.1: Request GPS coordinates using the existing GPS_Capture hook
 * @validates Requirements 5.1: Display clear error message when camera permission is denied
 * @validates Requirements 5.6: Update UI immediately when permission state changes
 */
export const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(
  function CameraCapture(
    {
      onCapture,
      onError,
      disabled = false,
      className
    },
    ref
  ) {
    // Container ref for accessing video element
    const containerRef = useRef<HTMLDivElement>(null)

    // Camera hook for stream management
    const {
      state: cameraState,
      stream,
      facingMode,
      hasMultipleCameras,
      error: cameraError,
      startCamera,
      stopCamera,
      switchCamera,
      retry
    } = useCamera({
      initialFacingMode: 'environment'
    })

    // Geolocation hook for GPS capture
    const {
      isLoading: gpsLoading,
      coordinates: gpsCoordinates,
      error: gpsError,
      getCurrentPosition
    } = useGeolocation()

    // ============================================
    // LIFECYCLE
    // ============================================

    /**
     * Start camera on mount, stop on unmount
     * Validates: Requirements 1.1, 1.4
     */
    useEffect(() => {
      startCamera()
      
      // Cleanup: stop camera and release resources
      return () => {
        stopCamera()
      }
    }, [startCamera, stopCamera])

    /**
     * Notify parent of camera errors
     */
    useEffect(() => {
      if (cameraError && onError) {
        onError(cameraError)
      }
    }, [cameraError, onError])

    /**
     * Start GPS acquisition when camera becomes active
     * This pre-fetches GPS so it's ready when user captures
     */
    useEffect(() => {
      if (cameraState === 'active') {
        // Start GPS acquisition in background
        getCurrentPosition({ timeout: GPS_TIMEOUT_MS })
      }
    }, [cameraState, getCurrentPosition])

    // ============================================
    // HANDLERS
    // ============================================

    /**
     * Handle camera switch button click
     */
    const handleSwitchCamera = useCallback(async () => {
      await switchCamera()
    }, [switchCamera])

    /**
     * Handle retry button click in error state
     */
    const handleRetry = useCallback(async () => {
      await retry()
    }, [retry])

    /**
     * Capture a photo from the current video frame
     * Called by parent component via ref
     * 
     * @validates Requirements 3.1, 3.5, 4.1, 4.2, 4.3, 4.4
     */
    const capturePhoto = useCallback(async () => {
      // Get video element from the container
      const video = containerRef.current?.querySelector('video')
      if (!video) {
        console.error('Video element not available')
        return
      }

      if (cameraState !== 'active') {
        console.warn('Cannot capture when camera is not active')
        return
      }

      try {
        // Process video frame (resize and compress)
        const result = await processVideoFrame(video, {
          maxDimension: 2048,
          quality: 0.8
        })

        // Get GPS coordinates (with timeout, non-blocking)
        // If we already have coordinates from pre-fetch, use those
        let gpsResult = gpsCoordinates
        if (!gpsResult) {
          const freshGps = await getCurrentPosition({ timeout: GPS_TIMEOUT_MS })
          if (freshGps.success) {
            gpsResult = freshGps.coordinates
          }
        }

        // Create capture metadata
        const metadata: CaptureMetadata = {
          takenAt: new Date(),
          gpsLatitude: gpsResult?.latitude ?? null,
          gpsLongitude: gpsResult?.longitude ?? null,
          gpsAccuracy: gpsResult?.accuracy ?? null
        }

        // Call onCapture callback with blob and metadata
        onCapture(result.blob, metadata)

      } catch (error) {
        console.error('Failed to capture photo:', error)
        // Don't throw - let parent handle via onError if needed
        if (onError && error instanceof Error) {
          onError({
            type: 'UNKNOWN',
            message: error.message,
            isPermanent: false
          })
        }
      }
    }, [cameraState, gpsCoordinates, getCurrentPosition, onCapture, onError])

    /**
     * Check if camera is ready for capture
     */
    const isReady = useCallback(() => {
      return cameraState === 'active' && !disabled
    }, [cameraState, disabled])

    // ============================================
    // IMPERATIVE HANDLE
    // ============================================

    /**
     * Expose capturePhoto and isReady methods to parent via ref
     */
    useImperativeHandle(ref, () => ({
      capturePhoto,
      isReady
    }), [capturePhoto, isReady])

    // ============================================
    // DERIVED STATE
    // ============================================

    // Determine if camera is in loading state
    const isLoading = cameraState === 'idle' || cameraState === 'requesting'
    
    // Determine if camera is in error state
    const isError = cameraState === 'denied' || cameraState === 'error'
    
    // Determine if camera switch is in progress
    const isSwitching = cameraState === 'switching'

    // Calculate GPS status for indicator
    const gpsStatus = getGpsStatus(
      gpsLoading,
      gpsCoordinates !== null,
      gpsError !== null
    )

    // ============================================
    // RENDER
    // ============================================

    // Show error state if camera permission denied or other error
    if (isError && cameraError) {
      return (
        <div
          ref={containerRef}
          className={cn(
            'relative w-full aspect-[4/3]',
            className
          )}
          data-testid="camera-capture"
          data-state="error"
        >
          <CameraPermissionError
            error={cameraError}
            onRetry={handleRetry}
            className="h-full"
          />
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative w-full',
          className
        )}
        data-testid="camera-capture"
        data-state={cameraState}
      >
        {/* Camera Preview */}
        <CameraPreview
          stream={stream}
          isLoading={isLoading}
          facingMode={facingMode}
        />

        {/* Overlay Controls - Only show when camera is active */}
        {cameraState === 'active' && (
          <>
            {/* Camera Switch Button - Top Right */}
            <div className="absolute top-3 right-3">
              <CameraSwitchButton
                onSwitch={handleSwitchCamera}
                isSwitching={isSwitching}
                isVisible={hasMultipleCameras}
              />
            </div>

            {/* GPS Indicator - Top Left */}
            <div 
              className={cn(
                'absolute top-3 left-3',
                'px-2 py-1 rounded-full',
                'bg-black/50 backdrop-blur-sm'
              )}
            >
              <GpsIndicator
                status={gpsStatus}
                accuracy={gpsCoordinates?.accuracy}
                className="text-white"
              />
            </div>
          </>
        )}
      </div>
    )
  }
)

export default CameraCapture
