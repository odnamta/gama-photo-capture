/**
 * Unit Tests for Upload Service
 * 
 * Tests the upload service module that handles uploading photos
 * from IndexedDB to Supabase Storage and creating database records.
 * 
 * @see lib/sync/upload-service.ts
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md
 * 
 * **Validates: Requirements 1.1, 1.3, 7.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { OfflinePhoto } from '@/lib/offline/db'

// ============================================
// MOCK SETUP
// ============================================

// Mock the Supabase client
const mockUpload = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockList = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        list: mockList,
      }),
    },
    from: () => ({
      insert: mockInsert,
      select: mockSelect,
    }),
  }),
}))

// Setup mock chain for database operations
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()
  
  // Setup default mock chain for insert
  mockInsert.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ single: mockSingle, eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })
})

// Import after mocking
import {
  uploadToStorage,
  insertShipmentPhoto,
  verifyUpload,
  verifyStorageBlob,
  uploadPhoto,
  recoverPartialUpload,
  STORAGE_BUCKET,
  DEFAULT_MIME_TYPE,
} from '@/lib/sync/upload-service'

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
    blob: new Blob(['test image data'], { type: 'image/jpeg' }),
    metadata: {
      takenAt: '2026-01-31T12:00:00.000Z',
      gpsLatitude: -6.2088,
      gpsLongitude: 106.8456,
      gpsAccuracy: 10,
    },
    notes: 'Test notes',
    status: 'pending',
    createdAt: '2026-01-31T12:00:00.000Z',
    retryCount: 0,
    lastError: null,
    lastAttemptAt: null,
    ...overrides,
  }
}

// ============================================
// CONSTANTS TESTS
// ============================================

describe('Upload Service Constants', () => {
  it('should export correct storage bucket name', () => {
    expect(STORAGE_BUCKET).toBe('shipment-photos')
  })
  
  it('should export correct default MIME type', () => {
    expect(DEFAULT_MIME_TYPE).toBe('image/jpeg')
  })
})

// ============================================
// uploadToStorage TESTS
// ============================================

describe('uploadToStorage', () => {
  it('should upload blob to Supabase Storage successfully', async () => {
    // Setup: Mock successful upload
    mockUpload.mockResolvedValue({
      data: { path: 'user-123/2026/01/job-456/job_start/1234567890_photo-789.jpg' },
      error: null,
    })
    
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    const path = 'user-123/2026/01/job-456/job_start/1234567890_photo-789.jpg'
    
    // Action
    const result = await uploadToStorage(blob, path)
    
    // Assert
    expect(result.success).toBe(true)
    expect(result.path).toBe(path)
    expect(result.error).toBeUndefined()
    
    // Verify upload was called with correct parameters
    expect(mockUpload).toHaveBeenCalledWith(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    })
  })
  
  it('should return error when upload fails', async () => {
    // Setup: Mock failed upload
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Storage quota exceeded' },
    })
    
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    const path = 'user-123/2026/01/job-456/job_start/1234567890_photo-789.jpg'
    
    // Action
    const result = await uploadToStorage(blob, path)
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.path).toBeUndefined()
    expect(result.error).toBe('Storage quota exceeded')
  })
  
  it('should handle exceptions during upload', async () => {
    // Setup: Mock exception
    mockUpload.mockRejectedValue(new Error('Network error'))
    
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    const path = 'user-123/2026/01/job-456/job_start/1234567890_photo-789.jpg'
    
    // Action
    const result = await uploadToStorage(blob, path)
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })
  
  it('should handle non-Error exceptions', async () => {
    // Setup: Mock non-Error exception
    mockUpload.mockRejectedValue('String error')
    
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    const path = 'test/path.jpg'
    
    // Action
    const result = await uploadToStorage(blob, path)
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unknown storage upload error')
  })
})

// ============================================
// insertShipmentPhoto TESTS
// ============================================

describe('insertShipmentPhoto', () => {
  it('should insert shipment photo record successfully', async () => {
    // Setup: Mock successful insert
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto()
    const userId = 'user-uuid-abc'
    const storagePath = 'user-uuid-abc/2026/01/job-order-uuid-456/job_start/1769860800_photo-uuid-123.jpg'
    
    // Action
    const result = await insertShipmentPhoto(photo, userId, storagePath)
    
    // Assert
    expect(result.success).toBe(true)
    expect(result.id).toBe('photo-uuid-123')
    expect(result.error).toBeUndefined()
    
    // Verify insert was called
    expect(mockInsert).toHaveBeenCalled()
  })
  
  it('should include all metadata in the insert record', async () => {
    // Setup: Capture the insert argument
    let insertedRecord: Record<string, unknown> | null = null
    mockInsert.mockImplementation((record) => {
      insertedRecord = record
      return { select: mockSelect }
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto({
      id: 'test-photo-id',
      jobOrderId: 'test-job-id',
      checklistItemId: 'test-checklist-id',
      stage: 'job_end',
      photoType: 'damage',
      metadata: {
        takenAt: '2026-06-15T14:30:00.000Z',
        gpsLatitude: 1.234,
        gpsLongitude: 5.678,
        gpsAccuracy: 5,
      },
      notes: 'Damage on left side',
    })
    const userId = 'test-user-id'
    const storagePath = 'test/path.jpg'
    
    // Action
    await insertShipmentPhoto(photo, userId, storagePath)
    
    // Assert: Verify all fields are included
    expect(insertedRecord).not.toBeNull()
    expect(insertedRecord!.id).toBe('test-photo-id')
    expect(insertedRecord!.job_order_id).toBe('test-job-id')
    expect(insertedRecord!.checklist_item_id).toBe('test-checklist-id')
    expect(insertedRecord!.uploaded_by).toBe('test-user-id')
    expect(insertedRecord!.photo_type).toBe('damage')
    expect(insertedRecord!.stage).toBe('job_end')
    expect(insertedRecord!.storage_path).toBe('test/path.jpg')
    expect(insertedRecord!.storage_bucket).toBe('shipment-photos')
    expect(insertedRecord!.gps_latitude).toBe(1.234)
    expect(insertedRecord!.gps_longitude).toBe(5.678)
    expect(insertedRecord!.gps_accuracy).toBe(5)
    expect(insertedRecord!.taken_at).toBe('2026-06-15T14:30:00.000Z')
    expect(insertedRecord!.notes).toBe('Damage on left side')
    expect(insertedRecord!.has_damage).toBe(true) // damage photo type
    expect(insertedRecord!.upload_status).toBe('completed')
    expect(insertedRecord!.sync_status).toBe('synced')
  })
  
  it('should set has_damage to true for damage photo type', async () => {
    let insertedRecord: Record<string, unknown> | null = null
    mockInsert.mockImplementation((record) => {
      insertedRecord = record
      return { select: mockSelect }
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto({ photoType: 'damage' })
    
    await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
    
    expect(insertedRecord!.has_damage).toBe(true)
  })
  
  it('should set has_damage to false for non-damage photo types', async () => {
    let insertedRecord: Record<string, unknown> | null = null
    mockInsert.mockImplementation((record) => {
      insertedRecord = record
      return { select: mockSelect }
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto({ photoType: 'cargo_before' })
    
    await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
    
    expect(insertedRecord!.has_damage).toBe(false)
  })
  
  it('should return error when insert fails', async () => {
    // Setup: Mock failed insert
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Foreign key constraint violation' },
    })
    
    const photo = createMockPhoto()
    
    // Action
    const result = await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.id).toBeUndefined()
    expect(result.error).toBe('Foreign key constraint violation')
  })
  
  it('should handle exceptions during insert', async () => {
    // Setup: Mock exception
    mockInsert.mockImplementation(() => {
      throw new Error('Database connection lost')
    })
    
    const photo = createMockPhoto()
    
    // Action
    const result = await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Database connection lost')
  })
  
  it('should handle null GPS coordinates', async () => {
    let insertedRecord: Record<string, unknown> | null = null
    mockInsert.mockImplementation((record) => {
      insertedRecord = record
      return { select: mockSelect }
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto({
      metadata: {
        takenAt: '2026-01-31T12:00:00.000Z',
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracy: null,
      },
    })
    
    await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
    
    expect(insertedRecord!.gps_latitude).toBeNull()
    expect(insertedRecord!.gps_longitude).toBeNull()
    expect(insertedRecord!.gps_accuracy).toBeNull()
  })
  
  it('should handle null notes', async () => {
    let insertedRecord: Record<string, unknown> | null = null
    mockInsert.mockImplementation((record) => {
      insertedRecord = record
      return { select: mockSelect }
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto({ notes: null })
    
    await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
    
    expect(insertedRecord!.notes).toBeNull()
  })
})

// ============================================
// verifyUpload TESTS
// ============================================

describe('verifyUpload', () => {
  it('should return true when record exists', async () => {
    // Setup: Mock record found
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    // Action
    const result = await verifyUpload('photo-uuid-123')
    
    // Assert
    expect(result).toBe(true)
  })
  
  it('should return false when record does not exist', async () => {
    // Setup: Mock record not found
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Record not found' },
    })
    
    // Action
    const result = await verifyUpload('non-existent-id')
    
    // Assert
    expect(result).toBe(false)
  })
  
  it('should return false on exception', async () => {
    // Setup: Mock exception
    mockSelect.mockImplementation(() => {
      throw new Error('Database error')
    })
    
    // Action
    const result = await verifyUpload('photo-uuid-123')
    
    // Assert
    expect(result).toBe(false)
  })
})

// ============================================
// verifyStorageBlob TESTS
// ============================================

describe('verifyStorageBlob', () => {
  it('should return true when blob exists', async () => {
    // Setup: Mock file found in list
    mockList.mockResolvedValue({
      data: [{ name: 'photo-789.jpg' }],
      error: null,
    })
    
    // Action
    const result = await verifyStorageBlob('user-123/2026/01/job-456/job_start/photo-789.jpg')
    
    // Assert
    expect(result).toBe(true)
  })
  
  it('should return false when blob does not exist', async () => {
    // Setup: Mock empty list
    mockList.mockResolvedValue({
      data: [],
      error: null,
    })
    
    // Action
    const result = await verifyStorageBlob('user-123/2026/01/job-456/job_start/non-existent.jpg')
    
    // Assert
    expect(result).toBe(false)
  })
  
  it('should return false on storage error', async () => {
    // Setup: Mock error
    mockList.mockResolvedValue({
      data: null,
      error: { message: 'Access denied' },
    })
    
    // Action
    const result = await verifyStorageBlob('path/to/file.jpg')
    
    // Assert
    expect(result).toBe(false)
  })
  
  it('should return false on exception', async () => {
    // Setup: Mock exception
    mockList.mockRejectedValue(new Error('Network error'))
    
    // Action
    const result = await verifyStorageBlob('path/to/file.jpg')
    
    // Assert
    expect(result).toBe(false)
  })
})

// ============================================
// uploadPhoto TESTS
// ============================================

describe('uploadPhoto', () => {
  it('should upload photo successfully', async () => {
    // Setup: Mock successful upload and insert
    mockUpload.mockResolvedValue({
      data: { path: 'user-123/2026/01/job-456/job_start/1769860800_photo-789.jpg' },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto()
    const userId = 'user-123'
    
    // Action
    const result = await uploadPhoto(photo, userId)
    
    // Assert
    expect(result.success).toBe(true)
    expect(result.photoId).toBe('photo-uuid-123')
    expect(result.storagePath).toBeDefined()
    expect(result.shipmentPhotoId).toBe('photo-uuid-123')
    expect(result.error).toBeUndefined()
  })
  
  it('should call onProgress callback during upload', async () => {
    // Setup
    mockUpload.mockResolvedValue({
      data: { path: 'test/path.jpg' },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto()
    const progressUpdates: Array<{ photoId: string; progress: number }> = []
    const onProgress = (photoId: string, progress: number) => {
      progressUpdates.push({ photoId, progress })
    }
    
    // Action
    await uploadPhoto(photo, 'user-123', { onProgress })
    
    // Assert: Should have progress updates at 0, 10, 60, 100
    expect(progressUpdates.length).toBeGreaterThanOrEqual(4)
    expect(progressUpdates[0].progress).toBe(0)
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100)
  })
  
  it('should return error when storage upload fails', async () => {
    // Setup: Mock failed storage upload
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Storage error' },
    })
    
    const photo = createMockPhoto()
    
    // Action
    const result = await uploadPhoto(photo, 'user-123')
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.photoId).toBe('photo-uuid-123')
    expect(result.error).toContain('Storage upload failed')
    expect(result.storagePath).toBeUndefined()
  })
  
  it('should return error with storagePath when database insert fails', async () => {
    // Setup: Mock successful storage but failed DB insert
    mockUpload.mockResolvedValue({
      data: { path: 'test/path.jpg' },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })
    
    const photo = createMockPhoto()
    
    // Action
    const result = await uploadPhoto(photo, 'user-123')
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.photoId).toBe('photo-uuid-123')
    expect(result.error).toContain('Database insert failed')
    // Should include storagePath for partial upload recovery
    expect(result.storagePath).toBeDefined()
  })
  
  it('should handle exceptions during upload', async () => {
    // Setup: Mock exception
    mockUpload.mockRejectedValue(new Error('Unexpected error'))
    
    const photo = createMockPhoto()
    
    // Action
    const result = await uploadPhoto(photo, 'user-123')
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unexpected error')
  })
})

// ============================================
// recoverPartialUpload TESTS
// ============================================

describe('recoverPartialUpload', () => {
  it('should recover partial upload when blob exists but record does not', async () => {
    // Setup: Blob exists, record does not exist, then insert succeeds
    mockList.mockResolvedValue({
      data: [{ name: 'photo-789.jpg' }],
      error: null,
    })
    
    // First call to verifyUpload returns false (record doesn't exist)
    // Then insert succeeds
    let selectCallCount = 0
    mockSelect.mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        // First call is from verifyUpload - return not found
        return {
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Not found' } }),
          }),
        }
      }
      // Second call is from insert - return success
      return {
        single: () => Promise.resolve({ data: { id: 'photo-uuid-123' }, error: null }),
      }
    })
    
    const photo = createMockPhoto()
    const storagePath = 'user-123/2026/01/job-456/job_start/photo-789.jpg'
    
    // Action
    const result = await recoverPartialUpload(photo, 'user-123', storagePath)
    
    // Assert
    expect(result.success).toBe(true)
    expect(result.photoId).toBe('photo-uuid-123')
    expect(result.storagePath).toBe(storagePath)
  })
  
  it('should return success if record already exists', async () => {
    // Setup: Blob exists, record already exists
    mockList.mockResolvedValue({
      data: [{ name: 'photo-789.jpg' }],
      error: null,
    })
    mockSelect.mockReturnValue({
      eq: () => ({
        single: () => Promise.resolve({ data: { id: 'photo-uuid-123' }, error: null }),
      }),
    })
    
    const photo = createMockPhoto()
    const storagePath = 'user-123/2026/01/job-456/job_start/photo-789.jpg'
    
    // Action
    const result = await recoverPartialUpload(photo, 'user-123', storagePath)
    
    // Assert
    expect(result.success).toBe(true)
    expect(result.photoId).toBe('photo-uuid-123')
  })
  
  it('should return error when blob does not exist', async () => {
    // Setup: Blob does not exist
    mockList.mockResolvedValue({
      data: [],
      error: null,
    })
    
    const photo = createMockPhoto()
    const storagePath = 'user-123/2026/01/job-456/job_start/non-existent.jpg'
    
    // Action
    const result = await recoverPartialUpload(photo, 'user-123', storagePath)
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Storage blob not found for recovery')
  })
  
  it('should handle exceptions during recovery', async () => {
    // Setup: Mock exception - blob exists check throws
    mockList.mockResolvedValue({
      data: [{ name: 'photo-789.jpg' }],
      error: null,
    })
    
    // Make verifyUpload throw an exception
    mockSelect.mockImplementation(() => {
      throw new Error('Recovery error')
    })
    
    const photo = createMockPhoto()
    
    // Action
    const result = await recoverPartialUpload(photo, 'user-123', 'path/photo-789.jpg')
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toContain('Recovery error')
  })
})

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('should handle empty blob', async () => {
    mockUpload.mockResolvedValue({
      data: { path: 'test/path.jpg' },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto({
      blob: new Blob([], { type: 'image/jpeg' }),
    })
    
    const result = await uploadPhoto(photo, 'user-123')
    
    // Should still attempt upload (server will validate)
    expect(mockUpload).toHaveBeenCalled()
  })
  
  it('should handle very long storage paths', async () => {
    mockUpload.mockResolvedValue({
      data: { path: 'very/long/path/that/goes/on/and/on.jpg' },
      error: null,
    })
    
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    const longPath = 'a'.repeat(100) + '/' + 'b'.repeat(100) + '/' + 'c'.repeat(100) + '.jpg'
    
    const result = await uploadToStorage(blob, longPath)
    
    expect(mockUpload).toHaveBeenCalledWith(longPath, blob, expect.any(Object))
  })
  
  it('should handle special characters in notes', async () => {
    let insertedRecord: Record<string, unknown> | null = null
    mockInsert.mockImplementation((record) => {
      insertedRecord = record
      return { select: mockSelect }
    })
    mockSingle.mockResolvedValue({
      data: { id: 'photo-uuid-123' },
      error: null,
    })
    
    const photo = createMockPhoto({
      notes: 'Special chars: <>&"\'日本語',
    })
    
    await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
    
    expect(insertedRecord!.notes).toBe('Special chars: <>&"\'日本語')
  })
  
  it('should handle all job stages', async () => {
    const stages = ['job_start', 'in_transit', 'job_end'] as const
    
    for (const stage of stages) {
      let insertedRecord: Record<string, unknown> | null = null
      mockInsert.mockImplementation((record) => {
        insertedRecord = record
        return { select: mockSelect }
      })
      mockSingle.mockResolvedValue({
        data: { id: 'photo-uuid-123' },
        error: null,
      })
      
      const photo = createMockPhoto({ stage })
      
      await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
      
      expect(insertedRecord!.stage).toBe(stage)
    }
  })
  
  it('should handle all photo types', async () => {
    const photoTypes = ['cargo_before', 'cargo_after', 'cargo_transit', 'document', 'damage', 'issue']
    
    for (const photoType of photoTypes) {
      let insertedRecord: Record<string, unknown> | null = null
      mockInsert.mockImplementation((record) => {
        insertedRecord = record
        return { select: mockSelect }
      })
      mockSingle.mockResolvedValue({
        data: { id: 'photo-uuid-123' },
        error: null,
      })
      
      const photo = createMockPhoto({ photoType })
      
      await insertShipmentPhoto(photo, 'user-id', 'path.jpg')
      
      expect(insertedRecord!.photo_type).toBe(photoType)
      expect(insertedRecord!.has_damage).toBe(photoType === 'damage')
    }
  })
})
