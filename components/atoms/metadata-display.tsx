'use client'

import { Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CaptureMetadata } from '@/types/capture'

interface MetadataDisplayProps {
  metadata: CaptureMetadata
  className?: string
}

/**
 * Formats GPS coordinates for display
 * @param latitude - GPS latitude value
 * @param longitude - GPS longitude value
 * @returns Formatted string like "-6.2088, 106.8456"
 */
function formatGpsCoordinates(latitude: number, longitude: number): string {
  // Format to 4 decimal places for reasonable precision
  const formattedLat = latitude.toFixed(4)
  const formattedLng = longitude.toFixed(4)
  return `${formattedLat}, ${formattedLng}`
}

/**
 * Formats a Date object for display
 * @param date - Date to format
 * @returns Formatted string like "08:42 AM, 15 Jan 2026"
 */
function formatTimestamp(date: Date): string {
  // Format time as HH:MM AM/PM
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  const timeStr = `${displayHours.toString().padStart(2, '0')}:${displayMinutes} ${ampm}`
  
  // Format date as DD Mon YYYY
  const day = date.getDate().toString().padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const dateStr = `${day} ${month} ${year}`
  
  return `${timeStr}, ${dateStr}`
}

/**
 * MetadataDisplay - Displays GPS coordinates and timestamp for captured photos
 * 
 * Shows capture metadata in the photo preview screen:
 * - GPS coordinates formatted as "lat, lng" with checkmark icon
 * - Timestamp formatted as "HH:MM AM/PM, DD Mon YYYY" with checkmark icon
 * - "GPS unavailable" with warning icon if coordinates are null
 * 
 * The component is designed for the preview state of the guided capture flow,
 * providing visual confirmation that metadata was captured with the photo.
 * 
 * @example
 * // With GPS data
 * <MetadataDisplay
 *   metadata={{
 *     takenAt: new Date(),
 *     gpsLatitude: -6.2088,
 *     gpsLongitude: 106.8456,
 *     gpsAccuracy: 10
 *   }}
 * />
 * 
 * @example
 * // Without GPS data
 * <MetadataDisplay
 *   metadata={{
 *     takenAt: new Date(),
 *     gpsLatitude: null,
 *     gpsLongitude: null,
 *     gpsAccuracy: null
 *   }}
 * />
 */
export function MetadataDisplay({
  metadata,
  className
}: MetadataDisplayProps) {
  const hasGps = metadata.gpsLatitude !== null && metadata.gpsLongitude !== null
  
  return (
    <div 
      className={cn('flex flex-col gap-2', className)}
      role="region"
      aria-label="Photo metadata"
    >
      {/* GPS Coordinates */}
      <div 
        className="flex items-center gap-2 text-sm"
        aria-label={hasGps 
          ? `GPS coordinates: ${formatGpsCoordinates(metadata.gpsLatitude!, metadata.gpsLongitude!)}` 
          : 'GPS unavailable'
        }
      >
        {hasGps ? (
          <>
            <Check 
              className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" 
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">GPS:</span>{' '}
              {formatGpsCoordinates(metadata.gpsLatitude!, metadata.gpsLongitude!)}
            </span>
          </>
        ) : (
          <>
            <AlertTriangle 
              className="h-4 w-4 text-amber-500 flex-shrink-0" 
              aria-hidden="true"
            />
            <span className="text-amber-600 dark:text-amber-400">
              GPS unavailable
            </span>
          </>
        )}
      </div>

      {/* Timestamp */}
      <div 
        className="flex items-center gap-2 text-sm"
        aria-label={`Time: ${formatTimestamp(metadata.takenAt)}`}
      >
        <Check 
          className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" 
          aria-hidden="true"
        />
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">Time:</span>{' '}
          {formatTimestamp(metadata.takenAt)}
        </span>
      </div>
    </div>
  )
}

// Export helper functions for testing
export { formatGpsCoordinates, formatTimestamp }
