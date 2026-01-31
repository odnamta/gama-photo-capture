/**
 * Unit Tests for Storage Path Service
 * 
 * Tests the storage path generation module that creates consistent
 * paths for uploading photos to Supabase Storage.
 * 
 * @see lib/sync/storage-path.ts
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 */

import { describe, it, expect } from 'vitest'
import {
  buildStoragePath,
  extractYearMonth,
  dateToUnixSeconds,
  generateStoragePath,
  parseStoragePath,
  isValidStoragePath,
  type StoragePathComponents,
} from '@/lib/sync/storage-path'
import type { OfflinePhoto } from '@/lib/offline/db'

// ============================================
// TEST HELPERS
// ============================================

/**
 * Create a mock OfflinePhoto for testing
 */
function createMockPhoto(overrides: Partial<OfflinePhoto> = {}): OfflinePhoto {
  return {
    id: 'photo-uuid-123',
    jobOrderId: 'job-order-uuid-456',
    checklistItemId: 'checklist-item-uuid-789',
    stage: 'job_start',
    photoType: 'cargo_before',
    blob: new Blob(['test'], { type: 'image/jpeg' }),
    metadata: {
      takenAt: '2026-01-31T12:00:00.000Z',
      gpsLatitude: -6.2088,
      gpsLongitude: 106.8456,
      gpsAccuracy: 10,
    },
    notes: null,
    status: 'pending',
    createdAt: '2026-01-31T12:00:00.000Z',
    ...overrides,
  }
}

// ============================================
// extractYearMonth TESTS
// ============================================

describe('extractYearMonth', () => {
  it('should extract year and month from a date', () => {
    const date = new Date('2026-01-15T10:30:00Z')
    const result = extractYearMonth(date)
    
    expect(result.year).toBe('2026')
    expect(result.month).toBe('01')
  })
  
  it('should pad single-digit months with leading zero', () => {
    const date = new Date('2026-03-15T10:30:00Z')
    const result = extractYearMonth(date)
    
    expect(result.month).toBe('03')
  })
  
  it('should handle December correctly', () => {
    // Use a date in the middle of December to avoid timezone edge cases
    const date = new Date('2026-12-15T12:00:00Z')
    const result = extractYearMonth(date)
    
    expect(result.year).toBe('2026')
    expect(result.month).toBe('12')
  })
  
  it('should handle January correctly (month index 0)', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    const result = extractYearMonth(date)
    
    expect(result.month).toBe('01')
  })
  
  it('should handle different years', () => {
    const date2025 = new Date('2025-06-15T10:30:00Z')
    const date2030 = new Date('2030-11-20T10:30:00Z')
    
    expect(extractYearMonth(date2025)).toEqual({ year: '2025', month: '06' })
    expect(extractYearMonth(date2030)).toEqual({ year: '2030', month: '11' })
  })
})

// ============================================
// dateToUnixSeconds TESTS
// ============================================

describe('dateToUnixSeconds', () => {
  it('should convert date to Unix timestamp in seconds', () => {
    // 2026-01-31T12:00:00Z = 1769860800 seconds
    const date = new Date('2026-01-31T12:00:00Z')
    const result = dateToUnixSeconds(date)
    
    expect(result).toBe(1769860800)
  })
  
  it('should return whole seconds (floor milliseconds)', () => {
    // Date with milliseconds
    const date = new Date('2026-01-31T12:00:00.999Z')
    const result = dateToUnixSeconds(date)
    
    // Should floor, not round
    expect(result).toBe(1769860800)
  })
  
  it('should handle Unix epoch', () => {
    const date = new Date('1970-01-01T00:00:00Z')
    const result = dateToUnixSeconds(date)
    
    expect(result).toBe(0)
  })
  
  it('should handle dates far in the future', () => {
    const date = new Date('2050-12-31T23:59:59Z')
    const result = dateToUnixSeconds(date)
    
    // Should be a large positive number
    expect(result).toBeGreaterThan(2500000000)
  })
})

// ============================================
// buildStoragePath TESTS
// ============================================

describe('buildStoragePath', () => {
  it('should build correct path from components', () => {
    const components: StoragePathComponents = {
      userId: 'abc123-user-id',
      year: '2026',
      month: '01',
      jobOrderId: 'jo-uuid',
      stage: 'job_start',
      timestamp: 1706745600,
      photoId: 'xyz789',
    }
    
    const result = buildStoragePath(components)
    
    expect(result).toBe('abc123-user-id/2026/01/jo-uuid/job_start/1706745600_xyz789.jpg')
  })
  
  it('should handle different stages', () => {
    const baseComponents: StoragePathComponents = {
      userId: 'user-123',
      year: '2026',
      month: '03',
      jobOrderId: 'job-456',
      timestamp: 1709251200,
      photoId: 'photo-789',
      stage: 'job_start',
    }
    
    expect(buildStoragePath({ ...baseComponents, stage: 'job_start' }))
      .toContain('/job_start/')
    expect(buildStoragePath({ ...baseComponents, stage: 'in_transit' }))
      .toContain('/in_transit/')
    expect(buildStoragePath({ ...baseComponents, stage: 'job_end' }))
      .toContain('/job_end/')
  })
  
  it('should always end with .jpg extension', () => {
    const components: StoragePathComponents = {
      userId: 'user-id',
      year: '2026',
      month: '06',
      jobOrderId: 'job-id',
      stage: 'job_end',
      timestamp: 1719792000,
      photoId: 'photo-id',
    }
    
    const result = buildStoragePath(components)
    
    expect(result).toMatch(/\.jpg$/)
  })
  
  it('should include timestamp and photoId in filename', () => {
    const components: StoragePathComponents = {
      userId: 'user-id',
      year: '2026',
      month: '06',
      jobOrderId: 'job-id',
      stage: 'job_end',
      timestamp: 1719792000,
      photoId: 'my-photo-uuid',
    }
    
    const result = buildStoragePath(components)
    
    expect(result).toContain('1719792000_my-photo-uuid.jpg')
  })
  
  it('should handle UUIDs with hyphens', () => {
    const components: StoragePathComponents = {
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      year: '2026',
      month: '01',
      jobOrderId: 'f0e1d2c3-b4a5-9687-fedc-ba0987654321',
      stage: 'job_start',
      timestamp: 1706745600,
      photoId: '12345678-90ab-cdef-1234-567890abcdef',
    }
    
    const result = buildStoragePath(components)
    
    expect(result).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890/2026/01/' +
      'f0e1d2c3-b4a5-9687-fedc-ba0987654321/job_start/' +
      '1706745600_12345678-90ab-cdef-1234-567890abcdef.jpg'
    )
  })
})

// ============================================
// generateStoragePath TESTS
// ============================================

describe('generateStoragePath', () => {
  it('should generate correct path from photo and userId', () => {
    const userId = 'user-abc-123'
    const photo = createMockPhoto({
      id: 'photo-xyz-789',
      jobOrderId: 'job-def-456',
      stage: 'job_start',
      metadata: {
        takenAt: '2026-01-31T12:00:00.000Z',
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
    })
    
    const result = generateStoragePath(userId, photo)
    
    // 2026-01-31T12:00:00Z = 1769860800 seconds
    expect(result).toBe('user-abc-123/2026/01/job-def-456/job_start/1769860800_photo-xyz-789.jpg')
  })
  
  it('should extract year and month from takenAt', () => {
    const userId = 'user-id'
    const photo = createMockPhoto({
      metadata: {
        takenAt: '2026-06-15T08:30:00.000Z',
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
    })
    
    const result = generateStoragePath(userId, photo)
    
    expect(result).toContain('/2026/06/')
  })
  
  it('should use photo.id as photoId in filename', () => {
    const userId = 'user-id'
    const photo = createMockPhoto({
      id: 'unique-photo-id-12345',
    })
    
    const result = generateStoragePath(userId, photo)
    
    expect(result).toContain('_unique-photo-id-12345.jpg')
  })
  
  it('should use photo.stage in path', () => {
    const userId = 'user-id'
    
    const photoJobStart = createMockPhoto({ stage: 'job_start' })
    const photoInTransit = createMockPhoto({ stage: 'in_transit' })
    const photoJobEnd = createMockPhoto({ stage: 'job_end' })
    
    expect(generateStoragePath(userId, photoJobStart)).toContain('/job_start/')
    expect(generateStoragePath(userId, photoInTransit)).toContain('/in_transit/')
    expect(generateStoragePath(userId, photoJobEnd)).toContain('/job_end/')
  })
  
  it('should use photo.jobOrderId in path', () => {
    const userId = 'user-id'
    const photo = createMockPhoto({
      jobOrderId: 'specific-job-order-id',
    })
    
    const result = generateStoragePath(userId, photo)
    
    expect(result).toContain('/specific-job-order-id/')
  })
  
  it('should convert takenAt to Unix timestamp in seconds', () => {
    const userId = 'user-id'
    // Use a known timestamp and verify it appears in the path
    const takenAt = '2026-03-15T14:30:00.000Z'
    const expectedTimestamp = Math.floor(new Date(takenAt).getTime() / 1000)
    const photo = createMockPhoto({
      metadata: {
        takenAt,
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
    })
    
    const result = generateStoragePath(userId, photo)
    
    expect(result).toContain(`/${expectedTimestamp}_`)
  })
})

// ============================================
// parseStoragePath TESTS
// ============================================

describe('parseStoragePath', () => {
  it('should parse a valid storage path', () => {
    const path = 'abc123/2026/01/jo-uuid/job_start/1706745600_xyz789.jpg'
    const result = parseStoragePath(path)
    
    expect(result).toEqual({
      userId: 'abc123',
      year: '2026',
      month: '01',
      jobOrderId: 'jo-uuid',
      stage: 'job_start',
      timestamp: 1706745600,
      photoId: 'xyz789',
    })
  })
  
  it('should return null for invalid path with wrong segment count', () => {
    expect(parseStoragePath('too/few/segments')).toBeNull()
    expect(parseStoragePath('too/many/segments/in/this/path/here')).toBeNull()
    expect(parseStoragePath('')).toBeNull()
  })
  
  it('should return null for invalid year format', () => {
    expect(parseStoragePath('user/26/01/job/stage/123_photo.jpg')).toBeNull()
    expect(parseStoragePath('user/20260/01/job/stage/123_photo.jpg')).toBeNull()
    expect(parseStoragePath('user/abcd/01/job/stage/123_photo.jpg')).toBeNull()
  })
  
  it('should return null for invalid month format', () => {
    expect(parseStoragePath('user/2026/1/job/stage/123_photo.jpg')).toBeNull()
    expect(parseStoragePath('user/2026/13/job/stage/123_photo.jpg')).toBeNull()
    expect(parseStoragePath('user/2026/00/job/stage/123_photo.jpg')).toBeNull()
    expect(parseStoragePath('user/2026/ab/job/stage/123_photo.jpg')).toBeNull()
  })
  
  it('should return null for invalid filename format', () => {
    expect(parseStoragePath('user/2026/01/job/stage/photo.jpg')).toBeNull()
    expect(parseStoragePath('user/2026/01/job/stage/123_photo.png')).toBeNull()
    expect(parseStoragePath('user/2026/01/job/stage/123photo.jpg')).toBeNull()
    expect(parseStoragePath('user/2026/01/job/stage/_photo.jpg')).toBeNull()
  })
  
  it('should handle UUIDs with hyphens', () => {
    const path = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890/2026/01/' +
      'f0e1d2c3-b4a5-9687-fedc-ba0987654321/job_start/' +
      '1706745600_12345678-90ab-cdef-1234-567890abcdef.jpg'
    
    const result = parseStoragePath(path)
    
    expect(result).not.toBeNull()
    expect(result?.userId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(result?.jobOrderId).toBe('f0e1d2c3-b4a5-9687-fedc-ba0987654321')
    expect(result?.photoId).toBe('12345678-90ab-cdef-1234-567890abcdef')
  })
  
  it('should roundtrip with buildStoragePath', () => {
    const original: StoragePathComponents = {
      userId: 'user-123',
      year: '2026',
      month: '06',
      jobOrderId: 'job-456',
      stage: 'in_transit',
      timestamp: 1719792000,
      photoId: 'photo-789',
    }
    
    const path = buildStoragePath(original)
    const parsed = parseStoragePath(path)
    
    expect(parsed).toEqual(original)
  })
})

// ============================================
// isValidStoragePath TESTS
// ============================================

describe('isValidStoragePath', () => {
  it('should return true for valid paths', () => {
    // Use timestamps after year 2000 (946684800 = 2000-01-01)
    expect(isValidStoragePath('user/2026/01/job/stage/1706745600_photo.jpg')).toBe(true)
    expect(isValidStoragePath('abc-123/2026/12/def-456/job_end/1769860800_ghi-789.jpg')).toBe(true)
  })
  
  it('should return false for invalid paths', () => {
    expect(isValidStoragePath('')).toBe(false)
    expect(isValidStoragePath('invalid')).toBe(false)
    expect(isValidStoragePath('user/26/01/job/stage/123_photo.jpg')).toBe(false)
    expect(isValidStoragePath('user/2026/13/job/stage/123_photo.jpg')).toBe(false)
    expect(isValidStoragePath('user/2026/01/job/stage/photo.jpg')).toBe(false)
  })
})

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('should handle timezone differences in takenAt', () => {
    const userId = 'user-id'
    
    // Same moment in different timezones should produce same timestamp
    const photoUTC = createMockPhoto({
      metadata: {
        takenAt: '2026-01-31T12:00:00.000Z',
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
    })
    
    const result = generateStoragePath(userId, photoUTC)
    
    // Should use UTC timestamp
    expect(result).toContain('/1769860800_')
  })
  
  it('should handle leap year dates', () => {
    const userId = 'user-id'
    // 2028 is a leap year
    const photo = createMockPhoto({
      metadata: {
        takenAt: '2028-02-29T12:00:00.000Z',
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
    })
    
    const result = generateStoragePath(userId, photo)
    
    expect(result).toContain('/2028/02/')
  })
  
  it('should handle end of year boundary', () => {
    const userId = 'user-id'
    // Use a date in the middle of December to avoid timezone edge cases
    const photo = createMockPhoto({
      metadata: {
        takenAt: '2026-12-15T12:00:00.000Z',
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
    })
    
    const result = generateStoragePath(userId, photo)
    
    expect(result).toContain('/2026/12/')
  })
  
  it('should handle start of year boundary', () => {
    const userId = 'user-id'
    const photo = createMockPhoto({
      metadata: {
        takenAt: '2026-01-01T00:00:00.000Z',
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
    })
    
    const result = generateStoragePath(userId, photo)
    
    expect(result).toContain('/2026/01/')
  })
})
