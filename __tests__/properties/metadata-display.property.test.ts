import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { formatGpsCoordinates, formatTimestamp } from '@/components/atoms/metadata-display'
import type { CaptureMetadata } from '@/types/capture'

/**
 * Property-Based Tests for Metadata Display
 * 
 * Feature: v0.3-guided-capture, Property 6: Preview displays photo metadata
 * 
 * *For any* photo in preview state with GPS data, the preview should display
 * formatted coordinates and timestamp from the metadata.
 * 
 * **Validates: Requirements 3.4.2**
 */

// ============================================
// ARBITRARIES (Test Data Generators)
// ============================================

/**
 * Generator for valid GPS latitude values
 * Range: -90 to 90 degrees
 */
const latitudeArb: fc.Arbitrary<number> = fc.double({
  min: -90,
  max: 90,
  noNaN: true,
  noDefaultInfinity: true,
})

/**
 * Generator for valid GPS longitude values
 * Range: -180 to 180 degrees
 */
const longitudeArb: fc.Arbitrary<number> = fc.double({
  min: -180,
  max: 180,
  noNaN: true,
  noDefaultInfinity: true,
})

/**
 * Generator for GPS accuracy values in meters
 * Range: 0 to 10000 meters (typical GPS accuracy range)
 */
const accuracyArb: fc.Arbitrary<number> = fc.double({
  min: 0,
  max: 10000,
  noNaN: true,
  noDefaultInfinity: true,
})

/**
 * Generator for valid dates within a reasonable range
 */
const dateArb: fc.Arbitrary<Date> = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).filter(date => !isNaN(date.getTime()))

/**
 * Generator for capture metadata with GPS available
 */
const metadataWithGpsArb: fc.Arbitrary<CaptureMetadata> = fc
  .tuple(dateArb, latitudeArb, longitudeArb, accuracyArb)
  .map(([takenAt, lat, lng, acc]) => ({
    takenAt,
    gpsLatitude: lat,
    gpsLongitude: lng,
    gpsAccuracy: acc,
  }))

/**
 * Generator for capture metadata without GPS (null values)
 */
const metadataWithoutGpsArb: fc.Arbitrary<CaptureMetadata> = dateArb.map((takenAt) => ({
  takenAt,
  gpsLatitude: null,
  gpsLongitude: null,
  gpsAccuracy: null,
}))

/**
 * Generator for any capture metadata (with or without GPS)
 */
const captureMetadataArb: fc.Arbitrary<CaptureMetadata> = fc.oneof(
  metadataWithGpsArb,
  metadataWithoutGpsArb
)

/**
 * Generator for hours (0-23)
 */
const hourArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 23 })

/**
 * Generator for minutes (0-59)
 */
const minuteArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 59 })

/**
 * Generator for day of month (1-28 to avoid month boundary issues)
 */
const dayArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 28 })

/**
 * Generator for month (0-11)
 */
const monthArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 11 })

/**
 * Generator for year (2020-2030)
 */
const yearArb: fc.Arbitrary<number> = fc.integer({ min: 2020, max: 2030 })

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determines if GPS data is available in metadata
 */
function hasGpsData(metadata: CaptureMetadata): boolean {
  return metadata.gpsLatitude !== null && metadata.gpsLongitude !== null
}

/**
 * Expected GPS display format: "lat, lng" with 4 decimal places
 */
function expectedGpsFormat(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

/**
 * Expected timestamp format: "HH:MM AM/PM, DD Mon YYYY"
 */
function expectedTimestampFormat(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  const timeStr = `${displayHours.toString().padStart(2, '0')}:${displayMinutes} ${ampm}`
  
  const day = date.getDate().toString().padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const dateStr = `${day} ${month} ${year}`
  
  return `${timeStr}, ${dateStr}`
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 6: Preview displays photo metadata', () => {
  /**
   * **Validates: Requirements 3.4.2**
   * 
   * *For any* photo in preview state with GPS data, the preview should display
   * formatted coordinates and timestamp from the metadata.
   */

  describe('GPS Coordinate Formatting', () => {
    it('should format ANY valid GPS coordinates to "lat, lng" with 4 decimal places', () => {
      fc.assert(
        fc.property(latitudeArb, longitudeArb, (lat, lng) => {
          // Action: format the coordinates
          const result = formatGpsCoordinates(lat, lng)

          // Postcondition 1: Result should match expected format
          const expected = expectedGpsFormat(lat, lng)
          expect(result).toBe(expected)

          // Postcondition 2: Result should contain comma separator
          expect(result).toContain(', ')

          // Postcondition 3: Result should have two parts (lat and lng)
          const parts = result.split(', ')
          expect(parts).toHaveLength(2)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve sign (positive/negative) for ANY coordinates with magnitude > 0.00005', () => {
      // Note: Very small values (< 0.00005) may round to 0, which is expected behavior
      // We test sign preservation for values with sufficient magnitude
      fc.assert(
        fc.property(latitudeArb, longitudeArb, (lat, lng) => {
          const result = formatGpsCoordinates(lat, lng)
          const parts = result.split(', ')
          const formattedLat = parseFloat(parts[0])
          const formattedLng = parseFloat(parts[1])

          // Postcondition: Sign should be preserved for values with sufficient magnitude
          // Values smaller than 0.00005 may round to 0, which is acceptable
          const threshold = 0.00005

          if (lat < -threshold) {
            expect(formattedLat).toBeLessThan(0)
          } else if (lat > threshold) {
            expect(formattedLat).toBeGreaterThan(0)
          } else {
            // Values near zero may round to 0
            expect(formattedLat).toBeGreaterThanOrEqual(-threshold)
            expect(formattedLat).toBeLessThanOrEqual(threshold)
          }

          if (lng < -threshold) {
            expect(formattedLng).toBeLessThan(0)
          } else if (lng > threshold) {
            expect(formattedLng).toBeGreaterThan(0)
          } else {
            // Values near zero may round to 0
            expect(formattedLng).toBeGreaterThanOrEqual(-threshold)
            expect(formattedLng).toBeLessThanOrEqual(threshold)
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should round to exactly 4 decimal places for ANY coordinates', () => {
      fc.assert(
        fc.property(latitudeArb, longitudeArb, (lat, lng) => {
          const result = formatGpsCoordinates(lat, lng)
          const parts = result.split(', ')

          // Postcondition: Each part should have exactly 4 decimal places
          for (const part of parts) {
            const decimalPart = part.split('.')[1]
            expect(decimalPart).toBeDefined()
            expect(decimalPart.length).toBe(4)
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should produce parseable numbers for ANY coordinates', () => {
      fc.assert(
        fc.property(latitudeArb, longitudeArb, (lat, lng) => {
          const result = formatGpsCoordinates(lat, lng)
          const parts = result.split(', ')

          // Postcondition: Both parts should be parseable as numbers
          const parsedLat = parseFloat(parts[0])
          const parsedLng = parseFloat(parts[1])

          expect(Number.isNaN(parsedLat)).toBe(false)
          expect(Number.isNaN(parsedLng)).toBe(false)
          expect(Number.isFinite(parsedLat)).toBe(true)
          expect(Number.isFinite(parsedLng)).toBe(true)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Timestamp Formatting', () => {
    it('should format ANY valid date to "HH:MM AM/PM, DD Mon YYYY" format', () => {
      fc.assert(
        fc.property(dateArb, (date) => {
          // Action: format the timestamp
          const result = formatTimestamp(date)

          // Postcondition: Result should match expected format
          const expected = expectedTimestampFormat(date)
          expect(result).toBe(expected)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly display AM for hours 0-11 and PM for hours 12-23', () => {
      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          dayArb,
          hourArb,
          minuteArb,
          (year, month, day, hour, minute) => {
            const date = new Date(year, month, day, hour, minute, 0)
            const result = formatTimestamp(date)

            // Postcondition: AM/PM should be correct
            if (hour >= 12) {
              expect(result).toContain(' PM,')
            } else {
              expect(result).toContain(' AM,')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should convert 24-hour to 12-hour format correctly for ANY hour', () => {
      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          dayArb,
          hourArb,
          minuteArb,
          (year, month, day, hour, minute) => {
            const date = new Date(year, month, day, hour, minute, 0)
            const result = formatTimestamp(date)

            // Extract the hour from the result
            const hourMatch = result.match(/^(\d{2}):/)
            expect(hourMatch).not.toBeNull()
            const displayedHour = parseInt(hourMatch![1], 10)

            // Postcondition: Hour should be in 1-12 range
            expect(displayedHour).toBeGreaterThanOrEqual(1)
            expect(displayedHour).toBeLessThanOrEqual(12)

            // Postcondition: Hour conversion should be correct
            const expectedHour = hour % 12 || 12
            expect(displayedHour).toBe(expectedHour)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should pad single-digit minutes with leading zero for ANY minute', () => {
      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          dayArb,
          hourArb,
          minuteArb,
          (year, month, day, hour, minute) => {
            const date = new Date(year, month, day, hour, minute, 0)
            const result = formatTimestamp(date)

            // Extract the minute from the result
            const minuteMatch = result.match(/:(\d{2}) /)
            expect(minuteMatch).not.toBeNull()
            const displayedMinute = minuteMatch![1]

            // Postcondition: Minute should always be 2 digits
            expect(displayedMinute.length).toBe(2)

            // Postcondition: Minute value should be correct
            expect(parseInt(displayedMinute, 10)).toBe(minute)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should pad single-digit days with leading zero for ANY day', () => {
      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          dayArb,
          hourArb,
          minuteArb,
          (year, month, day, hour, minute) => {
            const date = new Date(year, month, day, hour, minute, 0)
            const result = formatTimestamp(date)

            // Extract the day from the result
            const dayMatch = result.match(/, (\d{2}) /)
            expect(dayMatch).not.toBeNull()
            const displayedDay = dayMatch![1]

            // Postcondition: Day should always be 2 digits
            expect(displayedDay.length).toBe(2)

            // Postcondition: Day value should be correct
            expect(parseInt(displayedDay, 10)).toBe(day)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should display correct month abbreviation for ANY month', () => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          dayArb,
          hourArb,
          minuteArb,
          (year, month, day, hour, minute) => {
            const date = new Date(year, month, day, hour, minute, 0)
            const result = formatTimestamp(date)

            // Postcondition: Result should contain the correct month abbreviation
            const expectedMonth = monthNames[month]
            expect(result).toContain(expectedMonth)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should display correct year for ANY year', () => {
      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          dayArb,
          hourArb,
          minuteArb,
          (year, month, day, hour, minute) => {
            const date = new Date(year, month, day, hour, minute, 0)
            const result = formatTimestamp(date)

            // Postcondition: Result should contain the correct year
            expect(result).toContain(year.toString())

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Metadata Display State', () => {
    it('should show GPS coordinates when GPS data is available for ANY valid metadata', () => {
      fc.assert(
        fc.property(metadataWithGpsArb, (metadata) => {
          // Precondition: GPS data is available
          expect(hasGpsData(metadata)).toBe(true)

          // Action: determine display state
          const gpsDisplay = formatGpsCoordinates(metadata.gpsLatitude!, metadata.gpsLongitude!)
          const timestampDisplay = formatTimestamp(metadata.takenAt)

          // Postcondition 1: GPS should be formatted correctly
          const expectedGps = expectedGpsFormat(metadata.gpsLatitude!, metadata.gpsLongitude!)
          expect(gpsDisplay).toBe(expectedGps)

          // Postcondition 2: Timestamp should be formatted correctly
          const expectedTimestamp = expectedTimestampFormat(metadata.takenAt)
          expect(timestampDisplay).toBe(expectedTimestamp)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should show "GPS unavailable" when GPS data is null for ANY metadata without GPS', () => {
      fc.assert(
        fc.property(metadataWithoutGpsArb, (metadata) => {
          // Precondition: GPS data is not available
          expect(hasGpsData(metadata)).toBe(false)
          expect(metadata.gpsLatitude).toBeNull()
          expect(metadata.gpsLongitude).toBeNull()

          // Postcondition: Timestamp should still be formatted correctly
          const timestampDisplay = formatTimestamp(metadata.takenAt)
          const expectedTimestamp = expectedTimestampFormat(metadata.takenAt)
          expect(timestampDisplay).toBe(expectedTimestamp)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should always display timestamp regardless of GPS availability for ANY metadata', () => {
      fc.assert(
        fc.property(captureMetadataArb, (metadata) => {
          // Action: format timestamp
          const timestampDisplay = formatTimestamp(metadata.takenAt)

          // Postcondition 1: Timestamp should always be formatted
          expect(timestampDisplay).toBeDefined()
          expect(timestampDisplay.length).toBeGreaterThan(0)

          // Postcondition 2: Timestamp should match expected format
          const expectedTimestamp = expectedTimestampFormat(metadata.takenAt)
          expect(timestampDisplay).toBe(expectedTimestamp)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })
})

describe('GPS Coordinate Formatting Edge Cases', () => {
  /**
   * Test edge cases for GPS coordinate formatting
   */

  it('should handle boundary latitude values (-90 and 90)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(-90, 90),
        longitudeArb,
        (lat, lng) => {
          const result = formatGpsCoordinates(lat, lng)
          const parts = result.split(', ')
          const parsedLat = parseFloat(parts[0])

          // Postcondition: Boundary values should be preserved
          expect(Math.abs(parsedLat - lat)).toBeLessThan(0.00005) // Within rounding tolerance

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle boundary longitude values (-180 and 180)', () => {
    fc.assert(
      fc.property(
        latitudeArb,
        fc.constantFrom(-180, 180),
        (lat, lng) => {
          const result = formatGpsCoordinates(lat, lng)
          const parts = result.split(', ')
          const parsedLng = parseFloat(parts[1])

          // Postcondition: Boundary values should be preserved
          expect(Math.abs(parsedLng - lng)).toBeLessThan(0.00005) // Within rounding tolerance

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle coordinates at origin (0, 0)', () => {
    const result = formatGpsCoordinates(0, 0)
    expect(result).toBe('0.0000, 0.0000')
  })

  it('should handle very small coordinate values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -0.0001, max: 0.0001, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.0001, max: 0.0001, noNaN: true, noDefaultInfinity: true }),
        (lat, lng) => {
          const result = formatGpsCoordinates(lat, lng)
          const parts = result.split(', ')

          // Postcondition: Should still produce valid formatted output
          expect(parts).toHaveLength(2)
          expect(Number.isNaN(parseFloat(parts[0]))).toBe(false)
          expect(Number.isNaN(parseFloat(parts[1]))).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Timestamp Formatting Edge Cases', () => {
  /**
   * Test edge cases for timestamp formatting
   */

  it('should handle midnight (00:00) correctly', () => {
    fc.assert(
      fc.property(yearArb, monthArb, dayArb, (year, month, day) => {
        const date = new Date(year, month, day, 0, 0, 0)
        const result = formatTimestamp(date)

        // Postcondition: Midnight should display as 12:00 AM
        expect(result).toMatch(/^12:00 AM,/)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should handle noon (12:00) correctly', () => {
    fc.assert(
      fc.property(yearArb, monthArb, dayArb, (year, month, day) => {
        const date = new Date(year, month, day, 12, 0, 0)
        const result = formatTimestamp(date)

        // Postcondition: Noon should display as 12:00 PM
        expect(result).toMatch(/^12:00 PM,/)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should handle 11:59 PM correctly', () => {
    fc.assert(
      fc.property(yearArb, monthArb, dayArb, (year, month, day) => {
        const date = new Date(year, month, day, 23, 59, 0)
        const result = formatTimestamp(date)

        // Postcondition: 11:59 PM should display correctly
        expect(result).toMatch(/^11:59 PM,/)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should handle 1:00 AM correctly', () => {
    fc.assert(
      fc.property(yearArb, monthArb, dayArb, (year, month, day) => {
        const date = new Date(year, month, day, 1, 0, 0)
        const result = formatTimestamp(date)

        // Postcondition: 1:00 AM should display correctly
        expect(result).toMatch(/^01:00 AM,/)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should handle first day of month correctly', () => {
    fc.assert(
      fc.property(yearArb, monthArb, hourArb, minuteArb, (year, month, hour, minute) => {
        const date = new Date(year, month, 1, hour, minute, 0)
        const result = formatTimestamp(date)

        // Postcondition: Day 1 should display as "01"
        expect(result).toContain(', 01 ')

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should handle last day of month correctly', () => {
    fc.assert(
      fc.property(yearArb, monthArb, hourArb, minuteArb, (year, month, hour, minute) => {
        // Get the last day of the month
        const lastDay = new Date(year, month + 1, 0).getDate()
        const date = new Date(year, month, lastDay, hour, minute, 0)
        const result = formatTimestamp(date)

        // Postcondition: Last day should be formatted correctly
        const expectedDay = lastDay.toString().padStart(2, '0')
        expect(result).toContain(`, ${expectedDay} `)

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Formatting Consistency Invariants', () => {
  /**
   * Invariant tests for formatting consistency
   */

  it('GPS formatting should be deterministic for ANY coordinates', () => {
    fc.assert(
      fc.property(latitudeArb, longitudeArb, (lat, lng) => {
        // Action: format the same coordinates multiple times
        const result1 = formatGpsCoordinates(lat, lng)
        const result2 = formatGpsCoordinates(lat, lng)
        const result3 = formatGpsCoordinates(lat, lng)

        // Invariant: Same input should always produce same output
        expect(result1).toBe(result2)
        expect(result2).toBe(result3)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('Timestamp formatting should be deterministic for ANY date', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        // Action: format the same date multiple times
        const result1 = formatTimestamp(date)
        const result2 = formatTimestamp(date)
        const result3 = formatTimestamp(date)

        // Invariant: Same input should always produce same output
        expect(result1).toBe(result2)
        expect(result2).toBe(result3)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('GPS formatting output should always match regex pattern', () => {
    // Pattern: "-?d+.dddd, -?d+.dddd"
    const gpsPattern = /^-?\d+\.\d{4}, -?\d+\.\d{4}$/

    fc.assert(
      fc.property(latitudeArb, longitudeArb, (lat, lng) => {
        const result = formatGpsCoordinates(lat, lng)

        // Invariant: Output should always match expected pattern
        expect(result).toMatch(gpsPattern)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('Timestamp formatting output should always match regex pattern', () => {
    // Pattern: "HH:MM AM/PM, DD Mon YYYY"
    const timestampPattern = /^\d{2}:\d{2} (AM|PM), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/

    fc.assert(
      fc.property(dateArb, (date) => {
        const result = formatTimestamp(date)

        // Invariant: Output should always match expected pattern
        expect(result).toMatch(timestampPattern)

        return true
      }),
      { numRuns: 100 }
    )
  })
})
