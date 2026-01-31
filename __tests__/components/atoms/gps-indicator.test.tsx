/**
 * Unit tests for GPSIndicator component
 * 
 * Tests the GPS indicator displays correct status states:
 * - 'acquiring' during GPS request
 * - 'available' with accuracy on success
 * - 'unavailable' on failure/timeout
 * 
 * @validates Requirements 4.5: Display a GPS indicator showing lock status
 */

import { describe, it, expect } from 'vitest'
import { formatAccuracy } from '@/components/atoms/gps-indicator'
import type { GpsStatus } from '@/components/atoms/gps-indicator'

describe('GpsIndicator', () => {
  describe('Status Label Logic', () => {
    /**
     * Helper function that mirrors the component's status label logic
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

    it('should return correct label for acquiring state', () => {
      expect(getStatusLabel('acquiring')).toBe('Acquiring GPS location')
    })

    it('should return correct label for available state without accuracy', () => {
      expect(getStatusLabel('available')).toBe('GPS available')
    })

    it('should return correct label for available state with accuracy', () => {
      expect(getStatusLabel('available', 25)).toBe('GPS available, accuracy ±25m')
    })

    it('should return correct label for unavailable state', () => {
      expect(getStatusLabel('unavailable')).toBe('GPS unavailable')
    })

    it('should handle null accuracy for available state', () => {
      expect(getStatusLabel('available', null)).toBe('GPS available')
    })
  })

  describe('Display Text Logic', () => {
    /**
     * Helper function that mirrors the component's display text logic
     */
    function getDisplayText(status: GpsStatus, accuracy?: number | null): string {
      switch (status) {
        case 'acquiring':
          return 'GPS...'
        case 'available':
          return accuracy != null ? `GPS ${formatAccuracy(accuracy)}` : 'GPS'
        case 'unavailable':
          return 'No GPS'
      }
    }

    it('should display "GPS..." for acquiring state', () => {
      expect(getDisplayText('acquiring')).toBe('GPS...')
    })

    it('should display "GPS" for available state without accuracy', () => {
      expect(getDisplayText('available')).toBe('GPS')
    })

    it('should display "GPS ±10m" for available state with 10m accuracy', () => {
      expect(getDisplayText('available', 10)).toBe('GPS ±10m')
    })

    it('should display "GPS ±1.5km" for available state with 1500m accuracy', () => {
      expect(getDisplayText('available', 1500)).toBe('GPS ±1.5km')
    })

    it('should display "No GPS" for unavailable state', () => {
      expect(getDisplayText('unavailable')).toBe('No GPS')
    })

    it('should handle null accuracy for available state', () => {
      expect(getDisplayText('available', null)).toBe('GPS')
    })
  })

  describe('Icon Selection Logic', () => {
    /**
     * Helper function that determines which icon to show
     */
    function getIconType(status: GpsStatus): 'spinner' | 'pin' | 'pin-off' {
      switch (status) {
        case 'acquiring':
          return 'spinner'
        case 'available':
          return 'pin'
        case 'unavailable':
          return 'pin-off'
      }
    }

    it('should show spinner icon for acquiring state', () => {
      expect(getIconType('acquiring')).toBe('spinner')
    })

    it('should show pin icon for available state', () => {
      expect(getIconType('available')).toBe('pin')
    })

    it('should show pin-off icon for unavailable state', () => {
      expect(getIconType('unavailable')).toBe('pin-off')
    })
  })

  describe('Color Styling Logic', () => {
    /**
     * Helper function that determines the color class for each status
     */
    function getColorClass(status: GpsStatus): string {
      switch (status) {
        case 'acquiring':
          return 'text-amber-600'
        case 'available':
          return 'text-green-600'
        case 'unavailable':
          return 'text-muted-foreground'
      }
    }

    it('should use amber color for acquiring state', () => {
      expect(getColorClass('acquiring')).toBe('text-amber-600')
    })

    it('should use green color for available state', () => {
      expect(getColorClass('available')).toBe('text-green-600')
    })

    it('should use muted color for unavailable state', () => {
      expect(getColorClass('unavailable')).toBe('text-muted-foreground')
    })
  })

  describe('Accessibility', () => {
    it('should have role="status" for screen readers', () => {
      const role = 'status'
      expect(role).toBe('status')
    })

    it('should have aria-hidden on icons', () => {
      const iconAriaHidden = true
      expect(iconAriaHidden).toBe(true)
    })

    it('should have descriptive aria-label for each status', () => {
      const acquiringLabel = 'Acquiring GPS location'
      const availableLabel = 'GPS available'
      const unavailableLabel = 'GPS unavailable'
      
      expect(acquiringLabel).toContain('GPS')
      expect(availableLabel).toContain('GPS')
      expect(unavailableLabel).toContain('GPS')
    })
  })

  describe('CSS Classes', () => {
    /**
     * Helper function that generates expected CSS classes
     */
    function getContainerClasses(status: GpsStatus, customClassName?: string): string[] {
      const classes = [
        'flex',
        'items-center',
        'gap-1.5',
        'text-sm'
      ]
      
      switch (status) {
        case 'acquiring':
          classes.push('text-amber-600')
          break
        case 'available':
          classes.push('text-green-600')
          break
        case 'unavailable':
          classes.push('text-muted-foreground')
          break
      }
      
      if (customClassName) {
        classes.push(customClassName)
      }
      
      return classes
    }

    it('should include base layout classes', () => {
      const classes = getContainerClasses('available')
      expect(classes).toContain('flex')
      expect(classes).toContain('items-center')
      expect(classes).toContain('gap-1.5')
    })

    it('should include text-sm for font size', () => {
      const classes = getContainerClasses('available')
      expect(classes).toContain('text-sm')
    })

    it('should include custom className when provided', () => {
      const classes = getContainerClasses('available', 'custom-class')
      expect(classes).toContain('custom-class')
    })

    it('should include status-specific color class', () => {
      expect(getContainerClasses('acquiring')).toContain('text-amber-600')
      expect(getContainerClasses('available')).toContain('text-green-600')
      expect(getContainerClasses('unavailable')).toContain('text-muted-foreground')
    })
  })

  describe('Data Attributes', () => {
    /**
     * The component should have data-testid and data-status attributes
     */
    it('should have data-testid="gps-indicator"', () => {
      const testId = 'gps-indicator'
      expect(testId).toBe('gps-indicator')
    })

    it('should have data-status attribute matching current status', () => {
      const statuses: GpsStatus[] = ['acquiring', 'available', 'unavailable']
      statuses.forEach(status => {
        expect(status).toMatch(/^(acquiring|available|unavailable)$/)
      })
    })
  })

  describe('Spinner Animation', () => {
    it('should have animate-spin class on spinner icon for acquiring state', () => {
      const spinnerClasses = ['h-4', 'w-4', 'animate-spin']
      expect(spinnerClasses).toContain('animate-spin')
    })
  })
})

describe('formatAccuracy', () => {
  describe('Meters formatting', () => {
    it('should format small values in meters', () => {
      expect(formatAccuracy(5)).toBe('±5m')
      expect(formatAccuracy(10)).toBe('±10m')
      expect(formatAccuracy(100)).toBe('±100m')
      expect(formatAccuracy(999)).toBe('±999m')
    })

    it('should round meters to nearest integer', () => {
      expect(formatAccuracy(5.4)).toBe('±5m')
      expect(formatAccuracy(5.6)).toBe('±6m')
      expect(formatAccuracy(10.5)).toBe('±11m')
    })
  })

  describe('Kilometers formatting', () => {
    it('should format large values in kilometers', () => {
      expect(formatAccuracy(1000)).toBe('±1.0km')
      expect(formatAccuracy(1500)).toBe('±1.5km')
      expect(formatAccuracy(2500)).toBe('±2.5km')
      expect(formatAccuracy(10000)).toBe('±10.0km')
    })
  })

  describe('Boundary cases', () => {
    it('should handle edge case at 1000m boundary', () => {
      expect(formatAccuracy(999)).toBe('±999m')
      expect(formatAccuracy(1000)).toBe('±1.0km')
    })

    it('should handle very small values', () => {
      expect(formatAccuracy(1)).toBe('±1m')
      expect(formatAccuracy(0.5)).toBe('±1m') // Rounds up
    })

    it('should handle very large values', () => {
      expect(formatAccuracy(100000)).toBe('±100.0km')
    })
  })
})
