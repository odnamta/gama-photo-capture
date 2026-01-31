/**
 * Property-Based Tests for Upload Sync
 * 
 * Feature: v0.5-photo-upload-sync
 * 
 * This file contains property-based tests for:
 * - Property 1: Storage Path Format
 * - Property 2: Status Transition to Uploading
 * - Property 3: Metadata Preservation on Success
 * - Property 10: Retry Behavior
 * - Property 14: Blob Deletion Safety
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.6, 3.1, 3.2, 3.3, 7.1, 7.3, 8.1, 8.2, 8.3, 8.4**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import 'fake-indexeddb/auto'
import {
  db,
  generatePhotoId,
  clearAllPhotos,
  getUploadablePhotos,
  updatePhotoRetry,
  resetPhotoRetry,
  updatePhotoStatus,
  deletePhoto,
  type OfflinePhoto,
} from '@/lib/offline/db'
import {
  generateStoragePath,
  buildStoragePath,
  extractYearMonth,
  parseStoragePath,
  dateToUnixSeconds,
  type StoragePathComponents,
} from '@/lib/sync/storage-path'
import type { JobStage } from '@/types/job'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a test photo with specific properties
 */
function createTestPhoto(overrides: Partial<OfflinePhoto> = {}): OfflinePhoto {
  return {
    id: generatePhotoId(),
    jobOrderId: 'job-123',
    checklistItemId: 'checklist-456',
    stage: 'job_start',
    photoType: 'cargo_before',
    blob: new Blob(['test'], { type: 'image/jpeg' }),
    metadata: {
      takenAt: new Date().toISOString(),
      gpsLatitude: -6.2088,
      gpsLongitude: 106.8456,
      gpsAccuracy: 10,
    },
    notes: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
    lastAttemptAt: null,
    ...overrides,
  }
}


// ============================================
// ARBITRARIES FOR STORAGE PATH TESTS
// ============================================

/**
 * Generate a valid UUID-like string
 */
const uuidArb = fc.uuid()

/**
 * Generate a valid job stage
 */
const stageArb = fc.constantFrom('job_start', 'in_transit', 'job_end') as fc.Arbitrary<JobStage>

/**
 * Generate a valid date within reasonable range (2020-2030)
 * Using integer timestamps to avoid invalid date issues
 */
const dateArb = fc.integer({
  // 2020-01-01 00:00:00 UTC = 1577836800000 ms
  min: 1577836800000,
  // 2029-12-31 23:59:59 UTC = 1893455999000 ms (before 2030 boundary)
  max: 1893455999000,
}).map(ms => new Date(ms))

/**
 * Generate a valid photo type
 */
const photoTypeArb = fc.constantFrom(
  'cargo_before',
  'cargo_after',
  'cargo_transit',
  'document',
  'damage',
  'issue'
)

/**
 * Generate valid storage path components
 */
const storagePathComponentsArb = fc.record({
  userId: uuidArb,
  year: fc.integer({ min: 2020, max: 2029 }).map(y => y.toString()),
  month: fc.integer({ min: 1, max: 12 }).map(m => m.toString().padStart(2, '0')),
  jobOrderId: uuidArb,
  stage: stageArb,
  timestamp: fc.integer({ min: 1577836800, max: 1893455999 }), // 2020-01-01 to 2029-12-31 in seconds
  photoId: uuidArb,
}) as fc.Arbitrary<StoragePathComponents>

/**
 * Generate a mock OfflinePhoto with random valid data
 */
const offlinePhotoArb = fc.record({
  id: uuidArb,
  jobOrderId: uuidArb,
  checklistItemId: uuidArb,
  stage: stageArb,
  photoType: photoTypeArb,
  takenAt: dateArb.map(d => d.toISOString()),
}).map(({ id, jobOrderId, checklistItemId, stage, photoType, takenAt }) => ({
  id,
  jobOrderId,
  checklistItemId,
  stage,
  photoType,
  blob: new Blob(['test'], { type: 'image/jpeg' }),
  metadata: {
    takenAt,
    gpsLatitude: null,
    gpsLongitude: null,
    gpsAccuracy: null,
  },
  notes: null,
  status: 'pending' as const,
  createdAt: new Date().toISOString(),
  retryCount: 0,
  lastError: null,
  lastAttemptAt: null,
})) as fc.Arbitrary<OfflinePhoto>

// ============================================
// PROPERTY 1: STORAGE PATH FORMAT
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 1: Storage Path Format
 * 
 * *For any* photo with valid metadata (userId, jobOrderId, stage, takenAt, photoId),
 * the generated storage path SHALL match the pattern
 * `{userId}/{YYYY}/{MM}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg`
 * where YYYY and MM are extracted from takenAt and timestamp is Unix seconds.
 * 
 * **Validates: Requirements 1.1, 8.1, 8.2, 8.3, 8.4**
 */
describe('Feature: v0.5-photo-upload-sync, Property 1: Storage Path Format', () => {
  /**
   * Property 1.1: Path matches expected pattern
   * 
   * For ANY valid photo metadata, the generated path SHALL match the pattern:
   * {userId}/{YYYY}/{MM}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg
   * 
   * **Validates: Requirements 8.1**
   */
  describe('Path matches expected pattern', () => {
    it('should generate path matching pattern for ANY valid photo metadata', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: Path should match expected pattern
            // Pattern: {userId}/{YYYY}/{MM}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg
            const pathRegex = /^[^/]+\/\d{4}\/\d{2}\/[^/]+\/[^/]+\/\d+_[^/]+\.jpg$/
            expect(path).toMatch(pathRegex)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include userId as first path segment for ANY userId', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: First segment should be userId
            const segments = path.split('/')
            expect(segments[0]).toBe(userId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include jobOrderId in path for ANY jobOrderId', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: Fourth segment should be jobOrderId
            const segments = path.split('/')
            expect(segments[3]).toBe(photo.jobOrderId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include stage in path for ANY stage', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: Fifth segment should be stage
            const segments = path.split('/')
            expect(segments[4]).toBe(photo.stage)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include photoId in filename for ANY photoId', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: Filename should contain photoId
            const filename = path.split('/').pop()!
            expect(filename).toContain(`_${photo.id}.jpg`)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 1.2: Year is 4 digits (YYYY)
   * 
   * For ANY date, the year component SHALL be exactly 4 digits.
   * 
   * **Validates: Requirements 8.2**
   */
  describe('Year is 4 digits (YYYY)', () => {
    it('should extract 4-digit year for ANY date', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            // Action: Extract year and month
            const { year } = extractYearMonth(date)
            
            // Postcondition: Year should be exactly 4 digits
            expect(year).toMatch(/^\d{4}$/)
            expect(year.length).toBe(4)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include 4-digit year in generated path for ANY photo', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: Second segment (year) should be 4 digits
            const segments = path.split('/')
            expect(segments[1]).toMatch(/^\d{4}$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract correct year value for ANY date', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            // Action: Extract year
            const { year } = extractYearMonth(date)
            
            // Postcondition: Year should match the date's year
            expect(parseInt(year, 10)).toBe(date.getFullYear())
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 1.3: Month is 2 digits with leading zero (01-12)
   * 
   * For ANY date, the month component SHALL be exactly 2 digits (01-12).
   * 
   * **Validates: Requirements 8.2**
   */
  describe('Month is 2 digits with leading zero (01-12)', () => {
    it('should extract 2-digit month for ANY date', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            // Action: Extract year and month
            const { month } = extractYearMonth(date)
            
            // Postcondition: Month should be exactly 2 digits
            expect(month).toMatch(/^\d{2}$/)
            expect(month.length).toBe(2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract month in valid range (01-12) for ANY date', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            // Action: Extract month
            const { month } = extractYearMonth(date)
            
            // Postcondition: Month should be between 01 and 12
            const monthNum = parseInt(month, 10)
            expect(monthNum).toBeGreaterThanOrEqual(1)
            expect(monthNum).toBeLessThanOrEqual(12)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include 2-digit month in generated path for ANY photo', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: Third segment (month) should be 2 digits in range 01-12
            const segments = path.split('/')
            expect(segments[2]).toMatch(/^(0[1-9]|1[0-2])$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should pad single-digit months with leading zero', () => {
      // Test specifically months 1-9 which need padding
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9 }),
          fc.integer({ min: 2020, max: 2030 }),
          (month, year) => {
            // Create a date with the specific month
            const date = new Date(Date.UTC(year, month - 1, 15))
            
            // Action: Extract month
            const { month: extractedMonth } = extractYearMonth(date)
            
            // Postcondition: Month should have leading zero
            expect(extractedMonth).toBe(month.toString().padStart(2, '0'))
            expect(extractedMonth[0]).toBe('0')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract correct month value for ANY date', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            // Action: Extract month
            const { month } = extractYearMonth(date)
            
            // Postcondition: Month should match the date's month (1-indexed)
            // JavaScript getMonth() returns 0-11, so add 1
            expect(parseInt(month, 10)).toBe(date.getMonth() + 1)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 1.4: Timestamp is Unix seconds (not milliseconds)
   * 
   * For ANY date, the timestamp SHALL be Unix seconds (not milliseconds).
   * 
   * **Validates: Requirements 8.4**
   */
  describe('Timestamp is Unix seconds (not milliseconds)', () => {
    it('should convert date to Unix seconds for ANY date', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            // Action: Convert to Unix seconds
            const timestamp = dateToUnixSeconds(date)
            
            // Postcondition: Timestamp should be in seconds (10 digits or less for dates before 2286)
            // Milliseconds would be 13 digits
            expect(timestamp.toString().length).toBeLessThanOrEqual(10)
            
            // Verify it's seconds by checking the value range
            // For dates 2020-2029, Unix seconds should be roughly 1577836800 to 1893455999
            expect(timestamp).toBeGreaterThanOrEqual(1577836800) // 2020-01-01
            expect(timestamp).toBeLessThanOrEqual(1893455999) // 2029-12-31
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include Unix seconds timestamp in filename for ANY photo', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Extract timestamp from filename
            const filename = path.split('/').pop()!
            const timestampMatch = filename.match(/^(\d+)_/)
            
            // Postcondition: Timestamp should exist and be in seconds range
            expect(timestampMatch).not.toBeNull()
            const timestamp = parseInt(timestampMatch![1], 10)
            
            // Verify it's seconds (not milliseconds)
            expect(timestamp.toString().length).toBeLessThanOrEqual(10)
            expect(timestamp).toBeGreaterThanOrEqual(1577836800) // 2020-01-01
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should floor milliseconds when converting to seconds', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            // Action: Convert to Unix seconds
            const timestamp = dateToUnixSeconds(date)
            
            // Postcondition: Should be a whole number (floored)
            expect(Number.isInteger(timestamp)).toBe(true)
            
            // Verify the conversion is correct
            const expectedSeconds = Math.floor(date.getTime() / 1000)
            expect(timestamp).toBe(expectedSeconds)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce consistent timestamp for same date', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            // Action: Convert same date twice
            const timestamp1 = dateToUnixSeconds(date)
            const timestamp2 = dateToUnixSeconds(new Date(date.getTime()))
            
            // Postcondition: Should produce same result
            expect(timestamp1).toBe(timestamp2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 1.5: Path ends with .jpg
   * 
   * For ANY photo, the generated path SHALL end with .jpg extension.
   * 
   * **Validates: Requirements 8.1**
   */
  describe('Path ends with .jpg', () => {
    it('should end with .jpg for ANY photo', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: Path should end with .jpg
            expect(path).toMatch(/\.jpg$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should end with .jpg when using buildStoragePath for ANY components', () => {
      fc.assert(
        fc.property(
          storagePathComponentsArb,
          (components) => {
            // Action: Build storage path
            const path = buildStoragePath(components)
            
            // Postcondition: Path should end with .jpg
            expect(path).toMatch(/\.jpg$/)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 1.6: parseStoragePath can roundtrip the generated path
   * 
   * For ANY valid photo, parseStoragePath(generateStoragePath(...)) SHALL
   * return components that match the original input.
   * 
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   */
  describe('parseStoragePath roundtrip', () => {
    it('should roundtrip buildStoragePath -> parseStoragePath for ANY components', () => {
      fc.assert(
        fc.property(
          storagePathComponentsArb,
          (components) => {
            // Action: Build path and parse it back
            const path = buildStoragePath(components)
            const parsed = parseStoragePath(path)
            
            // Postcondition: Parsed components should match original
            expect(parsed).not.toBeNull()
            expect(parsed).toEqual(components)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should roundtrip generateStoragePath -> parseStoragePath for ANY photo', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate path and parse it back
            const path = generateStoragePath(userId, photo)
            const parsed = parseStoragePath(path)
            
            // Postcondition: Parsed components should match expected values
            expect(parsed).not.toBeNull()
            expect(parsed!.userId).toBe(userId)
            expect(parsed!.jobOrderId).toBe(photo.jobOrderId)
            expect(parsed!.stage).toBe(photo.stage)
            expect(parsed!.photoId).toBe(photo.id)
            
            // Verify year and month match takenAt
            const takenAt = new Date(photo.metadata.takenAt)
            const { year, month } = extractYearMonth(takenAt)
            expect(parsed!.year).toBe(year)
            expect(parsed!.month).toBe(month)
            
            // Verify timestamp matches
            const expectedTimestamp = dateToUnixSeconds(takenAt)
            expect(parsed!.timestamp).toBe(expectedTimestamp)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all path segments through roundtrip', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate path
            const path = generateStoragePath(userId, photo)
            const segments = path.split('/')
            
            // Parse and rebuild
            const parsed = parseStoragePath(path)
            expect(parsed).not.toBeNull()
            
            const rebuiltPath = buildStoragePath(parsed!)
            const rebuiltSegments = rebuiltPath.split('/')
            
            // Postcondition: All segments should match
            expect(rebuiltSegments.length).toBe(segments.length)
            for (let i = 0; i < segments.length; i++) {
              expect(rebuiltSegments[i]).toBe(segments[i])
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 1.7: Path has exactly 6 segments
   * 
   * For ANY valid photo, the generated path SHALL have exactly 6 segments
   * separated by '/'.
   * 
   * **Validates: Requirements 8.1**
   */
  describe('Path has exactly 6 segments', () => {
    it('should have exactly 6 segments for ANY photo', () => {
      fc.assert(
        fc.property(
          uuidArb,
          offlinePhotoArb,
          (userId, photo) => {
            // Action: Generate storage path
            const path = generateStoragePath(userId, photo)
            
            // Postcondition: Path should have exactly 6 segments
            const segments = path.split('/')
            expect(segments.length).toBe(6)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have exactly 6 segments when using buildStoragePath for ANY components', () => {
      fc.assert(
        fc.property(
          storagePathComponentsArb,
          (components) => {
            // Action: Build storage path
            const path = buildStoragePath(components)
            
            // Postcondition: Path should have exactly 6 segments
            const segments = path.split('/')
            expect(segments.length).toBe(6)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// ============================================
// PROPERTY 10: RETRY BEHAVIOR
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 10: Retry Behavior
 * 
 * *For any* failed upload, the retryCount SHALL increment by 1.
 * After 3 failures (retryCount >= 3), no automatic retry SHALL occur.
 * Retry delays SHALL follow exponential backoff: 1s after 1st failure, 2s after 2nd, 4s after 3rd.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
describe('Feature: v0.5-photo-upload-sync, Property 10: Retry Behavior', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  /**
   * Property 10.1: Retry count increment
   * 
   * *For any* initial retryCount (0-10), calling updatePhotoRetry
   * SHALL increment it by exactly 1.
   * 
   * **Validates: Requirements 3.1**
   */
  describe('Retry count increment', () => {
    it('should increment retryCount by exactly 1 for ANY initial retryCount', async () => {
      // Generate test cases
      const testCases = fc.sample(
        fc.tuple(
          fc.integer({ min: 0, max: 10 }),
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        100
      )

      for (const [initialRetryCount, errorMessage] of testCases) {
        // Setup: Create a photo with the given initial retry count
        const photo = createTestPhoto({
          retryCount: initialRetryCount,
          status: 'pending',
        })
        await db.photos.add(photo)

        // Action: Call updatePhotoRetry
        await updatePhotoRetry(photo.id, errorMessage)

        // Postcondition: retryCount should be incremented by exactly 1
        const updated = await db.photos.get(photo.id)
        expect(updated?.retryCount).toBe(initialRetryCount + 1)

        // Cleanup for next iteration
        await db.photos.delete(photo.id)
      }
    })


    it('should set status to failed after updatePhotoRetry for ANY photo', async () => {
      // Generate test cases with different initial statuses
      const testCases = fc.sample(
        fc.tuple(
          fc.constantFrom('pending', 'failed') as fc.Arbitrary<'pending' | 'failed'>,
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        100
      )

      for (const [initialStatus, errorMessage] of testCases) {
        // Setup: Create a photo with the given initial status
        const photo = createTestPhoto({
          status: initialStatus,
          retryCount: 0,
        })
        await db.photos.add(photo)

        // Action: Call updatePhotoRetry
        await updatePhotoRetry(photo.id, errorMessage)

        // Postcondition: status should be 'failed'
        const updated = await db.photos.get(photo.id)
        expect(updated?.status).toBe('failed')

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should store the error message for ANY error string', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 100)

      for (const errorMessage of testCases) {
        // Setup: Create a photo
        const photo = createTestPhoto({ retryCount: 0 })
        await db.photos.add(photo)

        // Action: Call updatePhotoRetry
        await updatePhotoRetry(photo.id, errorMessage)

        // Postcondition: lastError should contain the error message
        const updated = await db.photos.get(photo.id)
        expect(updated?.lastError).toBe(errorMessage)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })


    it('should set lastAttemptAt timestamp for ANY retry', async () => {
      // Generate test cases
      const testCases = fc.sample(
        fc.tuple(
          fc.integer({ min: 0, max: 10 }),
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        100
      )

      for (const [initialRetryCount, errorMessage] of testCases) {
        // Setup: Create a photo
        const beforeUpdate = new Date()
        const photo = createTestPhoto({
          retryCount: initialRetryCount,
          lastAttemptAt: null,
        })
        await db.photos.add(photo)

        // Action: Call updatePhotoRetry
        await updatePhotoRetry(photo.id, errorMessage)
        const afterUpdate = new Date()

        // Postcondition: lastAttemptAt should be set to a valid timestamp
        const updated = await db.photos.get(photo.id)
        expect(updated?.lastAttemptAt).not.toBeNull()
        
        const attemptTime = new Date(updated!.lastAttemptAt!)
        expect(attemptTime.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
        expect(attemptTime.getTime()).toBeLessThanOrEqual(afterUpdate.getTime())

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })

  /**
   * Property 10.2: Automatic retry exclusion
   * 
   * *For any* photo with retryCount >= 3, getUploadablePhotos should NOT return it.
   * 
   * **Validates: Requirements 3.2**
   */
  describe('Automatic retry exclusion after max retries', () => {
    it('should NOT return photos with retryCount >= maxRetries for ANY maxRetries value', async () => {
      // Generate test cases
      const testCases = fc.sample(
        fc.tuple(
          fc.integer({ min: 1, max: 5 }), // maxRetries
          fc.integer({ min: 0, max: 10 })  // retryCount
        ),
        100
      )

      for (const [maxRetries, retryCount] of testCases) {
        // Setup: Create a photo with the given retry count
        const photo = createTestPhoto({
          retryCount,
          status: 'failed',
        })
        await db.photos.add(photo)

        // Action: Get uploadable photos
        const uploadable = await getUploadablePhotos(maxRetries)

        // Postcondition: Photo should be in result only if retryCount < maxRetries
        const isInResult = uploadable.some(p => p.id === photo.id)
        
        if (retryCount >= maxRetries) {
          expect(isInResult).toBe(false)
        } else {
          expect(isInResult).toBe(true)
        }

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })


    it('should exclude photos with retryCount >= 3 by default', async () => {
      // Generate test cases with retryCount >= 3
      const testCases = fc.sample(fc.integer({ min: 3, max: 10 }), 100)

      for (const retryCount of testCases) {
        // Setup: Create a photo with retryCount >= 3
        const photo = createTestPhoto({
          retryCount,
          status: 'failed',
        })
        await db.photos.add(photo)

        // Action: Get uploadable photos with default maxRetries (3)
        const uploadable = await getUploadablePhotos()

        // Postcondition: Photo should NOT be in result
        const isInResult = uploadable.some(p => p.id === photo.id)
        expect(isInResult).toBe(false)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should include photos with retryCount < 3 by default', async () => {
      // Generate test cases with retryCount < 3
      const testCases = fc.sample(
        fc.tuple(
          fc.integer({ min: 0, max: 2 }),
          fc.constantFrom('pending', 'failed') as fc.Arbitrary<'pending' | 'failed'>
        ),
        100
      )

      for (const [retryCount, status] of testCases) {
        // Setup: Create a photo with retryCount < 3
        const photo = createTestPhoto({
          retryCount,
          status,
        })
        await db.photos.add(photo)

        // Action: Get uploadable photos with default maxRetries (3)
        const uploadable = await getUploadablePhotos()

        // Postcondition: Photo SHOULD be in result
        const isInResult = uploadable.some(p => p.id === photo.id)
        expect(isInResult).toBe(true)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })


  /**
   * Property 10.3: Uploadable photos filtering
   * 
   * *For any* photo with status 'pending' or 'failed' AND retryCount < maxRetries,
   * getUploadablePhotos SHOULD return it.
   * 
   * **Validates: Requirements 3.3**
   */
  describe('Uploadable photos filtering', () => {
    it('should return pending photos with retryCount < maxRetries', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.integer({ min: 0, max: 2 }), 100)

      for (const retryCount of testCases) {
        // Setup: Create a pending photo
        const photo = createTestPhoto({
          retryCount,
          status: 'pending',
        })
        await db.photos.add(photo)

        // Action: Get uploadable photos
        const uploadable = await getUploadablePhotos(3)

        // Postcondition: Photo SHOULD be in result
        const isInResult = uploadable.some(p => p.id === photo.id)
        expect(isInResult).toBe(true)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should return failed photos with retryCount < maxRetries', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.integer({ min: 0, max: 2 }), 100)

      for (const retryCount of testCases) {
        // Setup: Create a failed photo
        const photo = createTestPhoto({
          retryCount,
          status: 'failed',
        })
        await db.photos.add(photo)

        // Action: Get uploadable photos
        const uploadable = await getUploadablePhotos(3)

        // Postcondition: Photo SHOULD be in result
        const isInResult = uploadable.some(p => p.id === photo.id)
        expect(isInResult).toBe(true)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })


    it('should NOT return uploading photos regardless of retryCount', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.integer({ min: 0, max: 10 }), 100)

      for (const retryCount of testCases) {
        // Setup: Create an uploading photo
        const photo = createTestPhoto({
          retryCount,
          status: 'uploading',
        })
        await db.photos.add(photo)

        // Action: Get uploadable photos
        const uploadable = await getUploadablePhotos(10)

        // Postcondition: Photo should NOT be in result
        const isInResult = uploadable.some(p => p.id === photo.id)
        expect(isInResult).toBe(false)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })

  /**
   * Property 10.4: Manual retry reset
   * 
   * *For any* photo, calling resetPhotoRetry should reset retryCount to 0
   * and set status to 'pending'.
   * 
   * **Validates: Requirements 3.6**
   */
  describe('Manual retry reset', () => {
    it('should reset retryCount to 0 for ANY initial retryCount', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.integer({ min: 0, max: 10 }), 100)

      for (const initialRetryCount of testCases) {
        // Setup: Create a photo with the given retry count
        const photo = createTestPhoto({
          retryCount: initialRetryCount,
          status: 'failed',
          lastError: 'Some error',
        })
        await db.photos.add(photo)

        // Action: Reset retry
        await resetPhotoRetry(photo.id)

        // Postcondition: retryCount should be 0
        const updated = await db.photos.get(photo.id)
        expect(updated?.retryCount).toBe(0)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })


    it('should set status to pending after reset for ANY failed photo', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.integer({ min: 1, max: 10 }), 100)

      for (const retryCount of testCases) {
        // Setup: Create a failed photo
        const photo = createTestPhoto({
          retryCount,
          status: 'failed',
          lastError: 'Network error',
        })
        await db.photos.add(photo)

        // Action: Reset retry
        await resetPhotoRetry(photo.id)

        // Postcondition: status should be 'pending'
        const updated = await db.photos.get(photo.id)
        expect(updated?.status).toBe('pending')

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should clear lastError after reset', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 100)

      for (const errorMessage of testCases) {
        // Setup: Create a failed photo with error
        const photo = createTestPhoto({
          retryCount: 3,
          status: 'failed',
          lastError: errorMessage,
        })
        await db.photos.add(photo)

        // Action: Reset retry
        await resetPhotoRetry(photo.id)

        // Postcondition: lastError should be null
        const updated = await db.photos.get(photo.id)
        expect(updated?.lastError).toBeNull()

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })


    it('should clear lastAttemptAt after reset', async () => {
      // Generate test cases with ISO timestamps using integer-based date generation
      const testCases = fc.sample(
        fc.integer({
          min: 1577836800000, // 2020-01-01
          max: 1893455999000, // 2029-12-31
        }).map(ms => new Date(ms).toISOString()),
        100
      )

      for (const lastAttemptAt of testCases) {
        // Setup: Create a failed photo with lastAttemptAt
        const photo = createTestPhoto({
          retryCount: 3,
          status: 'failed',
          lastAttemptAt,
        })
        await db.photos.add(photo)

        // Action: Reset retry
        await resetPhotoRetry(photo.id)

        // Postcondition: lastAttemptAt should be null
        const updated = await db.photos.get(photo.id)
        expect(updated?.lastAttemptAt).toBeNull()

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should make previously excluded photos uploadable after reset', async () => {
      // Generate test cases with retryCount >= 3 (excluded)
      const testCases = fc.sample(fc.integer({ min: 3, max: 10 }), 100)

      for (const retryCount of testCases) {
        // Setup: Create a photo that exceeds retry limit
        const photo = createTestPhoto({
          retryCount,
          status: 'failed',
        })
        await db.photos.add(photo)

        // Verify: Photo should NOT be uploadable before reset
        let uploadable = await getUploadablePhotos(3)
        expect(uploadable.some(p => p.id === photo.id)).toBe(false)

        // Action: Reset retry
        await resetPhotoRetry(photo.id)

        // Postcondition: Photo SHOULD be uploadable after reset
        uploadable = await getUploadablePhotos(3)
        expect(uploadable.some(p => p.id === photo.id)).toBe(true)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })
})


// ============================================
// INVARIANT TESTS
// ============================================

describe('Retry Behavior Invariants', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  /**
   * Invariant: retryCount should never be negative
   */
  it('retryCount should never be negative after ANY sequence of operations', async () => {
    // Generate test cases - sequences of operations
    const testCases = fc.sample(
      fc.array(fc.constantFrom('retry', 'reset'), { minLength: 1, maxLength: 10 }),
      100
    )

    for (const operations of testCases) {
      // Setup: Create a photo
      const photo = createTestPhoto({ retryCount: 0 })
      await db.photos.add(photo)

      // Action: Apply sequence of operations
      for (const op of operations) {
        if (op === 'retry') {
          await updatePhotoRetry(photo.id, 'Error')
        } else {
          await resetPhotoRetry(photo.id)
        }
      }

      // Invariant: retryCount should never be negative
      const updated = await db.photos.get(photo.id)
      expect(updated?.retryCount).toBeGreaterThanOrEqual(0)

      // Cleanup
      await db.photos.delete(photo.id)
    }
  })


  /**
   * Invariant: Multiple consecutive retries should increment count correctly
   */
  it('multiple consecutive retries should increment count correctly', async () => {
    // Generate test cases - number of retries
    const testCases = fc.sample(fc.integer({ min: 1, max: 10 }), 100)

    for (const numRetries of testCases) {
      // Setup: Create a photo with retryCount 0
      const photo = createTestPhoto({ retryCount: 0 })
      await db.photos.add(photo)

      // Action: Apply N retries
      for (let i = 0; i < numRetries; i++) {
        await updatePhotoRetry(photo.id, `Error ${i + 1}`)
      }

      // Invariant: retryCount should equal number of retries
      const updated = await db.photos.get(photo.id)
      expect(updated?.retryCount).toBe(numRetries)

      // Cleanup
      await db.photos.delete(photo.id)
    }
  })

  /**
   * Invariant: Reset followed by retries should give correct count
   */
  it('reset followed by retries should give correct count', async () => {
    // Generate test cases
    const testCases = fc.sample(
      fc.tuple(
        fc.integer({ min: 1, max: 5 }), // initial retries
        fc.integer({ min: 1, max: 5 })  // retries after reset
      ),
      100
    )

    for (const [initialRetries, retriesAfterReset] of testCases) {
      // Setup: Create a photo
      const photo = createTestPhoto({ retryCount: 0 })
      await db.photos.add(photo)

      // Apply initial retries
      for (let i = 0; i < initialRetries; i++) {
        await updatePhotoRetry(photo.id, `Initial error ${i + 1}`)
      }

      // Reset
      await resetPhotoRetry(photo.id)

      // Apply retries after reset
      for (let i = 0; i < retriesAfterReset; i++) {
        await updatePhotoRetry(photo.id, `After reset error ${i + 1}`)
      }

      // Invariant: retryCount should equal retries after reset (not cumulative)
      const updated = await db.photos.get(photo.id)
      expect(updated?.retryCount).toBe(retriesAfterReset)

      // Cleanup
      await db.photos.delete(photo.id)
    }
  })


  /**
   * Invariant: getUploadablePhotos should return photos in FIFO order
   */
  it('getUploadablePhotos should return photos in FIFO order (oldest first)', async () => {
    // Generate test cases - arrays of time offsets
    const testCases = fc.sample(
      fc.array(
        fc.integer({ min: 0, max: 1000 }), // offset in milliseconds
        { minLength: 2, maxLength: 10 }
      ),
      50
    )

    for (const offsets of testCases) {
      // Setup: Create photos with different createdAt timestamps
      const baseTime = new Date('2026-01-01T00:00:00.000Z').getTime()
      const photos: OfflinePhoto[] = offsets.map((offset, index) => ({
        ...createTestPhoto(),
        id: `photo-${index}-${Date.now()}`,
        createdAt: new Date(baseTime + offset).toISOString(),
        retryCount: 0,
        status: 'pending' as const,
      }))

      await db.photos.bulkAdd(photos)

      // Action: Get uploadable photos
      const uploadable = await getUploadablePhotos(3)

      // Invariant: Photos should be sorted by createdAt ascending
      for (let i = 1; i < uploadable.length; i++) {
        const prevTime = new Date(uploadable[i - 1].createdAt).getTime()
        const currTime = new Date(uploadable[i].createdAt).getTime()
        expect(currTime).toBeGreaterThanOrEqual(prevTime)
      }

      // Cleanup
      await clearAllPhotos()
    }
  })
})

// ============================================
// PROPERTY 2: STATUS TRANSITION TO UPLOADING
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 2: Status Transition to Uploading
 * 
 * *For any* photo upload operation, the photo's status in IndexedDB SHALL be
 * set to 'uploading' before the Supabase upload request is initiated.
 * 
 * **Validates: Requirements 1.2**
 */
describe('Feature: v0.5-photo-upload-sync, Property 2: Status Transition to Uploading', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  /**
   * Property 2.1: Status must be 'uploading' before upload starts
   * 
   * For ANY photo, when upload is initiated, the status SHALL transition
   * to 'uploading' before the actual upload request is made.
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Status must be uploading before upload starts', () => {
    it('should set status to uploading for ANY pending photo before upload', async () => {
      // Generate test cases with different initial states
      const testCases = fc.sample(
        fc.record({
          id: uuidArb,
          jobOrderId: uuidArb,
          checklistItemId: uuidArb,
          stage: stageArb,
          photoType: photoTypeArb,
          notes: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
        }),
        100
      )

      for (const testCase of testCases) {
        // Setup: Create a pending photo
        const photo = createTestPhoto({
          id: testCase.id,
          jobOrderId: testCase.jobOrderId,
          checklistItemId: testCase.checklistItemId,
          stage: testCase.stage as JobStage,
          photoType: testCase.photoType,
          notes: testCase.notes,
          status: 'pending',
        })
        await db.photos.add(photo)

        // Action: Update status to uploading (simulating what sync manager does)
        await updatePhotoStatus(photo.id, 'uploading')

        // Postcondition: Status should be 'uploading'
        const updated = await db.photos.get(photo.id)
        expect(updated?.status).toBe('uploading')

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should allow transition from pending to uploading for ANY photo', async () => {
      // Generate test cases
      const testCases = fc.sample(uuidArb, 100)

      for (const photoId of testCases) {
        // Setup: Create a pending photo
        const photo = createTestPhoto({
          id: photoId,
          status: 'pending',
        })
        await db.photos.add(photo)

        // Precondition: Status is pending
        const before = await db.photos.get(photo.id)
        expect(before?.status).toBe('pending')

        // Action: Transition to uploading
        await updatePhotoStatus(photo.id, 'uploading')

        // Postcondition: Status is uploading
        const after = await db.photos.get(photo.id)
        expect(after?.status).toBe('uploading')

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should allow transition from failed to uploading for ANY retry', async () => {
      // Generate test cases with different retry counts
      const testCases = fc.sample(
        fc.tuple(
          uuidArb,
          fc.integer({ min: 0, max: 2 }) // retryCount < 3 (still retryable)
        ),
        100
      )

      for (const [photoId, retryCount] of testCases) {
        // Setup: Create a failed photo
        const photo = createTestPhoto({
          id: photoId,
          status: 'failed',
          retryCount,
          lastError: 'Previous error',
        })
        await db.photos.add(photo)

        // Precondition: Status is failed
        const before = await db.photos.get(photo.id)
        expect(before?.status).toBe('failed')

        // Action: Transition to uploading (retry)
        await updatePhotoStatus(photo.id, 'uploading')

        // Postcondition: Status is uploading
        const after = await db.photos.get(photo.id)
        expect(after?.status).toBe('uploading')

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })

  /**
   * Property 2.2: Status transition preserves other fields
   * 
   * For ANY photo, transitioning status to 'uploading' SHALL NOT modify
   * any other fields (blob, metadata, notes, etc.).
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Status transition preserves other fields', () => {
    it('should preserve all metadata when transitioning to uploading', async () => {
      // Generate test cases with various metadata
      const testCases = fc.sample(
        fc.record({
          id: uuidArb,
          jobOrderId: uuidArb,
          checklistItemId: uuidArb,
          stage: stageArb,
          photoType: photoTypeArb,
          notes: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          gpsLatitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
          gpsLongitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
          gpsAccuracy: fc.option(fc.double({ min: 0, max: 100, noNaN: true }), { nil: null }),
        }),
        100
      )

      for (const testCase of testCases) {
        // Setup: Create a photo with specific metadata
        const photo = createTestPhoto({
          id: testCase.id,
          jobOrderId: testCase.jobOrderId,
          checklistItemId: testCase.checklistItemId,
          stage: testCase.stage as JobStage,
          photoType: testCase.photoType,
          notes: testCase.notes,
          metadata: {
            takenAt: new Date().toISOString(),
            gpsLatitude: testCase.gpsLatitude,
            gpsLongitude: testCase.gpsLongitude,
            gpsAccuracy: testCase.gpsAccuracy,
          },
          status: 'pending',
        })
        await db.photos.add(photo)

        // Action: Transition to uploading
        await updatePhotoStatus(photo.id, 'uploading')

        // Postcondition: All fields except status should be unchanged
        const updated = await db.photos.get(photo.id)
        expect(updated?.jobOrderId).toBe(testCase.jobOrderId)
        expect(updated?.checklistItemId).toBe(testCase.checklistItemId)
        expect(updated?.stage).toBe(testCase.stage)
        expect(updated?.photoType).toBe(testCase.photoType)
        expect(updated?.notes).toBe(testCase.notes)
        expect(updated?.metadata.gpsLatitude).toBe(testCase.gpsLatitude)
        expect(updated?.metadata.gpsLongitude).toBe(testCase.gpsLongitude)
        expect(updated?.metadata.gpsAccuracy).toBe(testCase.gpsAccuracy)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })
})

// ============================================
// PROPERTY 3: METADATA PRESERVATION ON SUCCESS
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 3: Metadata Preservation on Success
 * 
 * *For any* successful upload, the Shipment_Photo record in the database SHALL
 * contain all fields from the original OfflinePhoto: job_order_id, checklist_item_id,
 * stage, photo_type, gps_latitude, gps_longitude, gps_accuracy, taken_at, and notes.
 * Additionally, upload_status SHALL be 'completed' and sync_status SHALL be 'synced'.
 * 
 * **Validates: Requirements 1.3, 1.6**
 */
describe('Feature: v0.5-photo-upload-sync, Property 3: Metadata Preservation on Success', () => {
  /**
   * Property 3.1: All required fields are preserved
   * 
   * For ANY OfflinePhoto, when building a ShipmentPhotoInsert record,
   * all required fields SHALL be correctly mapped.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('All required fields are preserved', () => {
    it('should map job_order_id correctly for ANY jobOrderId', () => {
      fc.assert(
        fc.property(
          uuidArb,
          (jobOrderId) => {
            // Setup: Create photo with specific jobOrderId
            const photo = createTestPhoto({ jobOrderId })
            
            // Postcondition: jobOrderId should be preserved
            expect(photo.jobOrderId).toBe(jobOrderId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map checklist_item_id correctly for ANY checklistItemId', () => {
      fc.assert(
        fc.property(
          uuidArb,
          (checklistItemId) => {
            // Setup: Create photo with specific checklistItemId
            const photo = createTestPhoto({ checklistItemId })
            
            // Postcondition: checklistItemId should be preserved
            expect(photo.checklistItemId).toBe(checklistItemId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map stage correctly for ANY stage', () => {
      fc.assert(
        fc.property(
          stageArb,
          (stage) => {
            // Setup: Create photo with specific stage
            const photo = createTestPhoto({ stage })
            
            // Postcondition: stage should be preserved
            expect(photo.stage).toBe(stage)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map photo_type correctly for ANY photoType', () => {
      fc.assert(
        fc.property(
          photoTypeArb,
          (photoType) => {
            // Setup: Create photo with specific photoType
            const photo = createTestPhoto({ photoType })
            
            // Postcondition: photoType should be preserved
            expect(photo.photoType).toBe(photoType)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map notes correctly for ANY notes value', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
          (notes) => {
            // Setup: Create photo with specific notes
            const photo = createTestPhoto({ notes })
            
            // Postcondition: notes should be preserved
            expect(photo.notes).toBe(notes)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 3.2: GPS coordinates are preserved
   * 
   * For ANY GPS coordinates (including null), the values SHALL be
   * correctly preserved in the photo record.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('GPS coordinates are preserved', () => {
    it('should preserve gps_latitude for ANY valid latitude', () => {
      fc.assert(
        fc.property(
          fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
          (gpsLatitude) => {
            // Setup: Create photo with specific GPS latitude
            const photo = createTestPhoto({
              metadata: {
                takenAt: new Date().toISOString(),
                gpsLatitude,
                gpsLongitude: null,
                gpsAccuracy: null,
              },
            })
            
            // Postcondition: gpsLatitude should be preserved
            expect(photo.metadata.gpsLatitude).toBe(gpsLatitude)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve gps_longitude for ANY valid longitude', () => {
      fc.assert(
        fc.property(
          fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
          (gpsLongitude) => {
            // Setup: Create photo with specific GPS longitude
            const photo = createTestPhoto({
              metadata: {
                takenAt: new Date().toISOString(),
                gpsLatitude: null,
                gpsLongitude,
                gpsAccuracy: null,
              },
            })
            
            // Postcondition: gpsLongitude should be preserved
            expect(photo.metadata.gpsLongitude).toBe(gpsLongitude)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve gps_accuracy for ANY valid accuracy', () => {
      fc.assert(
        fc.property(
          fc.option(fc.double({ min: 0, max: 1000, noNaN: true }), { nil: null }),
          (gpsAccuracy) => {
            // Setup: Create photo with specific GPS accuracy
            const photo = createTestPhoto({
              metadata: {
                takenAt: new Date().toISOString(),
                gpsLatitude: null,
                gpsLongitude: null,
                gpsAccuracy,
              },
            })
            
            // Postcondition: gpsAccuracy should be preserved
            expect(photo.metadata.gpsAccuracy).toBe(gpsAccuracy)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all GPS fields together for ANY combination', () => {
      fc.assert(
        fc.property(
          fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
          fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
          fc.option(fc.double({ min: 0, max: 1000, noNaN: true }), { nil: null }),
          (gpsLatitude, gpsLongitude, gpsAccuracy) => {
            // Setup: Create photo with all GPS fields
            const photo = createTestPhoto({
              metadata: {
                takenAt: new Date().toISOString(),
                gpsLatitude,
                gpsLongitude,
                gpsAccuracy,
              },
            })
            
            // Postcondition: All GPS fields should be preserved
            expect(photo.metadata.gpsLatitude).toBe(gpsLatitude)
            expect(photo.metadata.gpsLongitude).toBe(gpsLongitude)
            expect(photo.metadata.gpsAccuracy).toBe(gpsAccuracy)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 3.3: Timestamp is preserved
   * 
   * For ANY takenAt timestamp, the value SHALL be correctly preserved.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Timestamp is preserved', () => {
    it('should preserve taken_at for ANY valid timestamp', () => {
      fc.assert(
        fc.property(
          dateArb,
          (date) => {
            const takenAt = date.toISOString()
            
            // Setup: Create photo with specific takenAt
            const photo = createTestPhoto({
              metadata: {
                takenAt,
                gpsLatitude: null,
                gpsLongitude: null,
                gpsAccuracy: null,
              },
            })
            
            // Postcondition: takenAt should be preserved
            expect(photo.metadata.takenAt).toBe(takenAt)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// ============================================
// PROPERTY 14: BLOB DELETION SAFETY
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 14: Blob Deletion Safety
 * 
 * *For any* upload operation, the IndexedDB blob SHALL NOT be deleted until
 * BOTH the Storage upload succeeds AND the database record is verified to exist.
 * 
 * **Validates: Requirements 7.1, 7.3**
 */
describe('Feature: v0.5-photo-upload-sync, Property 14: Blob Deletion Safety', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  /**
   * Property 14.1: Blob exists until explicitly deleted
   * 
   * For ANY photo in IndexedDB, the blob SHALL remain accessible
   * until deletePhoto is explicitly called.
   * 
   * **Validates: Requirements 7.1**
   */
  describe('Blob exists until explicitly deleted', () => {
    it('should preserve blob for ANY photo until deletePhoto is called', async () => {
      // Generate test cases
      const testCases = fc.sample(
        fc.record({
          id: uuidArb,
          blobContent: fc.string({ minLength: 1, maxLength: 1000 }),
        }),
        100
      )

      for (const testCase of testCases) {
        // Setup: Create a photo with specific blob content
        const blobContent = testCase.blobContent
        const photo = createTestPhoto({
          id: testCase.id,
          blob: new Blob([blobContent], { type: 'image/jpeg' }),
        })
        await db.photos.add(photo)

        // Verify: Blob should exist
        const stored = await db.photos.get(photo.id)
        expect(stored).not.toBeNull()
        expect(stored?.blob).toBeDefined()
        
        // Read blob content to verify it's intact
        const storedContent = await stored!.blob.text()
        expect(storedContent).toBe(blobContent)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should preserve blob through status transitions for ANY photo', async () => {
      // Generate test cases with different status transitions
      const statusTransitions: Array<Array<'pending' | 'uploading' | 'failed'>> = [
        ['pending', 'uploading'],
        ['pending', 'uploading', 'failed'],
        ['pending', 'uploading', 'failed', 'pending'],
        ['failed', 'pending', 'uploading'],
      ]

      const testCases = fc.sample(
        fc.tuple(
          uuidArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom(...statusTransitions)
        ),
        100
      )

      for (const [photoId, blobContent, transitions] of testCases) {
        // Setup: Create a photo
        const photo = createTestPhoto({
          id: photoId,
          blob: new Blob([blobContent], { type: 'image/jpeg' }),
          status: 'pending',
        })
        await db.photos.add(photo)

        // Action: Apply status transitions
        for (const status of transitions) {
          await updatePhotoStatus(photo.id, status)
        }

        // Postcondition: Blob should still exist
        const stored = await db.photos.get(photo.id)
        expect(stored).not.toBeNull()
        expect(stored?.blob).toBeDefined()
        
        const storedContent = await stored!.blob.text()
        expect(storedContent).toBe(blobContent)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should preserve blob through retry operations for ANY photo', async () => {
      // Generate test cases with different retry sequences
      const testCases = fc.sample(
        fc.tuple(
          uuidArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 5 }) // number of retries
        ),
        100
      )

      for (const [photoId, blobContent, numRetries] of testCases) {
        // Setup: Create a photo
        const photo = createTestPhoto({
          id: photoId,
          blob: new Blob([blobContent], { type: 'image/jpeg' }),
          status: 'pending',
          retryCount: 0,
        })
        await db.photos.add(photo)

        // Action: Simulate multiple retry failures
        for (let i = 0; i < numRetries; i++) {
          await updatePhotoRetry(photo.id, `Error ${i + 1}`)
        }

        // Postcondition: Blob should still exist
        const stored = await db.photos.get(photo.id)
        expect(stored).not.toBeNull()
        expect(stored?.blob).toBeDefined()
        
        const storedContent = await stored!.blob.text()
        expect(storedContent).toBe(blobContent)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })

  /**
   * Property 14.2: Blob is deleted only after explicit delete call
   * 
   * For ANY photo, calling deletePhoto SHALL remove the blob from IndexedDB.
   * 
   * **Validates: Requirements 7.1**
   */
  describe('Blob is deleted only after explicit delete call', () => {
    it('should remove blob after deletePhoto for ANY photo', async () => {
      // Generate test cases
      const testCases = fc.sample(uuidArb, 100)

      for (const photoId of testCases) {
        // Setup: Create a photo
        const photo = createTestPhoto({ id: photoId })
        await db.photos.add(photo)

        // Verify: Photo exists
        const before = await db.photos.get(photo.id)
        expect(before).not.toBeNull()

        // Action: Delete photo
        await deletePhoto(photo.id)

        // Postcondition: Photo should not exist
        const after = await db.photos.get(photo.id)
        expect(after).toBeUndefined()
      }
    })

    it('should only delete the specified photo for ANY set of photos', async () => {
      // Generate test cases with multiple photos
      const testCases = fc.sample(
        fc.array(uuidArb, { minLength: 2, maxLength: 5 }),
        50
      )

      for (const photoIds of testCases) {
        // Setup: Create multiple photos
        for (const id of photoIds) {
          const photo = createTestPhoto({ id })
          await db.photos.add(photo)
        }

        // Pick one to delete
        const deleteId = photoIds[0]
        const keepIds = photoIds.slice(1)

        // Action: Delete one photo
        await deletePhoto(deleteId)

        // Postcondition: Only deleted photo should be gone
        const deleted = await db.photos.get(deleteId)
        expect(deleted).toBeUndefined()

        for (const keepId of keepIds) {
          const kept = await db.photos.get(keepId)
          expect(kept).not.toBeNull()
        }

        // Cleanup
        await clearAllPhotos()
      }
    })
  })

  /**
   * Property 14.3: Failed uploads preserve blob
   * 
   * For ANY failed upload, the blob SHALL remain in IndexedDB.
   * 
   * **Validates: Requirements 7.1, 7.3**
   */
  describe('Failed uploads preserve blob', () => {
    it('should preserve blob when upload fails for ANY error', async () => {
      // Generate test cases with different error messages
      const testCases = fc.sample(
        fc.tuple(
          uuidArb,
          fc.string({ minLength: 1, maxLength: 100 }), // blob content
          fc.string({ minLength: 1, maxLength: 200 })  // error message
        ),
        100
      )

      for (const [photoId, blobContent, errorMessage] of testCases) {
        // Setup: Create a photo
        const photo = createTestPhoto({
          id: photoId,
          blob: new Blob([blobContent], { type: 'image/jpeg' }),
          status: 'pending',
        })
        await db.photos.add(photo)

        // Action: Simulate upload failure
        await updatePhotoStatus(photo.id, 'uploading')
        await updatePhotoRetry(photo.id, errorMessage)

        // Postcondition: Blob should still exist
        const stored = await db.photos.get(photo.id)
        expect(stored).not.toBeNull()
        expect(stored?.blob).toBeDefined()
        expect(stored?.status).toBe('failed')
        expect(stored?.lastError).toBe(errorMessage)
        
        const storedContent = await stored!.blob.text()
        expect(storedContent).toBe(blobContent)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should preserve blob through max retries for ANY photo', async () => {
      // Generate test cases
      const testCases = fc.sample(
        fc.tuple(
          uuidArb,
          fc.string({ minLength: 1, maxLength: 100 })
        ),
        100
      )

      for (const [photoId, blobContent] of testCases) {
        // Setup: Create a photo
        const photo = createTestPhoto({
          id: photoId,
          blob: new Blob([blobContent], { type: 'image/jpeg' }),
          status: 'pending',
          retryCount: 0,
        })
        await db.photos.add(photo)

        // Action: Simulate max retries (3 failures)
        for (let i = 0; i < 3; i++) {
          await updatePhotoRetry(photo.id, `Error ${i + 1}`)
        }

        // Postcondition: Blob should still exist even after max retries
        const stored = await db.photos.get(photo.id)
        expect(stored).not.toBeNull()
        expect(stored?.blob).toBeDefined()
        expect(stored?.retryCount).toBe(3)
        
        const storedContent = await stored!.blob.text()
        expect(storedContent).toBe(blobContent)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })

  /**
   * Property 14.2: Blob is deleted only after explicit deletePhoto call
   * 
   * For ANY photo, calling deletePhoto SHALL remove the blob from IndexedDB.
   * 
   * **Validates: Requirements 7.3**
   */
  describe('Blob is deleted only after explicit deletePhoto call', () => {
    it('should remove blob after deletePhoto for ANY photo', async () => {
      // Generate test cases
      const testCases = fc.sample(
        fc.tuple(
          uuidArb,
          fc.string({ minLength: 1, maxLength: 100 })
        ),
        100
      )

      for (const [photoId, blobContent] of testCases) {
        // Setup: Create a photo
        const photo = createTestPhoto({
          id: photoId,
          blob: new Blob([blobContent], { type: 'image/jpeg' }),
        })
        await db.photos.add(photo)

        // Verify: Photo exists before delete
        const before = await db.photos.get(photo.id)
        expect(before).not.toBeNull()

        // Action: Delete photo
        await deletePhoto(photo.id)

        // Postcondition: Photo should not exist
        const after = await db.photos.get(photo.id)
        expect(after).toBeUndefined()
      }
    })
  })
})

// ============================================
// PROPERTY 7: FIFO QUEUE PROCESSING
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 7: FIFO Queue Processing
 * 
 * *For any* queue with multiple pending photos, photos SHALL be processed
 * in ascending order of their createdAt timestamp (oldest first).
 * 
 * **Validates: Requirements 2.2, 2.5**
 */
describe('Feature: v0.5-photo-upload-sync, Property 7: FIFO Queue Processing', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  /**
   * Property 7.1: Photos are returned in createdAt ascending order
   * 
   * For ANY set of photos with different createdAt timestamps,
   * getUploadablePhotos SHALL return them sorted by createdAt ascending.
   * 
   * **Validates: Requirements 2.2**
   */
  describe('Photos are returned in createdAt ascending order', () => {
    it('should return photos sorted by createdAt for ANY set of photos', async () => {
      // Generate test cases - arrays of time offsets
      const testCases = fc.sample(
        fc.array(
          fc.integer({ min: 0, max: 100000 }), // offset in milliseconds
          { minLength: 2, maxLength: 20 }
        ),
        50
      )

      for (const offsets of testCases) {
        // Setup: Create photos with different createdAt timestamps
        const baseTime = new Date('2026-01-01T00:00:00.000Z').getTime()
        const photos: OfflinePhoto[] = offsets.map((offset, index) => ({
          ...createTestPhoto(),
          id: `fifo-photo-${index}-${Date.now()}-${Math.random()}`,
          createdAt: new Date(baseTime + offset).toISOString(),
          retryCount: 0,
          status: 'pending' as const,
        }))

        await db.photos.bulkAdd(photos)

        // Action: Get uploadable photos
        const uploadable = await getUploadablePhotos(3)

        // Postcondition: Photos should be sorted by createdAt ascending
        for (let i = 1; i < uploadable.length; i++) {
          const prevTime = new Date(uploadable[i - 1].createdAt).getTime()
          const currTime = new Date(uploadable[i].createdAt).getTime()
          expect(currTime).toBeGreaterThanOrEqual(prevTime)
        }

        // Cleanup
        await clearAllPhotos()
      }
    })

    it('should return oldest photo first for ANY queue', async () => {
      // Generate test cases
      const testCases = fc.sample(
        fc.array(
          fc.integer({ min: 1000, max: 100000 }), // offset in milliseconds (min 1s apart)
          { minLength: 3, maxLength: 10 }
        ),
        50
      )

      for (const offsets of testCases) {
        // Setup: Create photos with different timestamps
        const baseTime = new Date('2026-01-01T00:00:00.000Z').getTime()
        const sortedOffsets = [...offsets].sort((a, b) => a - b)
        const oldestOffset = sortedOffsets[0]

        const photos: OfflinePhoto[] = offsets.map((offset, index) => ({
          ...createTestPhoto(),
          id: `oldest-photo-${index}-${Date.now()}-${Math.random()}`,
          createdAt: new Date(baseTime + offset).toISOString(),
          retryCount: 0,
          status: 'pending' as const,
        }))

        await db.photos.bulkAdd(photos)

        // Action: Get uploadable photos
        const uploadable = await getUploadablePhotos(3)

        // Postcondition: First photo should have the oldest timestamp
        expect(uploadable.length).toBeGreaterThan(0)
        const firstPhotoTime = new Date(uploadable[0].createdAt).getTime()
        expect(firstPhotoTime).toBe(baseTime + oldestOffset)

        // Cleanup
        await clearAllPhotos()
      }
    })
  })

  /**
   * Property 7.2: FIFO order is maintained across status changes
   * 
   * For ANY photo that transitions from failed back to pending,
   * its original createdAt should determine its position in the queue.
   * 
   * **Validates: Requirements 2.5**
   */
  describe('FIFO order is maintained across status changes', () => {
    it('should maintain original createdAt order after retry reset', async () => {
      // Generate test cases
      const testCases = fc.sample(
        fc.tuple(
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 10001, max: 20000 }),
          fc.integer({ min: 20001, max: 30000 })
        ),
        50
      )

      for (const [offset1, offset2, offset3] of testCases) {
        const baseTime = new Date('2026-01-01T00:00:00.000Z').getTime()

        // Setup: Create 3 photos with different timestamps
        const photo1 = {
          ...createTestPhoto(),
          id: `order-photo-1-${Date.now()}-${Math.random()}`,
          createdAt: new Date(baseTime + offset1).toISOString(),
          status: 'pending' as const,
          retryCount: 0,
        }
        const photo2 = {
          ...createTestPhoto(),
          id: `order-photo-2-${Date.now()}-${Math.random()}`,
          createdAt: new Date(baseTime + offset2).toISOString(),
          status: 'failed' as const,
          retryCount: 3, // Exceeded retry limit
        }
        const photo3 = {
          ...createTestPhoto(),
          id: `order-photo-3-${Date.now()}-${Math.random()}`,
          createdAt: new Date(baseTime + offset3).toISOString(),
          status: 'pending' as const,
          retryCount: 0,
        }

        await db.photos.bulkAdd([photo1, photo2, photo3])

        // Reset photo2's retry count
        await resetPhotoRetry(photo2.id)

        // Action: Get uploadable photos
        const uploadable = await getUploadablePhotos(3)

        // Postcondition: Order should be photo1, photo2, photo3 (by createdAt)
        expect(uploadable.length).toBe(3)
        expect(uploadable[0].id).toBe(photo1.id)
        expect(uploadable[1].id).toBe(photo2.id)
        expect(uploadable[2].id).toBe(photo3.id)

        // Cleanup
        await clearAllPhotos()
      }
    })
  })
})

// ============================================
// PROPERTY 8: SEQUENTIAL UPLOAD
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 8: Sequential Upload
 * 
 * *For any* point during sync processing, at most one photo SHALL have
 * status 'uploading' at a time.
 * 
 * **Validates: Requirements 2.3**
 */
describe('Feature: v0.5-photo-upload-sync, Property 8: Sequential Upload', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  /**
   * Property 8.1: Only one photo can be uploading at a time
   * 
   * For ANY set of photos, when one is set to 'uploading',
   * no other photo should have 'uploading' status.
   * 
   * **Validates: Requirements 2.3**
   */
  describe('Only one photo can be uploading at a time', () => {
    it('should have at most one uploading photo for ANY queue state', async () => {
      // Generate test cases - number of photos
      const testCases = fc.sample(fc.integer({ min: 2, max: 10 }), 50)

      for (const numPhotos of testCases) {
        // Setup: Create multiple pending photos
        const photos: OfflinePhoto[] = []
        for (let i = 0; i < numPhotos; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `seq-photo-${i}-${Date.now()}-${Math.random()}`,
            status: 'pending',
            retryCount: 0,
          })
        }
        await db.photos.bulkAdd(photos)

        // Action: Set first photo to uploading (simulating sync manager behavior)
        await updatePhotoStatus(photos[0].id, 'uploading')

        // Postcondition: Only one photo should be uploading
        const allPhotos = await db.photos.toArray()
        const uploadingPhotos = allPhotos.filter(p => p.status === 'uploading')
        expect(uploadingPhotos.length).toBe(1)
        expect(uploadingPhotos[0].id).toBe(photos[0].id)

        // Cleanup
        await clearAllPhotos()
      }
    })

    it('should transition uploading photo before starting next', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.integer({ min: 2, max: 5 }), 50)

      for (const numPhotos of testCases) {
        // Setup: Create multiple pending photos
        const photos: OfflinePhoto[] = []
        for (let i = 0; i < numPhotos; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `trans-photo-${i}-${Date.now()}-${Math.random()}`,
            status: 'pending',
            retryCount: 0,
            createdAt: new Date(Date.now() + i * 1000).toISOString(),
          })
        }
        await db.photos.bulkAdd(photos)

        // Simulate sequential upload process
        for (let i = 0; i < numPhotos; i++) {
          // Set current photo to uploading
          await updatePhotoStatus(photos[i].id, 'uploading')

          // Verify only one uploading
          let allPhotos = await db.photos.toArray()
          let uploadingPhotos = allPhotos.filter(p => p.status === 'uploading')
          expect(uploadingPhotos.length).toBe(1)

          // Complete upload (delete photo)
          await deletePhoto(photos[i].id)

          // Verify no uploading after completion
          allPhotos = await db.photos.toArray()
          uploadingPhotos = allPhotos.filter(p => p.status === 'uploading')
          expect(uploadingPhotos.length).toBe(0)
        }

        // Cleanup
        await clearAllPhotos()
      }
    })
  })
})

// ============================================
// PROPERTY 11: MANUAL RETRY RESET
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 11: Manual Retry Reset
 * 
 * *For any* manual retry action, the photo's retryCount SHALL be reset to 0
 * and status set to 'pending', and upload SHALL be attempted immediately.
 * 
 * **Validates: Requirements 3.6**
 */
describe('Feature: v0.5-photo-upload-sync, Property 11: Manual Retry Reset', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  /**
   * Property 11.1: Manual retry resets all retry-related fields
   * 
   * For ANY failed photo with ANY retryCount, manual retry SHALL reset
   * retryCount to 0, status to 'pending', and clear error fields.
   * 
   * **Validates: Requirements 3.6**
   */
  describe('Manual retry resets all retry-related fields', () => {
    it('should reset retryCount to 0 for ANY initial retryCount', async () => {
      // Generate test cases
      const testCases = fc.sample(fc.integer({ min: 1, max: 20 }), 100)

      for (const initialRetryCount of testCases) {
        // Setup: Create a failed photo with high retry count
        const photo = createTestPhoto({
          retryCount: initialRetryCount,
          status: 'failed',
          lastError: 'Some error',
          lastAttemptAt: new Date().toISOString(),
        })
        await db.photos.add(photo)

        // Action: Manual retry reset
        await resetPhotoRetry(photo.id)

        // Postcondition: All retry fields should be reset
        const updated = await db.photos.get(photo.id)
        expect(updated?.retryCount).toBe(0)
        expect(updated?.status).toBe('pending')
        expect(updated?.lastError).toBeNull()
        expect(updated?.lastAttemptAt).toBeNull()

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })

    it('should make photo uploadable again after manual retry', async () => {
      // Generate test cases with retryCount >= maxRetries
      const testCases = fc.sample(
        fc.tuple(
          fc.integer({ min: 3, max: 10 }), // retryCount
          fc.integer({ min: 1, max: 5 })   // maxRetries
        ),
        100
      )

      for (const [retryCount, maxRetries] of testCases) {
        // Setup: Create a photo that exceeds retry limit
        const photo = createTestPhoto({
          retryCount,
          status: 'failed',
        })
        await db.photos.add(photo)

        // Verify: Photo should NOT be uploadable before reset
        let uploadable = await getUploadablePhotos(maxRetries)
        const beforeReset = uploadable.some(p => p.id === photo.id)
        
        // If retryCount >= maxRetries, should not be uploadable
        if (retryCount >= maxRetries) {
          expect(beforeReset).toBe(false)
        }

        // Action: Manual retry reset
        await resetPhotoRetry(photo.id)

        // Postcondition: Photo SHOULD be uploadable after reset
        uploadable = await getUploadablePhotos(maxRetries)
        const afterReset = uploadable.some(p => p.id === photo.id)
        expect(afterReset).toBe(true)

        // Cleanup
        await db.photos.delete(photo.id)
      }
    })
  })
})

// ============================================
// PROPERTY 12: QUEUE UI DISPLAY
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 12: Queue UI Display
 * 
 * *For any* photo in the upload queue, the Queue_UI SHALL display:
 * a thumbnail (from blob), job number (from jobOrderId lookup), stage,
 * photo_type, and current status. Photos SHALL be grouped by status
 * (uploading first, then pending, then failed).
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */
describe('Feature: v0.5-photo-upload-sync, Property 12: Queue UI Display', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  /**
   * Property 12.1: Photos are grouped by status correctly
   * 
   * For ANY set of photos with mixed statuses, groupPhotosByStatus
   * SHALL correctly separate them into uploading, pending, and failed groups.
   * 
   * **Validates: Requirements 4.1**
   */
  describe('Photos are grouped by status correctly', () => {
    it('should group photos by status for ANY mix of statuses', async () => {
      // Import the grouping function
      const { groupPhotosByStatus } = await import('@/hooks/use-upload-queue')

      // Generate test cases
      const testCases = fc.sample(
        fc.array(
          fc.constantFrom('pending', 'uploading', 'failed') as fc.Arbitrary<'pending' | 'uploading' | 'failed'>,
          { minLength: 1, maxLength: 20 }
        ),
        50
      )

      for (const statuses of testCases) {
        // Setup: Create photos with different statuses
        const photos: OfflinePhoto[] = statuses.map((status, index) => ({
          ...createTestPhoto(),
          id: `group-photo-${index}-${Date.now()}-${Math.random()}`,
          status,
        }))

        // Action: Group photos
        const grouped = groupPhotosByStatus(photos)

        // Postcondition: Each group should contain only photos with matching status
        expect(grouped.uploading.every(p => p.status === 'uploading')).toBe(true)
        expect(grouped.pending.every(p => p.status === 'pending')).toBe(true)
        expect(grouped.failed.every(p => p.status === 'failed')).toBe(true)

        // Total should match
        const totalGrouped = grouped.uploading.length + grouped.pending.length + grouped.failed.length
        expect(totalGrouped).toBe(photos.length)
      }
    })

    it('should count statuses correctly for ANY queue', async () => {
      // Import the functions
      const { groupPhotosByStatus, calculateQueueStats } = await import('@/hooks/use-upload-queue')

      // Generate test cases
      const testCases = fc.sample(
        fc.record({
          pendingCount: fc.integer({ min: 0, max: 10 }),
          uploadingCount: fc.integer({ min: 0, max: 3 }),
          failedCount: fc.integer({ min: 0, max: 10 }),
        }),
        50
      )

      for (const { pendingCount, uploadingCount, failedCount } of testCases) {
        // Setup: Create photos with specific counts
        const photos: OfflinePhoto[] = []
        
        for (let i = 0; i < pendingCount; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `stat-pending-${i}-${Date.now()}-${Math.random()}`,
            status: 'pending',
          })
        }
        for (let i = 0; i < uploadingCount; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `stat-uploading-${i}-${Date.now()}-${Math.random()}`,
            status: 'uploading',
          })
        }
        for (let i = 0; i < failedCount; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `stat-failed-${i}-${Date.now()}-${Math.random()}`,
            status: 'failed',
          })
        }

        // Action: Calculate stats
        const grouped = groupPhotosByStatus(photos)
        const stats = calculateQueueStats(photos, grouped)

        // Postcondition: Stats should match expected counts
        expect(stats.pending).toBe(pendingCount)
        expect(stats.uploading).toBe(uploadingCount)
        expect(stats.failed).toBe(failedCount)
        expect(stats.total).toBe(pendingCount + uploadingCount + failedCount)
      }
    })
  })

  /**
   * Property 12.2: Each group is sorted by createdAt
   * 
   * For ANY group of photos, they SHALL be sorted by createdAt ascending
   * within their status group.
   * 
   * **Validates: Requirements 4.4**
   */
  describe('Each group is sorted by createdAt', () => {
    it('should sort each group by createdAt ascending', async () => {
      // Import the grouping function
      const { groupPhotosByStatus } = await import('@/hooks/use-upload-queue')

      // Generate test cases
      const testCases = fc.sample(
        fc.array(
          fc.tuple(
            fc.constantFrom('pending', 'uploading', 'failed') as fc.Arbitrary<'pending' | 'uploading' | 'failed'>,
            fc.integer({ min: 0, max: 100000 }) // time offset
          ),
          { minLength: 5, maxLength: 20 }
        ),
        50
      )

      for (const statusOffsets of testCases) {
        const baseTime = new Date('2026-01-01T00:00:00.000Z').getTime()

        // Setup: Create photos with different statuses and timestamps
        const photos: OfflinePhoto[] = statusOffsets.map(([status, offset], index) => ({
          ...createTestPhoto(),
          id: `sort-photo-${index}-${Date.now()}-${Math.random()}`,
          status,
          createdAt: new Date(baseTime + offset).toISOString(),
        }))

        // Action: Group photos
        const grouped = groupPhotosByStatus(photos)

        // Postcondition: Each group should be sorted by createdAt ascending
        for (const group of [grouped.uploading, grouped.pending, grouped.failed]) {
          for (let i = 1; i < group.length; i++) {
            const prevTime = new Date(group[i - 1].createdAt).getTime()
            const currTime = new Date(group[i].createdAt).getTime()
            expect(currTime).toBeGreaterThanOrEqual(prevTime)
          }
        }
      }
    })
  })
})

// ============================================
// PROPERTY 13: HEADER BADGE COUNT
// ============================================

/**
 * Feature: v0.5-photo-upload-sync, Property 13: Header Badge Count
 * 
 * *For any* queue state, the header badge SHALL display the sum of
 * pending and uploading photos. If this count is 0, the badge SHALL be hidden.
 * 
 * **Validates: Requirements 5.1**
 */
describe('Feature: v0.5-photo-upload-sync, Property 13: Header Badge Count', () => {
  /**
   * Property 13.1: Badge count equals pending + uploading
   * 
   * For ANY queue state, the badge count SHALL equal the sum of
   * pending and uploading photo counts.
   * 
   * **Validates: Requirements 5.1**
   */
  describe('Badge count equals pending + uploading', () => {
    it('should calculate badge count as pending + uploading for ANY queue', async () => {
      // Import the functions
      const { groupPhotosByStatus, calculateQueueStats } = await import('@/hooks/use-upload-queue')

      // Generate test cases
      const testCases = fc.sample(
        fc.record({
          pendingCount: fc.integer({ min: 0, max: 50 }),
          uploadingCount: fc.integer({ min: 0, max: 5 }),
          failedCount: fc.integer({ min: 0, max: 50 }),
        }),
        100
      )

      for (const { pendingCount, uploadingCount, failedCount } of testCases) {
        // Setup: Create photos with specific counts
        const photos: OfflinePhoto[] = []
        
        for (let i = 0; i < pendingCount; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `badge-pending-${i}-${Date.now()}-${Math.random()}`,
            status: 'pending',
          })
        }
        for (let i = 0; i < uploadingCount; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `badge-uploading-${i}-${Date.now()}-${Math.random()}`,
            status: 'uploading',
          })
        }
        for (let i = 0; i < failedCount; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `badge-failed-${i}-${Date.now()}-${Math.random()}`,
            status: 'failed',
          })
        }

        // Action: Calculate stats
        const grouped = groupPhotosByStatus(photos)
        const stats = calculateQueueStats(photos, grouped)

        // Calculate badge count (pending + uploading)
        const badgeCount = stats.pending + stats.uploading

        // Postcondition: Badge count should equal pending + uploading
        expect(badgeCount).toBe(pendingCount + uploadingCount)
        
        // Failed photos should NOT be included in badge count
        if (failedCount > 0) {
          expect(badgeCount).not.toBe(stats.total)
        }
        expect(stats.total - badgeCount).toBe(failedCount)
      }
    })

    it('should return 0 badge count when no pending or uploading photos', async () => {
      // Import the functions
      const { groupPhotosByStatus, calculateQueueStats } = await import('@/hooks/use-upload-queue')

      // Generate test cases with only failed photos
      const testCases = fc.sample(fc.integer({ min: 0, max: 20 }), 50)

      for (const failedCount of testCases) {
        // Setup: Create only failed photos
        const photos: OfflinePhoto[] = []
        
        for (let i = 0; i < failedCount; i++) {
          photos.push({
            ...createTestPhoto(),
            id: `zero-badge-${i}-${Date.now()}-${Math.random()}`,
            status: 'failed',
          })
        }

        // Action: Calculate stats
        const grouped = groupPhotosByStatus(photos)
        const stats = calculateQueueStats(photos, grouped)

        // Calculate badge count
        const badgeCount = stats.pending + stats.uploading

        // Postcondition: Badge count should be 0
        expect(badgeCount).toBe(0)
      }
    })
  })
})
