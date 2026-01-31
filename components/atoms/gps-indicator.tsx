'use client'

import { MapPin, MapPinOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

/**
 * GPS status states for the indicator
 * - acquiring: GPS request is in progress
 * - available: GPS coordinates successfully obtained
 * - unavailable: GPS request failed or timed out
 */
export type GpsStatus = 'acquiring' | 'available' | 'unavailable'

/**
 * Props for the GPSIndicator component
 */
export interface GpsIndicatorProps {
  /** Current GPS status */
  status: GpsStatus
  /** GPS accuracy in meters (only shown when status is 'available') */
  accuracy?: number | null
  /** Additional CSS classes */
  className?: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format GPS accuracy for display
 * @param accuracy - Accuracy in meters
 * @returns Formatted string like "±10m" or "±1.5km"
 */
function formatAccuracy(accuracy: number): string {
  if (accuracy >= 1000) {
    // Show in kilometers for large values
    const km = accuracy / 1000
    return `±${km.toFixed(1)}km`
  }
  // Show in meters, rounded to nearest integer
  return `±${Math.round(accuracy)}m`
}

/**
 * Get the status label for accessibility
 */
function getStatusLabel(status: GpsStatus, accuracy?: number | null): string {
  switch (status) {
    case 'acquiring':
      return 'Acquiring GPS location'
    case 'available':
      return accuracy != null 
        ? `GPS available, accuracy ${formatAccuracy(accuracy)}`
        : 'GPS available'
    case 'unavailable':
      return 'GPS unavailable'
  }
}

// ============================================
// COMPONENT
// ============================================

/**
 * GPSIndicator - Displays GPS lock status during photo capture
 * 
 * Shows one of three states:
 * - **acquiring**: Spinner icon with "GPS..." text while requesting location
 * - **available**: Pin icon with accuracy (e.g., "GPS ±10m") when coordinates obtained
 * - **unavailable**: Crossed-out pin icon with "No GPS" when request failed/timed out
 * 
 * The component is designed to be compact and non-intrusive, typically displayed
 * in the camera capture UI to inform users of GPS status without blocking capture.
 * 
 * @example
 * // GPS request in progress
 * <GpsIndicator status="acquiring" />
 * 
 * @example
 * // GPS successfully obtained with accuracy
 * <GpsIndicator status="available" accuracy={10} />
 * 
 * @example
 * // GPS unavailable
 * <GpsIndicator status="unavailable" />
 * 
 * @validates Requirements 4.5: Display a GPS indicator showing lock status
 */
export function GpsIndicator({
  status,
  accuracy,
  className
}: GpsIndicatorProps) {
  const statusLabel = getStatusLabel(status, accuracy)

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        'text-sm',
        // Status-specific colors
        status === 'acquiring' && 'text-amber-600 dark:text-amber-400',
        status === 'available' && 'text-green-600 dark:text-green-400',
        status === 'unavailable' && 'text-muted-foreground',
        className
      )}
      role="status"
      aria-label={statusLabel}
      data-testid="gps-indicator"
      data-status={status}
    >
      {/* Icon based on status */}
      {status === 'acquiring' && (
        <Loader2 
          className="h-4 w-4 animate-spin" 
          aria-hidden="true"
          data-testid="gps-icon-acquiring"
        />
      )}
      {status === 'available' && (
        <MapPin 
          className="h-4 w-4" 
          aria-hidden="true"
          data-testid="gps-icon-available"
        />
      )}
      {status === 'unavailable' && (
        <MapPinOff 
          className="h-4 w-4" 
          aria-hidden="true"
          data-testid="gps-icon-unavailable"
        />
      )}

      {/* Text label based on status */}
      <span className="font-medium" data-testid="gps-label">
        {status === 'acquiring' && 'GPS...'}
        {status === 'available' && (
          accuracy != null ? `GPS ${formatAccuracy(accuracy)}` : 'GPS'
        )}
        {status === 'unavailable' && 'No GPS'}
      </span>
    </div>
  )
}

// Export helper function for testing
export { formatAccuracy }
