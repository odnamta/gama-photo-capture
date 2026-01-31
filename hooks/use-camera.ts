'use client'

import { useCallback, useRef, useState } from 'react'

// ============================================
// TYPES
// ============================================

/**
 * Camera state machine states
 * 
 * State transitions:
 * - idle → requesting (startCamera called)
 * - requesting → active (permission granted, stream started)
 * - requesting → denied (permission denied)
 * - requesting → error (other error)
 * - active → capturing (captureFrame called)
 * - capturing → active (capture complete)
 * - active → switching (switchCamera called)
 * - switching → active (switch complete)
 * - switching → error (switch failed)
 * - denied → requesting (retry called)
 * - error → requesting (retry called)
 * - any → idle (stopCamera called)
 */
export type CameraState =
  | 'idle'       // Initial state, camera not started
  | 'requesting' // Requesting permission
  | 'active'     // Camera stream active
  | 'capturing'  // Currently capturing a frame
  | 'switching'  // Switching cameras
  | 'denied'     // Permission denied
  | 'error'      // Other error occurred

/**
 * Camera error types mapped from DOMException names
 */
export type CameraErrorType =
  | 'NOT_SUPPORTED'       // getUserMedia not available
  | 'PERMISSION_DENIED'   // User denied camera access
  | 'PERMISSION_DISMISSED' // User dismissed permission prompt
  | 'NOT_FOUND'           // No camera found
  | 'NOT_READABLE'        // Camera in use by another app
  | 'OVERCONSTRAINED'     // Requested constraints not satisfiable
  | 'UNKNOWN'             // Unknown error

/**
 * Camera error with type, message, and permanence indicator
 */
export interface CameraError {
  /** Error type for programmatic handling */
  type: CameraErrorType
  /** Human-readable error message */
  message: string
  /** Whether this error requires user action in settings (vs retry) */
  isPermanent: boolean
}

/**
 * Options for initializing the camera hook
 */
export interface UseCameraOptions {
  /** Initial facing mode (default: 'environment' for rear camera) */
  initialFacingMode?: 'user' | 'environment'
  /** Additional video constraints */
  videoConstraints?: MediaTrackConstraints
}

/**
 * Return type for the useCamera hook
 */
export interface UseCameraReturn {
  /** Current camera state */
  state: CameraState
  /** Active media stream (null if not active) */
  stream: MediaStream | null
  /** Current facing mode */
  facingMode: 'user' | 'environment'
  /** Whether multiple cameras are available */
  hasMultipleCameras: boolean
  /** Current error (null if none) */
  error: CameraError | null

  // Actions
  /** Start the camera */
  startCamera: () => Promise<void>
  /** Stop the camera and release resources */
  stopCamera: () => void
  /** Switch between front and back camera */
  switchCamera: () => Promise<void>
  /** Capture current frame as blob */
  captureFrame: (videoElement: HTMLVideoElement) => Promise<Blob>
  /** Retry after error */
  retry: () => Promise<void>
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default video constraints for 720p minimum resolution
 * These are "ideal" constraints that will fall back gracefully
 */
const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, min: 640 },
  height: { ideal: 720, min: 480 },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if getUserMedia is supported in the current environment
 */
export function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

/**
 * Map DOMException to CameraError
 * 
 * Error name mapping:
 * - NotAllowedError: User denied permission or dismissed prompt
 * - NotFoundError: No camera device found
 * - NotReadableError: Camera is in use by another application
 * - OverconstrainedError: Requested constraints cannot be satisfied
 * - AbortError: Operation was aborted
 * - SecurityError: Security policy prevented access
 */
export function mapMediaError(error: unknown): CameraError {
  // Handle DOMException errors from getUserMedia
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return {
          type: 'PERMISSION_DENIED',
          message: 'Camera access was denied. Please enable camera access in your device settings.',
          isPermanent: true,
        }
      case 'NotFoundError':
        return {
          type: 'NOT_FOUND',
          message: 'No camera found on this device.',
          isPermanent: true,
        }
      case 'NotReadableError':
        return {
          type: 'NOT_READABLE',
          message: 'Camera is in use by another application. Please close other apps using the camera.',
          isPermanent: false,
        }
      case 'OverconstrainedError':
        return {
          type: 'OVERCONSTRAINED',
          message: 'Camera does not support the requested settings. Trying with default settings.',
          isPermanent: false,
        }
      case 'AbortError':
        return {
          type: 'UNKNOWN',
          message: 'Camera access was interrupted. Please try again.',
          isPermanent: false,
        }
      case 'SecurityError':
        return {
          type: 'PERMISSION_DENIED',
          message: 'Camera access is blocked by security policy. Please check your browser settings.',
          isPermanent: true,
        }
      default:
        return {
          type: 'UNKNOWN',
          message: error.message || 'An unknown camera error occurred.',
          isPermanent: false,
        }
    }
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return {
      type: 'UNKNOWN',
      message: error.message || 'An unknown camera error occurred.',
      isPermanent: false,
    }
  }

  // Handle unknown error types
  return {
    type: 'UNKNOWN',
    message: 'An unknown camera error occurred.',
    isPermanent: false,
  }
}

/**
 * Stop all tracks in a MediaStream
 * This releases the camera hardware
 */
export function stopAllTracks(stream: MediaStream | null): void {
  if (!stream) return
  
  const tracks = stream.getTracks()
  tracks.forEach((track) => {
    track.stop()
  })
}

/**
 * Get available video input devices
 * Note: Device labels may be empty until permission is granted
 */
async function getVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!isCameraSupported()) {
    return []
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((device) => device.kind === 'videoinput')
  } catch {
    console.warn('Failed to enumerate video devices')
    return []
  }
}

// ============================================
// HOOK
// ============================================

/**
 * Hook for managing camera stream access
 * 
 * Provides camera access using getUserMedia API with:
 * - Rear camera by default (facingMode: 'environment')
 * - 720p minimum resolution
 * - Proper error handling for permission denied, not found, etc.
 * - Camera switching support
 * - Automatic resource cleanup
 * 
 * @param options - Camera initialization options
 * @returns Camera state and control methods
 * 
 * @example
 * ```tsx
 * const {
 *   state,
 *   stream,
 *   error,
 *   startCamera,
 *   stopCamera,
 *   switchCamera,
 *   captureFrame,
 * } = useCamera()
 * 
 * // Start camera on mount
 * useEffect(() => {
 *   startCamera()
 *   return () => stopCamera()
 * }, [startCamera, stopCamera])
 * 
 * // Capture a frame
 * const blob = await captureFrame(videoRef.current)
 * ```
 * 
 * @see .kiro/specs/v0.4-camera-gps/design.md - Camera State Machine
 */
export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    initialFacingMode = 'environment',
    videoConstraints = {},
  } = options

  // State
  const [state, setState] = useState<CameraState>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [error, setError] = useState<CameraError | null>(null)

  // Refs for cleanup
  const streamRef = useRef<MediaStream | null>(null)

  /**
   * Start the camera with current facing mode
   */
  const startCamera = useCallback(async () => {
    // Check browser support
    if (!isCameraSupported()) {
      const notSupportedError: CameraError = {
        type: 'NOT_SUPPORTED',
        message: 'Camera is not supported in this browser. Please use a modern browser like Chrome or Safari.',
        isPermanent: true,
      }
      setError(notSupportedError)
      setState('error')
      return
    }

    // Set requesting state
    setState('requesting')
    setError(null)

    try {
      // Build constraints with facing mode and resolution
      const constraints: MediaStreamConstraints = {
        video: {
          ...DEFAULT_VIDEO_CONSTRAINTS,
          ...videoConstraints,
          facingMode: facingMode,
        },
        audio: false,
      }

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Store stream in ref for cleanup
      streamRef.current = mediaStream
      setStream(mediaStream)
      setState('active')

      // Check for multiple cameras after permission is granted
      // (device labels are only available after permission)
      const devices = await getVideoInputDevices()
      setHasMultipleCameras(devices.length > 1)

    } catch (err) {
      const cameraError = mapMediaError(err)
      setError(cameraError)
      
      // Set appropriate state based on error type
      if (cameraError.type === 'PERMISSION_DENIED' || cameraError.type === 'PERMISSION_DISMISSED') {
        setState('denied')
      } else {
        setState('error')
      }
    }
  }, [facingMode, videoConstraints])

  /**
   * Stop the camera and release all resources
   */
  const stopCamera = useCallback(() => {
    // Stop all tracks in the current stream
    stopAllTracks(streamRef.current)
    
    // Clear state
    streamRef.current = null
    setStream(null)
    setState('idle')
    setError(null)
  }, [])

  /**
   * Switch between front and back camera
   */
  const switchCamera = useCallback(async () => {
    if (state !== 'active') {
      console.warn('Cannot switch camera when not active')
      return
    }

    setState('switching')

    // Stop current stream
    stopAllTracks(streamRef.current)
    streamRef.current = null
    setStream(null)

    // Toggle facing mode
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacingMode)

    try {
      // Request new stream with opposite facing mode
      const constraints: MediaStreamConstraints = {
        video: {
          ...DEFAULT_VIDEO_CONSTRAINTS,
          ...videoConstraints,
          facingMode: newFacingMode,
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      streamRef.current = mediaStream
      setStream(mediaStream)
      setState('active')

    } catch (err) {
      const cameraError = mapMediaError(err)
      setError(cameraError)
      setState('error')
    }
  }, [state, facingMode, videoConstraints])

  /**
   * Capture the current video frame as a Blob
   * 
   * @param videoElement - The video element displaying the camera stream
   * @returns Promise resolving to the captured image Blob
   */
  const captureFrame = useCallback(async (videoElement: HTMLVideoElement): Promise<Blob> => {
    if (state !== 'active') {
      throw new Error('Cannot capture frame when camera is not active')
    }

    setState('capturing')

    try {
      // Create canvas with video dimensions
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight

      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }
      ctx.drawImage(videoElement, 0, 0)

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result)
            } else {
              reject(new Error('Failed to create blob from canvas'))
            }
          },
          'image/jpeg',
          0.92 // High quality for capture, will be processed later
        )
      })

      setState('active')
      return blob

    } catch (err) {
      setState('active') // Return to active state on error
      throw err
    }
  }, [state])

  /**
   * Retry camera access after an error
   */
  const retry = useCallback(async () => {
    if (state !== 'denied' && state !== 'error') {
      console.warn('Retry is only valid in denied or error state')
      return
    }

    await startCamera()
  }, [state, startCamera])

  return {
    state,
    stream,
    facingMode,
    hasMultipleCameras,
    error,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
    retry,
  }
}

export default useCamera
