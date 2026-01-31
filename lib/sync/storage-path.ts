/**
 * Storage Path Service for GAMA Photo Capture
 * 
 * Generates consistent storage paths for uploading photos to Supabase Storage.
 * Path format: {userId}/{YYYY}/{MM}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - Storage Path Service section
 * @see .kiro/steering/database-schema.md - Storage Path Convention section
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 */

import type { OfflinePhoto } from '@/lib/offline/db'

// ============================================
// INTERFACES
// ============================================

/**
 * Components needed to build a storage path
 */
export interface StoragePathComponents {
  /** User ID (UUID) */
  userId: string
  /** Year in YYYY format (4 digits) */
  year: string
  /** Month in MM format (2 digits with leading zero) */
  month: string
  /** Job order ID (UUID) */
  jobOrderId: string
  /** Job stage (job_start, in_transit, job_end) */
  stage: string
  /** Unix timestamp in seconds (not milliseconds) */
  timestamp: number
  /** Photo ID (UUID) */
  photoId: string
}

/**
 * Year and month extracted from a date
 */
export interface YearMonth {
  /** Year in YYYY format (4 digits) */
  year: string
  /** Month in MM format (2 digits with leading zero) */
  month: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract year and month from a Date object
 * 
 * Returns year as 4-digit string (YYYY) and month as 2-digit string (MM)
 * with leading zero for single-digit months.
 * 
 * @param date - Date to extract year and month from
 * @returns Object with year (YYYY) and month (MM) strings
 * 
 * @example
 * extractYearMonth(new Date('2026-01-15')) // { year: '2026', month: '01' }
 * extractYearMonth(new Date('2026-12-31')) // { year: '2026', month: '12' }
 * 
 * **Validates: Requirements 8.2**
 */
export function extractYearMonth(date: Date): YearMonth {
  const year = date.getFullYear().toString()
  // getMonth() returns 0-11, so add 1 and pad with leading zero
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  
  return { year, month }
}

/**
 * Convert a Date to Unix timestamp in seconds
 * 
 * JavaScript Date.getTime() returns milliseconds, so we divide by 1000
 * and floor to get whole seconds.
 * 
 * @param date - Date to convert
 * @returns Unix timestamp in seconds
 * 
 * @example
 * dateToUnixSeconds(new Date('2026-01-31T12:00:00Z')) // 1769860800
 * 
 * **Validates: Requirements 8.4**
 */
export function dateToUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Build a storage path from individual components
 * 
 * Constructs the path following the convention:
 * {userId}/{year}/{month}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg
 * 
 * @param components - All components needed for the path
 * @returns Complete storage path string
 * 
 * @example
 * buildStoragePath({
 *   userId: 'abc123-user-id',
 *   year: '2026',
 *   month: '01',
 *   jobOrderId: 'jo-uuid',
 *   stage: 'job_start',
 *   timestamp: 1706745600,
 *   photoId: 'xyz789'
 * })
 * // Returns: 'abc123-user-id/2026/01/jo-uuid/job_start/1706745600_xyz789.jpg'
 * 
 * **Validates: Requirements 8.1**
 */
export function buildStoragePath(components: StoragePathComponents): string {
  const {
    userId,
    year,
    month,
    jobOrderId,
    stage,
    timestamp,
    photoId,
  } = components
  
  // Construct path following the convention
  return `${userId}/${year}/${month}/${jobOrderId}/${stage}/${timestamp}_${photoId}.jpg`
}

/**
 * Generate a complete storage path for a photo
 * 
 * This is the main function to use when uploading a photo. It extracts
 * all necessary components from the photo metadata and user ID to
 * generate the full storage path.
 * 
 * @param userId - The authenticated user's ID
 * @param photo - The offline photo record from IndexedDB
 * @returns Complete storage path for Supabase Storage
 * 
 * @example
 * const photo: OfflinePhoto = {
 *   id: 'xyz789',
 *   jobOrderId: 'jo-uuid',
 *   stage: 'job_start',
 *   metadata: { takenAt: '2026-01-31T12:00:00Z', ... },
 *   ...
 * }
 * generateStoragePath('abc123-user-id', photo)
 * // Returns: 'abc123-user-id/2026/01/jo-uuid/job_start/1769860800_xyz789.jpg'
 * 
 * **Validates: Requirements 1.1, 8.1, 8.2, 8.3, 8.4**
 */
export function generateStoragePath(userId: string, photo: OfflinePhoto): string {
  // Parse the takenAt timestamp from the photo metadata
  const takenAt = new Date(photo.metadata.takenAt)
  
  // Extract year and month from the taken date
  const { year, month } = extractYearMonth(takenAt)
  
  // Convert taken date to Unix timestamp in seconds
  const timestamp = dateToUnixSeconds(takenAt)
  
  // Build the complete storage path
  return buildStoragePath({
    userId,
    year,
    month,
    jobOrderId: photo.jobOrderId,
    stage: photo.stage,
    timestamp,
    photoId: photo.id,
  })
}

/**
 * Parse a storage path back into its components
 * 
 * Useful for extracting metadata from an existing storage path.
 * Returns null if the path doesn't match the expected format.
 * 
 * @param path - Storage path to parse
 * @returns Parsed components or null if invalid format
 * 
 * @example
 * parseStoragePath('abc123/2026/01/jo-uuid/job_start/1706745600_xyz789.jpg')
 * // Returns: { userId: 'abc123', year: '2026', month: '01', ... }
 * 
 * parseStoragePath('invalid/path')
 * // Returns: null
 */
export function parseStoragePath(path: string): StoragePathComponents | null {
  // Expected format: {userId}/{year}/{month}/{jobOrderId}/{stage}/{timestamp}_{photoId}.jpg
  // Split by '/' to get path segments
  const segments = path.split('/')
  
  // We expect exactly 6 segments
  if (segments.length !== 6) {
    return null
  }
  
  const [userId, year, month, jobOrderId, stage, filename] = segments
  
  // Validate year format (4 digits)
  if (!/^\d{4}$/.test(year)) {
    return null
  }
  
  // Validate month format (2 digits, 01-12)
  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    return null
  }
  
  // Parse filename: {timestamp}_{photoId}.jpg
  const filenameMatch = filename.match(/^(\d+)_(.+)\.jpg$/)
  if (!filenameMatch) {
    return null
  }
  
  const [, timestampStr, photoId] = filenameMatch
  const timestamp = parseInt(timestampStr, 10)
  
  // Validate timestamp is a reasonable Unix timestamp (after year 2000)
  if (isNaN(timestamp) || timestamp < 946684800) {
    return null
  }
  
  return {
    userId,
    year,
    month,
    jobOrderId,
    stage,
    timestamp,
    photoId,
  }
}

/**
 * Validate that a storage path matches the expected format
 * 
 * @param path - Storage path to validate
 * @returns true if the path is valid, false otherwise
 */
export function isValidStoragePath(path: string): boolean {
  return parseStoragePath(path) !== null
}
