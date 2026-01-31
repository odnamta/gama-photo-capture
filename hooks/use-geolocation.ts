'use client'

import { useCallback, useState } from 'react'

// ============================================
// TYPES
// ============================================

/**
 * GPS coordinates returned by the geolocation hook
 */
export interface GeolocationCoordinates {
  /** Latitude in decimal degrees */
  latitude: number
  /** Longitude in decimal degrees */
  longitude: number
  /** Accuracy in meters */
  accuracy: number
}

/**
 * Options for getting current position
 */
export interface GeolocationOptions {
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number
  /** Whether to use high accuracy mode (default: true) */
  enableHighAccuracy?: boolean
  /** Maximum age of cached position in milliseconds (default: 60000) */
  maximumAge?: number
}

/**
 * Error types for geolocation failures
 */
export type GeolocationErrorType =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED'
  | 'UNKNOWN'

/**
 * Error returned when geolocation fails
 */
export interface GeolocationError {
  type: GeolocationErrorType
  message: string
}

/**
 * Result of a geolocation request
 */
export type GeolocationResult =
  | { success: true; coordinates: GeolocationCoordinates }
  | { success: false; error: GeolocationError }

/**
 * State for the geolocation hook
 */
export interface GeolocationState {
  /** Whether a position request is in progress */
  isLoading: boolean
  /** Last successfully retrieved coordinates */
  coordinates: GeolocationCoordinates | null
  /** Last error that occurred */
  error: GeolocationError | null
}

/**
 * Return type for the useGeolocation hook
 */
export interface UseGeolocationReturn extends GeolocationState {
  /** Get current position with optional timeout */
  getCurrentPosition: (options?: GeolocationOptions) => Promise<GeolocationResult>
  /** Clear the current coordinates and error state */
  clear: () => void
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_OPTIONS: Required<GeolocationOptions> = {
  timeout: 5000,
  enableHighAccuracy: true,
  maximumAge: 60000,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map GeolocationPositionError code to our error type
 */
function mapGeolocationError(error: GeolocationPositionError): GeolocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        type: 'PERMISSION_DENIED',
        message: 'Location permission was denied',
      }
    case error.POSITION_UNAVAILABLE:
      return {
        type: 'POSITION_UNAVAILABLE',
        message: 'Location information is unavailable',
      }
    case error.TIMEOUT:
      return {
        type: 'TIMEOUT',
        message: 'Location request timed out',
      }
    default:
      return {
        type: 'UNKNOWN',
        message: error.message || 'An unknown error occurred',
      }
  }
}

/**
 * Check if geolocation is supported in the current environment
 */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 
    typeof navigator.geolocation !== 'undefined' &&
    navigator.geolocation !== null
}

/**
 * Get current position as a Promise
 * This is a standalone function that can be used outside of React components
 */
export function getCurrentPositionAsync(
  options: GeolocationOptions = {}
): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    // Check if geolocation is supported
    if (!isGeolocationSupported()) {
      resolve({
        success: false,
        error: {
          type: 'NOT_SUPPORTED',
          message: 'Geolocation is not supported in this browser',
        },
      })
      return
    }

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        })
      },
      (error) => {
        resolve({
          success: false,
          error: mapGeolocationError(error),
        })
      },
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      }
    )
  })
}

// ============================================
// HOOK
// ============================================

/**
 * Hook for accessing device geolocation
 * 
 * Provides a simple interface to get the current GPS position with:
 * - Configurable timeout (default 5000ms)
 * - High accuracy mode (default enabled)
 * - Graceful error handling for permission denied, timeout, etc.
 * - Returns null coordinates if unavailable (doesn't block capture)
 * 
 * @returns Geolocation state and methods
 * 
 * @example
 * ```tsx
 * const { getCurrentPosition, coordinates, isLoading, error } = useGeolocation()
 * 
 * // Get position with default options
 * const result = await getCurrentPosition()
 * if (result.success) {
 *   console.log('GPS:', result.coordinates)
 * } else {
 *   console.warn('GPS unavailable:', result.error.message)
 * }
 * 
 * // Get position with custom timeout
 * const result = await getCurrentPosition({ timeout: 10000 })
 * ```
 * 
 * @see .kiro/specs/v0.3-guided-capture/design.md - GPS Error Handling section
 */
export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    isLoading: false,
    coordinates: null,
    error: null,
  })

  /**
   * Get current position with optional configuration
   * Returns coordinates or null if unavailable
   */
  const getCurrentPosition = useCallback(
    async (options: GeolocationOptions = {}): Promise<GeolocationResult> => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      const result = await getCurrentPositionAsync(options)

      if (result.success) {
        setState({
          isLoading: false,
          coordinates: result.coordinates,
          error: null,
        })
      } else {
        // Log warning but don't throw - GPS is optional
        console.warn('GPS unavailable:', result.error.message)
        setState({
          isLoading: false,
          coordinates: null,
          error: result.error,
        })
      }

      return result
    },
    []
  )

  /**
   * Clear the current coordinates and error state
   */
  const clear = useCallback(() => {
    setState({
      isLoading: false,
      coordinates: null,
      error: null,
    })
  }, [])

  return {
    ...state,
    getCurrentPosition,
    clear,
  }
}

export default useGeolocation
