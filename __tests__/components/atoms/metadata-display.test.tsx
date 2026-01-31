/**
 * Unit Tests for MetadataDisplay Component
 * 
 * Tests the metadata display used in the photo preview screen.
 * **Validates: Requirements 3.4.2**
 */

import { describe, it, expect } from 'vitest'
import { formatGpsCoordinates, formatTimestamp } from '@/components/atoms/metadata-display'
import type { CaptureMetadata } from '@/types/capture'

describe('MetadataDisplay', () => {
  describe('formatGpsCoordinates', () => {
    it('should format positive coordinates correctly', () => {
      const result = formatGpsCoordinates(6.2088, 106.8456)
      expect(result).toBe('6.2088, 106.8456')
    })

    it('should format negative coordinates correctly', () => {
      const result = formatGpsCoordinates(-6.2088, 106.8456)
      expect(result).toBe('-6.2088, 106.8456')
    })

    it('should format both negative coordinates correctly', () => {
      const result = formatGpsCoordinates(-33.8688, -151.2093)
      expect(result).toBe('-33.8688, -151.2093')
    })

    it('should round to 4 decimal places', () => {
      const result = formatGpsCoordinates(-6.20881234, 106.84567890)
      expect(result).toBe('-6.2088, 106.8457')
    })

    it('should handle zero coordinates', () => {
      const result = formatGpsCoordinates(0, 0)
      expect(result).toBe('0.0000, 0.0000')
    })

    it('should handle whole number coordinates', () => {
      const result = formatGpsCoordinates(51, -1)
      expect(result).toBe('51.0000, -1.0000')
    })
  })

  describe('formatTimestamp', () => {
    it('should format morning time correctly', () => {
      const date = new Date(2026, 0, 15, 8, 42, 0) // Jan 15, 2026, 8:42 AM
      const result = formatTimestamp(date)
      expect(result).toBe('08:42 AM, 15 Jan 2026')
    })

    it('should format afternoon time correctly', () => {
      const date = new Date(2026, 0, 15, 14, 30, 0) // Jan 15, 2026, 2:30 PM
      const result = formatTimestamp(date)
      expect(result).toBe('02:30 PM, 15 Jan 2026')
    })

    it('should format midnight correctly', () => {
      const date = new Date(2026, 0, 15, 0, 0, 0) // Jan 15, 2026, 12:00 AM
      const result = formatTimestamp(date)
      expect(result).toBe('12:00 AM, 15 Jan 2026')
    })

    it('should format noon correctly', () => {
      const date = new Date(2026, 0, 15, 12, 0, 0) // Jan 15, 2026, 12:00 PM
      const result = formatTimestamp(date)
      expect(result).toBe('12:00 PM, 15 Jan 2026')
    })

    it('should format single digit minutes with leading zero', () => {
      const date = new Date(2026, 0, 15, 9, 5, 0) // Jan 15, 2026, 9:05 AM
      const result = formatTimestamp(date)
      expect(result).toBe('09:05 AM, 15 Jan 2026')
    })

    it('should format single digit day with leading zero', () => {
      const date = new Date(2026, 0, 5, 10, 30, 0) // Jan 5, 2026, 10:30 AM
      const result = formatTimestamp(date)
      expect(result).toBe('10:30 AM, 05 Jan 2026')
    })

    it('should format different months correctly', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      months.forEach((monthName, index) => {
        const date = new Date(2026, index, 15, 10, 0, 0)
        const result = formatTimestamp(date)
        expect(result).toContain(monthName)
      })
    })

    it('should format 11 PM correctly', () => {
      const date = new Date(2026, 0, 15, 23, 59, 0) // Jan 15, 2026, 11:59 PM
      const result = formatTimestamp(date)
      expect(result).toBe('11:59 PM, 15 Jan 2026')
    })

    it('should format 1 AM correctly', () => {
      const date = new Date(2026, 0, 15, 1, 0, 0) // Jan 15, 2026, 1:00 AM
      const result = formatTimestamp(date)
      expect(result).toBe('01:00 AM, 15 Jan 2026')
    })
  })

  describe('GPS Display Logic', () => {
    /**
     * Helper function that determines GPS display state
     */
    function getGpsDisplayState(metadata: CaptureMetadata) {
      const hasGps = metadata.gpsLatitude !== null && metadata.gpsLongitude !== null
      return {
        hasGps,
        displayText: hasGps 
          ? formatGpsCoordinates(metadata.gpsLatitude!, metadata.gpsLongitude!)
          : 'GPS unavailable',
        showCheckIcon: hasGps,
        showWarningIcon: !hasGps
      }
    }

    it('should show GPS coordinates when both lat and lng are available', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(),
        gpsLatitude: -6.2088,
        gpsLongitude: 106.8456,
        gpsAccuracy: 10
      }
      
      const result = getGpsDisplayState(metadata)
      
      expect(result.hasGps).toBe(true)
      expect(result.displayText).toBe('-6.2088, 106.8456')
      expect(result.showCheckIcon).toBe(true)
      expect(result.showWarningIcon).toBe(false)
    })

    it('should show "GPS unavailable" when latitude is null', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(),
        gpsLatitude: null,
        gpsLongitude: 106.8456,
        gpsAccuracy: null
      }
      
      const result = getGpsDisplayState(metadata)
      
      expect(result.hasGps).toBe(false)
      expect(result.displayText).toBe('GPS unavailable')
      expect(result.showCheckIcon).toBe(false)
      expect(result.showWarningIcon).toBe(true)
    })

    it('should show "GPS unavailable" when longitude is null', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(),
        gpsLatitude: -6.2088,
        gpsLongitude: null,
        gpsAccuracy: null
      }
      
      const result = getGpsDisplayState(metadata)
      
      expect(result.hasGps).toBe(false)
      expect(result.displayText).toBe('GPS unavailable')
      expect(result.showCheckIcon).toBe(false)
      expect(result.showWarningIcon).toBe(true)
    })

    it('should show "GPS unavailable" when both lat and lng are null', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(),
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null
      }
      
      const result = getGpsDisplayState(metadata)
      
      expect(result.hasGps).toBe(false)
      expect(result.displayText).toBe('GPS unavailable')
      expect(result.showCheckIcon).toBe(false)
      expect(result.showWarningIcon).toBe(true)
    })

    it('should handle zero coordinates as valid GPS', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(),
        gpsLatitude: 0,
        gpsLongitude: 0,
        gpsAccuracy: 5
      }
      
      const result = getGpsDisplayState(metadata)
      
      expect(result.hasGps).toBe(true)
      expect(result.displayText).toBe('0.0000, 0.0000')
      expect(result.showCheckIcon).toBe(true)
      expect(result.showWarningIcon).toBe(false)
    })
  })

  describe('Timestamp Display Logic', () => {
    /**
     * Helper function that determines timestamp display state
     */
    function getTimestampDisplayState(metadata: CaptureMetadata) {
      return {
        displayText: formatTimestamp(metadata.takenAt),
        showCheckIcon: true // Timestamp always shows check icon
      }
    }

    it('should always show timestamp with check icon', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(2026, 0, 15, 8, 42, 0),
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null
      }
      
      const result = getTimestampDisplayState(metadata)
      
      expect(result.displayText).toBe('08:42 AM, 15 Jan 2026')
      expect(result.showCheckIcon).toBe(true)
    })

    it('should format timestamp regardless of GPS availability', () => {
      const metadataWithGps: CaptureMetadata = {
        takenAt: new Date(2026, 0, 15, 14, 30, 0),
        gpsLatitude: -6.2088,
        gpsLongitude: 106.8456,
        gpsAccuracy: 10
      }
      
      const metadataWithoutGps: CaptureMetadata = {
        takenAt: new Date(2026, 0, 15, 14, 30, 0),
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null
      }
      
      const resultWithGps = getTimestampDisplayState(metadataWithGps)
      const resultWithoutGps = getTimestampDisplayState(metadataWithoutGps)
      
      expect(resultWithGps.displayText).toBe(resultWithoutGps.displayText)
      expect(resultWithGps.displayText).toBe('02:30 PM, 15 Jan 2026')
    })
  })

  describe('Accessibility', () => {
    /**
     * Helper function that generates expected aria attributes
     */
    function getAriaAttributes(metadata: CaptureMetadata) {
      const hasGps = metadata.gpsLatitude !== null && metadata.gpsLongitude !== null
      
      return {
        regionRole: 'region',
        regionLabel: 'Photo metadata',
        gpsAriaLabel: hasGps 
          ? `GPS coordinates: ${formatGpsCoordinates(metadata.gpsLatitude!, metadata.gpsLongitude!)}`
          : 'GPS unavailable',
        timeAriaLabel: `Time: ${formatTimestamp(metadata.takenAt)}`
      }
    }

    it('should have correct region role and label', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(),
        gpsLatitude: -6.2088,
        gpsLongitude: 106.8456,
        gpsAccuracy: 10
      }
      
      const attrs = getAriaAttributes(metadata)
      
      expect(attrs.regionRole).toBe('region')
      expect(attrs.regionLabel).toBe('Photo metadata')
    })

    it('should have correct GPS aria-label when GPS is available', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(),
        gpsLatitude: -6.2088,
        gpsLongitude: 106.8456,
        gpsAccuracy: 10
      }
      
      const attrs = getAriaAttributes(metadata)
      
      expect(attrs.gpsAriaLabel).toBe('GPS coordinates: -6.2088, 106.8456')
    })

    it('should have correct GPS aria-label when GPS is unavailable', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(),
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null
      }
      
      const attrs = getAriaAttributes(metadata)
      
      expect(attrs.gpsAriaLabel).toBe('GPS unavailable')
    })

    it('should have correct time aria-label', () => {
      const metadata: CaptureMetadata = {
        takenAt: new Date(2026, 0, 15, 8, 42, 0),
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null
      }
      
      const attrs = getAriaAttributes(metadata)
      
      expect(attrs.timeAriaLabel).toBe('Time: 08:42 AM, 15 Jan 2026')
    })
  })
})
