/**
 * Unit Tests for useUploadQueue Hook
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db, clearAllPhotos, type OfflinePhoto } from '@/lib/offline/db'
import {
  groupPhotosByStatus,
  calculateQueueStats,
  type GroupedPhotos,
} from '@/hooks/use-upload-queue'

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

beforeEach(async () => {
  await clearAllPhotos()
})

afterEach(async () => {
  await clearAllPhotos()
})

describe('groupPhotosByStatus', () => {
  it('should group photos by status correctly', () => {
    const photos: OfflinePhoto[] = [
      createTestPhoto({ id: '1', status: 'pending' }),
      createTestPhoto({ id: '2', status: 'uploading' }),
      createTestPhoto({ id: '3', status: 'failed' }),
    ]
    
    const grouped = groupPhotosByStatus(photos)
    
    expect(grouped.pending.length).toBe(1)
    expect(grouped.uploading.length).toBe(1)
    expect(grouped.failed.length).toBe(1)
  })
  
  it('should return empty arrays when no photos', () => {
    const grouped = groupPhotosByStatus([])
    
    expect(grouped.pending).toEqual([])
    expect(grouped.uploading).toEqual([])
    expect(grouped.failed).toEqual([])
  })
})

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
    expect(stats.totalSize).toBe(0)
  })
})

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
})
