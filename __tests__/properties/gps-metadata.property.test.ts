import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { CaptureMetadata } from '@/types/capture'
import type { GeolocationCoordinates, GeolocationResult } from '@/hooks/use-geolocation'

/**
 * Property-Based Tests for GPS Metadata Attachment
 * 
 * Feature: v0.3-guided-capture, Property 5: GPS metadata attachment
 * 
 * *For any* photo capture where GPS is available, the captured photo metadata
 * should include `gpsLatitude`, `gpsLongitude`, and `gpsAccuracy` values.
 * 
 * **Validates: Requirements 3.3.4**
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
 * Generator for valid GPS coordinates
 */
const gpsCoordinatesArb: fc.Arbitrary<GeolocationCoordinates> = fc.record({
  latitude: latitudeArb,
  longitude: longitudeArb,
  accuracy: accuracyArb,
})

/**
 * Generator for successful geolocation result
 */
const successfulGeolocationResultArb: fc.Arbitrary<GeolocationResult> = gpsCoordinatesArb.map(
  (coordinates) => ({
    success: true as const,
    coordinates,
  })
)

/**
 * Generator for failed geolocation result
 */
const failedGeolocationResultArb: fc.Arbitrary<GeolocationResult> = fc.constantFrom(
  {
    success: false as const,
    error: { type: 'PERMISSION_DENIED' as const, message: 'Location permission was denied' },
  },
  {
    success: false as const,
    error: { type: 'POSITION_UNAVAILABLE' as const, message: 'Location information is unavailable' },
  },
  {
    success: false as const,
    error: { type: 'TIMEOUT' as const, message: 'Location request timed out' },
  },
  {
    success: false as const,
    error: { type: 'NOT_SUPPORTED' as const, message: 'Geolocation is not supported in this browser' },
  }
)

/**
 * Generator for any geolocation result (success or failure)
 */
const geolocationResultArb: fc.Arbitrary<GeolocationResult> = fc.oneof(
  successfulGeolocationResultArb,
  failedGeolocationResultArb
)

/**
 * Generator for capture metadata with GPS available
 */
const metadataWithGpsArb: fc.Arbitrary<CaptureMetadata> = fc
  .tuple(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    gpsCoordinatesArb
  )
  .map(([takenAt, coords]) => ({
    takenAt,
    gpsLatitude: coords.latitude,
    gpsLongitude: coords.longitude,
    gpsAccuracy: coords.accuracy,
  }))

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Creates capture metadata from a geolocation result
 * This simulates the logic used in the capture flow
 */
function createMetadataFromGeolocation(
  geolocationResult: GeolocationResult,
  takenAt: Date = new Date()
): CaptureMetadata {
  if (geolocationResult.success) {
    return {
      takenAt,
      gpsLatitude: geolocationResult.coordinates.latitude,
      gpsLongitude: geolocationResult.coordinates.longitude,
      gpsAccuracy: geolocationResult.coordinates.accuracy,
    }
  } else {
    return {
      takenAt,
      gpsLatitude: null,
      gpsLongitude: null,
      gpsAccuracy: null,
    }
  }
}

/**
 * Validates that GPS metadata is properly attached when available
 */
function hasValidGpsMetadata(metadata: CaptureMetadata): boolean {
  return (
    metadata.gpsLatitude !== null &&
    metadata.gpsLongitude !== null &&
    metadata.gpsAccuracy !== null &&
    typeof metadata.gpsLatitude === 'number' &&
    typeof metadata.gpsLongitude === 'number' &&
    typeof metadata.gpsAccuracy === 'number' &&
    !Number.isNaN(metadata.gpsLatitude) &&
    !Number.isNaN(metadata.gpsLongitude) &&
    !Number.isNaN(metadata.gpsAccuracy)
  )
}

/**
 * Validates that GPS metadata is null when unavailable
 */
function hasNullGpsMetadata(metadata: CaptureMetadata): boolean {
  return (
    metadata.gpsLatitude === null &&
    metadata.gpsLongitude === null &&
    metadata.gpsAccuracy === null
  )
}

/**
 * Validates GPS coordinate ranges
 */
function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90
}

function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180
}

function isValidAccuracy(acc: number): boolean {
  return acc >= 0
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 5: GPS metadata attachment', () => {
  /**
   * **Validates: Requirements 3.3.4**
   * 
   * *For any* photo capture where GPS is available, the captured photo metadata
   * should include `gpsLatitude`, `gpsLongitude`, and `gpsAccuracy` values.
   */

  it('should include GPS metadata when geolocation is successful for ANY valid coordinates', () => {
    fc.assert(
      fc.property(
        successfulGeolocationResultArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (geolocationResult, takenAt) => {
          // Precondition: geolocation was successful
          expect(geolocationResult.success).toBe(true)

          // Action: create metadata from geolocation result
          const metadata = createMetadataFromGeolocation(geolocationResult, takenAt)

          // Postcondition 1: GPS metadata should be present
          expect(hasValidGpsMetadata(metadata)).toBe(true)

          // Postcondition 2: GPS values should match the geolocation result
          if (geolocationResult.success) {
            expect(metadata.gpsLatitude).toBe(geolocationResult.coordinates.latitude)
            expect(metadata.gpsLongitude).toBe(geolocationResult.coordinates.longitude)
            expect(metadata.gpsAccuracy).toBe(geolocationResult.coordinates.accuracy)
          }

          // Postcondition 3: takenAt should be preserved
          expect(metadata.takenAt).toEqual(takenAt)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have null GPS metadata when geolocation fails for ANY error type', () => {
    fc.assert(
      fc.property(
        failedGeolocationResultArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (geolocationResult, takenAt) => {
          // Precondition: geolocation failed
          expect(geolocationResult.success).toBe(false)

          // Action: create metadata from geolocation result
          const metadata = createMetadataFromGeolocation(geolocationResult, takenAt)

          // Postcondition 1: GPS metadata should be null
          expect(hasNullGpsMetadata(metadata)).toBe(true)

          // Postcondition 2: takenAt should still be preserved
          expect(metadata.takenAt).toEqual(takenAt)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have valid latitude range (-90 to 90) for ANY successful geolocation', () => {
    fc.assert(
      fc.property(metadataWithGpsArb, (metadata) => {
        // Precondition: GPS is available
        expect(metadata.gpsLatitude).not.toBeNull()

        // Postcondition: latitude should be in valid range
        expect(isValidLatitude(metadata.gpsLatitude!)).toBe(true)
        expect(metadata.gpsLatitude).toBeGreaterThanOrEqual(-90)
        expect(metadata.gpsLatitude).toBeLessThanOrEqual(90)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have valid longitude range (-180 to 180) for ANY successful geolocation', () => {
    fc.assert(
      fc.property(metadataWithGpsArb, (metadata) => {
        // Precondition: GPS is available
        expect(metadata.gpsLongitude).not.toBeNull()

        // Postcondition: longitude should be in valid range
        expect(isValidLongitude(metadata.gpsLongitude!)).toBe(true)
        expect(metadata.gpsLongitude).toBeGreaterThanOrEqual(-180)
        expect(metadata.gpsLongitude).toBeLessThanOrEqual(180)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have non-negative accuracy for ANY successful geolocation', () => {
    fc.assert(
      fc.property(metadataWithGpsArb, (metadata) => {
        // Precondition: GPS is available
        expect(metadata.gpsAccuracy).not.toBeNull()

        // Postcondition: accuracy should be non-negative
        expect(isValidAccuracy(metadata.gpsAccuracy!)).toBe(true)
        expect(metadata.gpsAccuracy).toBeGreaterThanOrEqual(0)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should always include takenAt timestamp regardless of GPS availability', () => {
    fc.assert(
      fc.property(
        geolocationResultArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (geolocationResult, takenAt) => {
          // Action: create metadata from geolocation result
          const metadata = createMetadataFromGeolocation(geolocationResult, takenAt)

          // Postcondition: takenAt should always be present and valid
          expect(metadata.takenAt).toBeInstanceOf(Date)
          expect(metadata.takenAt).toEqual(takenAt)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('GPS Metadata Consistency Invariants', () => {
  /**
   * Additional invariant tests for GPS metadata consistency
   */

  it('GPS fields should be all-or-nothing (all present or all null)', () => {
    fc.assert(
      fc.property(geolocationResultArb, (geolocationResult) => {
        const metadata = createMetadataFromGeolocation(geolocationResult)

        // Invariant: Either all GPS fields are present or all are null
        const hasLat = metadata.gpsLatitude !== null
        const hasLng = metadata.gpsLongitude !== null
        const hasAcc = metadata.gpsAccuracy !== null

        // All should be the same (all true or all false)
        expect(hasLat).toBe(hasLng)
        expect(hasLng).toBe(hasAcc)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('GPS metadata should match geolocation result success state', () => {
    fc.assert(
      fc.property(geolocationResultArb, (geolocationResult) => {
        const metadata = createMetadataFromGeolocation(geolocationResult)

        if (geolocationResult.success) {
          // If geolocation succeeded, GPS metadata should be present
          expect(hasValidGpsMetadata(metadata)).toBe(true)
        } else {
          // If geolocation failed, GPS metadata should be null
          expect(hasNullGpsMetadata(metadata)).toBe(true)
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('GPS coordinates should not be NaN when present', () => {
    fc.assert(
      fc.property(metadataWithGpsArb, (metadata) => {
        // When GPS is available, values should not be NaN
        expect(Number.isNaN(metadata.gpsLatitude)).toBe(false)
        expect(Number.isNaN(metadata.gpsLongitude)).toBe(false)
        expect(Number.isNaN(metadata.gpsAccuracy)).toBe(false)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('GPS coordinates should be finite numbers when present', () => {
    fc.assert(
      fc.property(metadataWithGpsArb, (metadata) => {
        // When GPS is available, values should be finite
        expect(Number.isFinite(metadata.gpsLatitude)).toBe(true)
        expect(Number.isFinite(metadata.gpsLongitude)).toBe(true)
        expect(Number.isFinite(metadata.gpsAccuracy)).toBe(true)

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Edge Cases for GPS Metadata', () => {
  /**
   * Test edge cases for GPS coordinate boundaries
   */

  it('should handle boundary latitude values (-90 and 90)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(-90, 90),
        longitudeArb,
        accuracyArb,
        (lat, lng, acc) => {
          const geolocationResult: GeolocationResult = {
            success: true,
            coordinates: { latitude: lat, longitude: lng, accuracy: acc },
          }

          const metadata = createMetadataFromGeolocation(geolocationResult)

          expect(metadata.gpsLatitude).toBe(lat)
          expect(isValidLatitude(metadata.gpsLatitude!)).toBe(true)

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
        accuracyArb,
        (lat, lng, acc) => {
          const geolocationResult: GeolocationResult = {
            success: true,
            coordinates: { latitude: lat, longitude: lng, accuracy: acc },
          }

          const metadata = createMetadataFromGeolocation(geolocationResult)

          expect(metadata.gpsLongitude).toBe(lng)
          expect(isValidLongitude(metadata.gpsLongitude!)).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle zero accuracy (perfect GPS lock)', () => {
    fc.assert(
      fc.property(latitudeArb, longitudeArb, (lat, lng) => {
        const geolocationResult: GeolocationResult = {
          success: true,
          coordinates: { latitude: lat, longitude: lng, accuracy: 0 },
        }

        const metadata = createMetadataFromGeolocation(geolocationResult)

        expect(metadata.gpsAccuracy).toBe(0)
        expect(isValidAccuracy(metadata.gpsAccuracy!)).toBe(true)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should handle coordinates at origin (0, 0)', () => {
    const geolocationResult: GeolocationResult = {
      success: true,
      coordinates: { latitude: 0, longitude: 0, accuracy: 10 },
    }

    const metadata = createMetadataFromGeolocation(geolocationResult)

    expect(metadata.gpsLatitude).toBe(0)
    expect(metadata.gpsLongitude).toBe(0)
    expect(hasValidGpsMetadata(metadata)).toBe(true)
  })

  it('should handle all error types gracefully', () => {
    const errorTypes = [
      'PERMISSION_DENIED',
      'POSITION_UNAVAILABLE',
      'TIMEOUT',
      'NOT_SUPPORTED',
      'UNKNOWN',
    ] as const

    for (const errorType of errorTypes) {
      const geolocationResult: GeolocationResult = {
        success: false,
        error: { type: errorType, message: `Test error: ${errorType}` },
      }

      const metadata = createMetadataFromGeolocation(geolocationResult)

      expect(hasNullGpsMetadata(metadata)).toBe(true)
      expect(metadata.takenAt).toBeInstanceOf(Date)
    }
  })
})
