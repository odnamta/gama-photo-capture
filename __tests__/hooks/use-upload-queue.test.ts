/**
 * Unit Tests for useUploadQueue Hook
 * 
 * Tests the upload queue hook helper functions that provide access to photos
 * in IndexedDB grouped by status with statistics.
 * 
 * @see hooks/use-upload-queue.ts
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md
 * 
 * **Validates: Requirements 4.1, 4.3**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db, clearAllPhotos, type OfflinePhoto } from '@/lib/offline/db'
import {
  groupPhotosByStatus,
  calculateQueueStats,
  type GroupedPhotos,
} from '@/hooks/use-upload-queue'

// ============================================
// TEST HELPERS
// ============================================

function createTestPhoto(overrides: Partial<OfflinePhoto> = {}): OfflinePhoto {
  return {
    id: crypto.randomUUID(),
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

function createPhotoWithTime(
  status: 'pending' | 'uploading' | 'failed',
  minutesAgo: number
): OfflinePhoto {
  const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000)
  return createTestPhoto({
    status,
    createdAt: createdAt.toISOString(),
  })
}

// ============================================
// SETUP / TEARDOWN
// ============================================

beforeEach(async () => {
  await clearAllPhotos()
})

afterEach(async () => {
  await clearAllPhotos()
})

// ============================================
// groupPhotosByStatus TESTS
// ============================================

describe('groupPhotosByStatus', () => {
  it('should group photos by status correctly', () => {
    const photos: OfflinePhoto[] = [
      createTestPhoto({ id: '1', status: 'pending' }),
      createTestPhoto({ id: '2', status: 'uploading' }),
      createTestPhoto({ id: '3', status: 'failed' }),
      createTestPhoto({ id: '4', status: 'pending' }),
      createTestPhoto({ id: '5', status: 'failed' }),
    ]
    
    const grouped = groupPhotosByStatus(photos)
    
    expect(grouped.pending.length).toBe(2)
    expect(grouped.uploading.length).toBe(1)
    expect(grouped.failed.length).toBe(2)
  })
  
  it('should return empty arrays when no photos', () => {
    const grouped = groupPhotosByStatus([])
    
    expect(grouped.pending).toEqual([])
    expect(grouped.uploading).toEqual([])
    expect(grouped.failed).toEqual([])
  })
  
  it('should sort photos by createdAt within each group (oldest first)', () => {
    const photos: OfflinePhoto[] = [
      createPhotoWithTime('pending', 5),
      createPhotoWithTime('pending', 10),
      createPhotoWithTime('pending', 2),
    ]
    
    const grouped = groupPhotosByStatus(photos)
    
    const times = grouped.pending.map(p => new Date(p.createdAt).getTime())
    expect(times[0]).toBeLessThan(times[1])
    expect(times[1]).toBeLessThan(times[2])
  })
})

// ============================================
// calculateQueueStats TESTS
// ============================================

describe('calculateQueueStats', () => {
  it('should calculate correct statistics', () => {
    const photos: OfflinePhoto[] = [
      createTestPhoto({ status: 'pending', blob: new Blob(['a'.repeat(100)]) }),
      createTestPhoto({ status: 'uploading', blob: new Blob(['b'.repeat(200)]) }),
      createTestPhoto({ status: 'failed', blob: new Blob(['c'.repeat(300)]) }),
    ]
    
    const grouped = groupPhotosByStatus(photos)
    const stats = calculateQueueStats(photos, grouped)
    
    expect(stats.total).toBe(3)
    expect(stats.pending).toBe(1)
    expect(stats.uploading).toBe(1)
    expect(stats.failed).toBe(1)
    expect(stats.totalSize).toBe(600)
  })
  
  it('should return zero stats for empty queue', () => {
    const grouped: GroupedPhotos = { uploading: [], pending: [], failed: [] }
    const stats = calculateQueueStats([], grouped)
    
    expect(stats.total).toBe(0)
    expect(stats.pending).toBe(0)
    expect(stats.uploading).toBe(0)
    expect(stats.failed).toBe(0)
    expect(stats.totalSize).toBe(0)
  })
})

// ============================================
// INTEGRATION WITH INDEXEDDB TESTS
// ============================================

describe('Integration with IndexedDB', () => {
  it('should work with photos stored in IndexedDB', async () => {
    const photo1 = createTestPhoto({ status: 'pending' })
    const photo2 = createTestPhoto({ status: 'failed' })
    await db.photos.bulkAdd([photo1, photo2])
    
    const photos = await db.photos.toArray()
    const grouped = groupPhotosByStatus(photos)
    const stats = calculateQueueStats(photos, grouped)
    
    expect(photos.length).toBe(2)
    expect(grouped.pending.length).toBe(1)
    expect(grouped.failed.length).toBe(1)
    expect(stats.total).toBe(2)
  })

  it('should handle empty IndexedDB', async () => {
    const photos = await db.photos.toArray()
    const grouped = groupPhotosByStatus(photos)
    const stats = calculateQueueStats(photos, grouped)
    
    expect(photos.length).toBe(0)
    expect(stats.total).toBe(0)
  })
})
