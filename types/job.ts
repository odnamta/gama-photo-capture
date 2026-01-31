/**
 * Job Types for GAMA Photo Capture
 * 
 * These types define job-related data structures for the guided
 * photo capture workflow.
 */

// ============================================
// STAGE TYPES
// ============================================

/**
 * Job stages for photo capture
 */
export type JobStage = 'job_start' | 'in_transit' | 'job_end'

/**
 * All job stages in order
 */
export const JOB_STAGES: JobStage[] = ['job_start', 'in_transit', 'job_end']

/**
 * Stage display labels
 */
export const STAGE_LABELS: Record<JobStage, { en: string; id: string }> = {
  job_start: { en: 'Job Start', id: 'Mulai Pekerjaan' },
  in_transit: { en: 'In Transit', id: 'Dalam Perjalanan' },
  job_end: { en: 'Job End', id: 'Selesai Pekerjaan' },
}

/**
 * Stage descriptions
 */
export const STAGE_DESCRIPTIONS: Record<JobStage, { en: string; id: string }> = {
  job_start: { 
    en: 'Document cargo before loading', 
    id: 'Dokumentasi kargo sebelum dimuat' 
  },
  in_transit: { 
    en: 'Optional photos during transport', 
    id: 'Foto opsional selama perjalanan' 
  },
  job_end: { 
    en: 'Document delivery completion', 
    id: 'Dokumentasi penyelesaian pengiriman' 
  },
}

// ============================================
// CHECKLIST TYPES
// ============================================

/**
 * Photo checklist item from database
 */
export interface PhotoChecklistItem {
  id: string
  stage: JobStage
  sequence: number
  title: string
  title_id: string | null
  description: string | null
  description_id: string | null
  tips: string | null
  is_required: boolean
  photo_type: string
  example_image_url: string | null
  is_active: boolean
}

// ============================================
// JOB TYPES
// ============================================

/**
 * Job order from database (simplified for photo capture)
 */
export interface JobOrder {
  id: string
  jo_number: string
  description: string | null
  status: string
  customer_id: string
  project_id: string | null
  created_at: string
  // Joined data
  customer?: {
    id: string
    name: string
  }
}

/**
 * Job with photo progress for display
 */
export interface JobWithProgress {
  id: string
  joNumber: string
  description: string | null
  status: string
  customerName: string
  // Assignment info
  assignmentDate: string
  // Photo progress per stage
  progress: {
    job_start: StageProgress
    in_transit: StageProgress
    job_end: StageProgress
  }
}

/**
 * Progress for a single stage
 */
export interface StageProgress {
  required: number
  completed: number
  total: number // required + optional items in checklist
  isComplete: boolean
  isLocked: boolean
}

/**
 * Stage status for UI display
 */
export type StageStatus = 'locked' | 'not_started' | 'in_progress' | 'complete'

/**
 * Get stage status from progress
 */
export function getStageStatus(progress: StageProgress): StageStatus {
  if (progress.isLocked) return 'locked'
  if (progress.isComplete) return 'complete'
  if (progress.completed > 0) return 'in_progress'
  return 'not_started'
}

/**
 * Stage status colors for UI
 */
export const STAGE_STATUS_COLORS: Record<StageStatus, string> = {
  locked: 'bg-muted text-muted-foreground',
  not_started: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

// ============================================
// RESOURCE ASSIGNMENT TYPES
// ============================================

/**
 * Resource assignment from database
 */
export interface ResourceAssignment {
  id: string
  resource_id: string
  job_order_id: string | null
  start_date: string
  end_date: string
  status: string | null
}
