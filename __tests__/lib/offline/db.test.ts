/**
 * Unit Tests for IndexedDB Database (Dexie)
 * 
 * Tests the PhotoCaptureDB class and helper functions for offline photo storage.
 * Uses fake-indexeddb for testing in Node.js environment.
 * 
 * **Validates: Requirements 3.4.5 (offline support)**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  PhotoCaptureDB,
  db,
  generatePhotoId,
  createOfflinePhoto,
  getPendingPhotos,
  getFailedPhotos,
  getPhotosForJobStage,
  getPhotosForJob,
  updatePhotoStatus,
  deletePhoto,
  getPhotoCountsByStatus,
  clearAllPhotos,
  savePhotoToIndexedDB,
  type OfflinePhoto,
} from '@/lib/offline/db'

// ============================================
// TEST HELPERS
// ============================================

/**
 * Create a test photo with default values
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
    ...overrides,
  }
}

// ============================================
// DATABASE CLASS TESTS
// ============================================

describe('PhotoCaptureDB', () => {
  beforeEach(async () => {
    // Clear database before each test
    await clearAllPhotos()
  })

  afterEach(async () => {
    // Clean up after each test
    await clearAllPhotos()
  })

  describe('Database initialization', () => {
    it('should create a database instance', () => {
      expect(db).toBeInstanceOf(PhotoCaptureDB)
    })

    it('should have a photos table', () => {
      expect(db.photos).toBeDefined()
    })

    it('should have the correct database name', () => {
      expect(db.name).toBe('GamaPhotoCapture')
    })
  })

  describe('CRUD operations', () => {
    it('should add a photo to the database', async () => {
      const photo = createTestPhoto()
      
      await db.photos.add(photo)
      
      const retrieved = await db.photos.get(photo.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(photo.id)
      expect(retrieved?.jobOrderId).toBe(photo.jobOrderId)
      expect(retrieved?.checklistItemId).toBe(photo.checklistItemId)
    })

    it('should retrieve a photo by id', async () => {
      const photo = createTestPhoto()
      await db.photos.add(photo)
      
      const retrieved = await db.photos.get(photo.id)
      
      expect(retrieved).toBeDefined()
      expect(retrieved?.stage).toBe('job_start')
      expect(retrieved?.photoType).toBe('cargo_before')
    })

    it('should update a photo', async () => {
      const photo = createTestPhoto({ status: 'pending' })
      await db.photos.add(photo)
      
      await db.photos.update(photo.id, { status: 'uploading' })
      
      const updated = await db.photos.get(photo.id)
      expect(updated?.status).toBe('uploading')
    })

    it('should delete a photo', async () => {
      const photo = createTestPhoto()
      await db.photos.add(photo)
      
      await db.photos.delete(photo.id)
      
      const deleted = await db.photos.get(photo.id)
      expect(deleted).toBeUndefined()
    })
  })

  describe('Index queries', () => {
    it('should query photos by status', async () => {
      const pending1 = createTestPhoto({ status: 'pending' })
      const pending2 = createTestPhoto({ status: 'pending' })
      const failed = createTestPhoto({ status: 'failed' })
      
      await db.photos.bulkAdd([pending1, pending2, failed])
      
      const pendingPhotos = await db.photos.where('status').equals('pending').toArray()
      expect(pendingPhotos).toHaveLength(2)
      
      const failedPhotos = await db.photos.where('status').equals('failed').toArray()
      expect(failedPhotos).toHaveLength(1)
    })

    it('should query photos by jobOrderId', async () => {
      const job1Photo1 = createTestPhoto({ jobOrderId: 'job-1' })
      const job1Photo2 = createTestPhoto({ jobOrderId: 'job-1' })
      const job2Photo = createTestPhoto({ jobOrderId: 'job-2' })
      
      await db.photos.bulkAdd([job1Photo1, job1Photo2, job2Photo])
      
      const job1Photos = await db.photos.where('jobOrderId').equals('job-1').toArray()
      expect(job1Photos).toHaveLength(2)
      
      const job2Photos = await db.photos.where('jobOrderId').equals('job-2').toArray()
      expect(job2Photos).toHaveLength(1)
    })

    it('should query photos by compound index [jobOrderId+stage]', async () => {
      const jobStartPhoto = createTestPhoto({ jobOrderId: 'job-1', stage: 'job_start' })
      const inTransitPhoto = createTestPhoto({ jobOrderId: 'job-1', stage: 'in_transit' })
      const jobEndPhoto = createTestPhoto({ jobOrderId: 'job-1', stage: 'job_end' })
      const otherJobPhoto = createTestPhoto({ jobOrderId: 'job-2', stage: 'job_start' })
      
      await db.photos.bulkAdd([jobStartPhoto, inTransitPhoto, jobEndPhoto, otherJobPhoto])
      
      const job1StartPhotos = await db.photos
        .where('[jobOrderId+stage]')
        .equals(['job-1', 'job_start'])
        .toArray()
      expect(job1StartPhotos).toHaveLength(1)
      expect(job1StartPhotos[0].stage).toBe('job_start')
    })

    it('should query photos by checklistItemId', async () => {
      const item1Photo = createTestPhoto({ checklistItemId: 'item-1' })
      const item2Photo = createTestPhoto({ checklistItemId: 'item-2' })
      
      await db.photos.bulkAdd([item1Photo, item2Photo])
      
      const item1Photos = await db.photos.where('checklistItemId').equals('item-1').toArray()
      expect(item1Photos).toHaveLength(1)
    })
  })
})

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('Helper Functions', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  describe('generatePhotoId', () => {
    it('should generate a valid UUID', () => {
      const id = generatePhotoId()
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(id).toMatch(uuidRegex)
    })

    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generatePhotoId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('createOfflinePhoto', () => {
    it('should create an OfflinePhoto with correct structure', () => {
      const takenAt = new Date()
      const photo = createOfflinePhoto({
        jobOrderId: 'job-123',
        checklistItemId: 'checklist-456',
        stage: 'job_start',
        photoType: 'cargo_before',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt,
          gpsLatitude: -6.2088,
          gpsLongitude: 106.8456,
          gpsAccuracy: 10,
        },
        notes: 'Test note',
      })
      
      expect(photo.id).toBeDefined()
      expect(photo.jobOrderId).toBe('job-123')
      expect(photo.checklistItemId).toBe('checklist-456')
      expect(photo.stage).toBe('job_start')
      expect(photo.photoType).toBe('cargo_before')
      expect(photo.blob).toBeInstanceOf(Blob)
      expect(photo.metadata.takenAt).toBe(takenAt.toISOString())
      expect(photo.metadata.gpsLatitude).toBe(-6.2088)
      expect(photo.metadata.gpsLongitude).toBe(106.8456)
      expect(photo.metadata.gpsAccuracy).toBe(10)
      expect(photo.notes).toBe('Test note')
      expect(photo.status).toBe('pending')
      expect(photo.createdAt).toBeDefined()
    })

    it('should handle null GPS data', () => {
      const photo = createOfflinePhoto({
        jobOrderId: 'job-123',
        checklistItemId: 'checklist-456',
        stage: 'in_transit',
        photoType: 'cargo_transit',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      })
      
      expect(photo.metadata.gpsLatitude).toBeNull()
      expect(photo.metadata.gpsLongitude).toBeNull()
      expect(photo.metadata.gpsAccuracy).toBeNull()
      expect(photo.notes).toBeNull()
    })

    it('should set status to pending by default', () => {
      const photo = createOfflinePhoto({
        jobOrderId: 'job-123',
        checklistItemId: 'checklist-456',
        stage: 'job_end',
        photoType: 'cargo_after',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      })
      
      expect(photo.status).toBe('pending')
    })
  })

  describe('getPendingPhotos', () => {
    it('should return only pending photos', async () => {
      const pending = createTestPhoto({ status: 'pending' })
      const uploading = createTestPhoto({ status: 'uploading' })
      const failed = createTestPhoto({ status: 'failed' })
      
      await db.photos.bulkAdd([pending, uploading, failed])
      
      const result = await getPendingPhotos()
      
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
    })

    it('should return empty array when no pending photos', async () => {
      const uploading = createTestPhoto({ status: 'uploading' })
      await db.photos.add(uploading)
      
      const result = await getPendingPhotos()
      
      expect(result).toHaveLength(0)
    })
  })

  describe('getFailedPhotos', () => {
    it('should return only failed photos', async () => {
      const pending = createTestPhoto({ status: 'pending' })
      const failed1 = createTestPhoto({ status: 'failed' })
      const failed2 = createTestPhoto({ status: 'failed' })
      
      await db.photos.bulkAdd([pending, failed1, failed2])
      
      const result = await getFailedPhotos()
      
      expect(result).toHaveLength(2)
      expect(result.every(p => p.status === 'failed')).toBe(true)
    })
  })

  describe('getPhotosForJobStage', () => {
    it('should return photos for specific job and stage', async () => {
      const job1Start = createTestPhoto({ jobOrderId: 'job-1', stage: 'job_start' })
      const job1End = createTestPhoto({ jobOrderId: 'job-1', stage: 'job_end' })
      const job2Start = createTestPhoto({ jobOrderId: 'job-2', stage: 'job_start' })
      
      await db.photos.bulkAdd([job1Start, job1End, job2Start])
      
      const result = await getPhotosForJobStage('job-1', 'job_start')
      
      expect(result).toHaveLength(1)
      expect(result[0].jobOrderId).toBe('job-1')
      expect(result[0].stage).toBe('job_start')
    })

    it('should return empty array when no matching photos', async () => {
      const photo = createTestPhoto({ jobOrderId: 'job-1', stage: 'job_start' })
      await db.photos.add(photo)
      
      const result = await getPhotosForJobStage('job-1', 'in_transit')
      
      expect(result).toHaveLength(0)
    })
  })

  describe('getPhotosForJob', () => {
    it('should return all photos for a job', async () => {
      const job1Photo1 = createTestPhoto({ jobOrderId: 'job-1', stage: 'job_start' })
      const job1Photo2 = createTestPhoto({ jobOrderId: 'job-1', stage: 'job_end' })
      const job2Photo = createTestPhoto({ jobOrderId: 'job-2', stage: 'job_start' })
      
      await db.photos.bulkAdd([job1Photo1, job1Photo2, job2Photo])
      
      const result = await getPhotosForJob('job-1')
      
      expect(result).toHaveLength(2)
      expect(result.every(p => p.jobOrderId === 'job-1')).toBe(true)
    })
  })

  describe('updatePhotoStatus', () => {
    it('should update photo status', async () => {
      const photo = createTestPhoto({ status: 'pending' })
      await db.photos.add(photo)
      
      await updatePhotoStatus(photo.id, 'uploading')
      
      const updated = await db.photos.get(photo.id)
      expect(updated?.status).toBe('uploading')
    })

    it('should update status to failed', async () => {
      const photo = createTestPhoto({ status: 'uploading' })
      await db.photos.add(photo)
      
      await updatePhotoStatus(photo.id, 'failed')
      
      const updated = await db.photos.get(photo.id)
      expect(updated?.status).toBe('failed')
    })
  })

  describe('deletePhoto', () => {
    it('should delete a photo by id', async () => {
      const photo = createTestPhoto()
      await db.photos.add(photo)
      
      await deletePhoto(photo.id)
      
      const deleted = await db.photos.get(photo.id)
      expect(deleted).toBeUndefined()
    })

    it('should not throw when deleting non-existent photo', async () => {
      await expect(deletePhoto('non-existent-id')).resolves.not.toThrow()
    })
  })

  describe('getPhotoCountsByStatus', () => {
    it('should return correct counts for each status', async () => {
      const pending1 = createTestPhoto({ status: 'pending' })
      const pending2 = createTestPhoto({ status: 'pending' })
      const uploading = createTestPhoto({ status: 'uploading' })
      const failed1 = createTestPhoto({ status: 'failed' })
      const failed2 = createTestPhoto({ status: 'failed' })
      const failed3 = createTestPhoto({ status: 'failed' })
      
      await db.photos.bulkAdd([pending1, pending2, uploading, failed1, failed2, failed3])
      
      const counts = await getPhotoCountsByStatus()
      
      expect(counts.pending).toBe(2)
      expect(counts.uploading).toBe(1)
      expect(counts.failed).toBe(3)
      expect(counts.total).toBe(6)
    })

    it('should return zeros when database is empty', async () => {
      const counts = await getPhotoCountsByStatus()
      
      expect(counts.pending).toBe(0)
      expect(counts.uploading).toBe(0)
      expect(counts.failed).toBe(0)
      expect(counts.total).toBe(0)
    })
  })

  describe('clearAllPhotos', () => {
    it('should remove all photos from database', async () => {
      const photo1 = createTestPhoto()
      const photo2 = createTestPhoto()
      const photo3 = createTestPhoto()
      
      await db.photos.bulkAdd([photo1, photo2, photo3])
      expect(await db.photos.count()).toBe(3)
      
      await clearAllPhotos()
      
      expect(await db.photos.count()).toBe(0)
    })
  })
})

// ============================================
// SCHEMA VALIDATION TESTS
// ============================================

describe('OfflinePhoto Schema', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  it('should store all required fields', async () => {
    const photo: OfflinePhoto = {
      id: generatePhotoId(),
      jobOrderId: 'job-123',
      checklistItemId: 'checklist-456',
      stage: 'job_start',
      photoType: 'cargo_before',
      blob: new Blob(['test image data'], { type: 'image/jpeg' }),
      metadata: {
        takenAt: '2026-01-31T10:00:00.000Z',
        gpsLatitude: -6.2088,
        gpsLongitude: 106.8456,
        gpsAccuracy: 10.5,
      },
      notes: 'Test notes',
      status: 'pending',
      createdAt: '2026-01-31T10:00:00.000Z',
    }
    
    await db.photos.add(photo)
    const retrieved = await db.photos.get(photo.id)
    
    expect(retrieved).toEqual(photo)
  })

  it('should support all job stages', async () => {
    const stages: Array<'job_start' | 'in_transit' | 'job_end'> = [
      'job_start',
      'in_transit',
      'job_end',
    ]
    
    for (const stage of stages) {
      const photo = createTestPhoto({ stage })
      await db.photos.add(photo)
      
      const retrieved = await db.photos.get(photo.id)
      expect(retrieved?.stage).toBe(stage)
    }
  })

  it('should support all status values', async () => {
    const statuses: Array<'pending' | 'uploading' | 'failed'> = [
      'pending',
      'uploading',
      'failed',
    ]
    
    for (const status of statuses) {
      const photo = createTestPhoto({ status })
      await db.photos.add(photo)
      
      const retrieved = await db.photos.get(photo.id)
      expect(retrieved?.status).toBe(status)
    }
  })

  it('should store blob data correctly', async () => {
    const blobContent = 'test image binary data'
    const blob = new Blob([blobContent], { type: 'image/jpeg' })
    const photo = createTestPhoto({ blob })
    
    await db.photos.add(photo)
    const retrieved = await db.photos.get(photo.id)
    
    expect(retrieved?.blob).toBeInstanceOf(Blob)
    expect(retrieved?.blob.size).toBe(blob.size)
    expect(retrieved?.blob.type).toBe('image/jpeg')
    
    // Verify blob content
    const retrievedText = await retrieved?.blob.text()
    expect(retrievedText).toBe(blobContent)
  })
})


// ============================================
// SAVE PHOTO TO INDEXEDDB TESTS
// ============================================

describe('savePhotoToIndexedDB', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  afterEach(async () => {
    await clearAllPhotos()
  })

  it('should save a captured photo to IndexedDB and return the photo ID', async () => {
    const takenAt = new Date()
    const blob = new Blob(['test image data'], { type: 'image/jpeg' })
    
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-123',
        blob,
        metadata: {
          takenAt,
          gpsLatitude: -6.2088,
          gpsLongitude: 106.8456,
          gpsAccuracy: 10,
        },
        notes: 'Test note',
      },
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    // Verify ID is returned
    expect(photoId).toBeDefined()
    expect(typeof photoId).toBe('string')
    
    // Verify photo was saved to IndexedDB
    const savedPhoto = await db.photos.get(photoId)
    expect(savedPhoto).toBeDefined()
    expect(savedPhoto?.id).toBe(photoId)
  })

  it('should save photo with correct job and checklist references', async () => {
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-789',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-order-abc',
      stage: 'in_transit',
      photoType: 'cargo_transit',
    })
    
    const savedPhoto = await db.photos.get(photoId)
    
    expect(savedPhoto?.jobOrderId).toBe('job-order-abc')
    expect(savedPhoto?.checklistItemId).toBe('checklist-item-789')
    expect(savedPhoto?.stage).toBe('in_transit')
    expect(savedPhoto?.photoType).toBe('cargo_transit')
  })

  it('should save photo with status set to pending', async () => {
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-123',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-order-456',
      stage: 'job_end',
      photoType: 'cargo_after',
    })
    
    const savedPhoto = await db.photos.get(photoId)
    
    expect(savedPhoto?.status).toBe('pending')
  })

  it('should save photo with GPS metadata when available', async () => {
    const takenAt = new Date()
    
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-123',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt,
          gpsLatitude: -6.2088,
          gpsLongitude: 106.8456,
          gpsAccuracy: 15.5,
        },
        notes: null,
      },
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    const savedPhoto = await db.photos.get(photoId)
    
    expect(savedPhoto?.metadata.takenAt).toBe(takenAt.toISOString())
    expect(savedPhoto?.metadata.gpsLatitude).toBe(-6.2088)
    expect(savedPhoto?.metadata.gpsLongitude).toBe(106.8456)
    expect(savedPhoto?.metadata.gpsAccuracy).toBe(15.5)
  })

  it('should save photo with null GPS metadata when unavailable', async () => {
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-123',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    const savedPhoto = await db.photos.get(photoId)
    
    expect(savedPhoto?.metadata.gpsLatitude).toBeNull()
    expect(savedPhoto?.metadata.gpsLongitude).toBeNull()
    expect(savedPhoto?.metadata.gpsAccuracy).toBeNull()
  })

  it('should save photo with notes when provided', async () => {
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-123',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: 'Minor scratch - pre-existing damage',
      },
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'damage',
    })
    
    const savedPhoto = await db.photos.get(photoId)
    
    expect(savedPhoto?.notes).toBe('Minor scratch - pre-existing damage')
  })

  it('should save photo with null notes when not provided', async () => {
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-123',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    const savedPhoto = await db.photos.get(photoId)
    
    expect(savedPhoto?.notes).toBeNull()
  })

  it('should store the blob data correctly', async () => {
    const blobContent = 'test image binary data for verification'
    const blob = new Blob([blobContent], { type: 'image/jpeg' })
    
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-123',
        blob,
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    const savedPhoto = await db.photos.get(photoId)
    
    expect(savedPhoto?.blob).toBeInstanceOf(Blob)
    expect(savedPhoto?.blob.size).toBe(blob.size)
    
    // Verify blob content
    const retrievedText = await savedPhoto?.blob.text()
    expect(retrievedText).toBe(blobContent)
  })

  it('should generate unique IDs for each saved photo', async () => {
    const capturedPhoto = {
      checklistItemId: 'checklist-item-123',
      blob: new Blob(['test'], { type: 'image/jpeg' }),
      metadata: {
        takenAt: new Date(),
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
      notes: null,
    }
    
    const photoId1 = await savePhotoToIndexedDB({
      capturedPhoto,
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    const photoId2 = await savePhotoToIndexedDB({
      capturedPhoto,
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    expect(photoId1).not.toBe(photoId2)
    
    // Both should be saved
    const count = await db.photos.count()
    expect(count).toBe(2)
  })

  it('should set createdAt timestamp', async () => {
    const beforeSave = new Date()
    
    const photoId = await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-item-123',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-order-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    const afterSave = new Date()
    const savedPhoto = await db.photos.get(photoId)
    
    expect(savedPhoto?.createdAt).toBeDefined()
    
    const createdAt = new Date(savedPhoto!.createdAt)
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime())
    expect(createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime())
  })

  it('should support all job stages', async () => {
    const stages: Array<'job_start' | 'in_transit' | 'job_end'> = [
      'job_start',
      'in_transit',
      'job_end',
    ]
    
    for (const stage of stages) {
      const photoId = await savePhotoToIndexedDB({
        capturedPhoto: {
          checklistItemId: `checklist-${stage}`,
          blob: new Blob(['test'], { type: 'image/jpeg' }),
          metadata: {
            takenAt: new Date(),
            gpsLatitude: null,
            gpsLongitude: null,
            gpsAccuracy: null,
          },
          notes: null,
        },
        jobId: 'job-order-456',
        stage,
        photoType: 'cargo_before',
      })
      
      const savedPhoto = await db.photos.get(photoId)
      expect(savedPhoto?.stage).toBe(stage)
    }
  })

  it('should be queryable by job and stage after saving', async () => {
    await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-1',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-123',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-2',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-123',
      stage: 'job_end',
      photoType: 'cargo_after',
    })
    
    await savePhotoToIndexedDB({
      capturedPhoto: {
        checklistItemId: 'checklist-3',
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        metadata: {
          takenAt: new Date(),
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAccuracy: null,
        },
        notes: null,
      },
      jobId: 'job-456',
      stage: 'job_start',
      photoType: 'cargo_before',
    })
    
    // Query by job and stage
    const job123StartPhotos = await db.photos
      .where('[jobOrderId+stage]')
      .equals(['job-123', 'job_start'])
      .toArray()
    
    expect(job123StartPhotos).toHaveLength(1)
    expect(job123StartPhotos[0].checklistItemId).toBe('checklist-1')
  })
})
