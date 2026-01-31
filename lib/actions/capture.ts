'use server'

import { createClient } from '@/lib/supabase/server'
import type { PhotoChecklistItem, JobStage } from '@/types/job'

/**
 * Existing photo data for resume support
 */
export interface ExistingPhoto {
  /** ID of the checklist item this photo fulfills */
  checklistItemId: string
  /** URL for displaying the photo thumbnail */
  thumbnailUrl: string
}

/**
 * Load checklist items for a specific job stage
 * 
 * Returns only active checklist items, ordered by sequence.
 * Used to initialize the guided capture flow.
 * 
 * @param stage - The job stage to load checklist for ('job_start', 'in_transit', 'job_end')
 * @returns Object containing checklist items array and optional error message
 * 
 * **Validates: Requirements 3.1.2**
 * 
 * @example
 * ```typescript
 * const { checklist, error } = await loadChecklist('job_start')
 * if (error) {
 *   console.error('Failed to load checklist:', error)
 *   return
 * }
 * // checklist is ordered by sequence, filtered by stage and is_active
 * ```
 */
export async function loadChecklist(stage: JobStage): Promise<{
  checklist: PhotoChecklistItem[]
  error: string | null
}> {
  const supabase = await createClient()

  // Get current user to verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { checklist: [], error: 'Not authenticated' }
  }

  // Query photo_checklists filtered by stage, ordered by sequence
  const { data, error } = await supabase
    .from('photo_checklists')
    .select('*')
    .eq('stage', stage)
    .eq('is_active', true)
    .order('sequence')

  if (error) {
    return { checklist: [], error: error.message }
  }

  // Map database rows to PhotoChecklistItem type
  const checklist: PhotoChecklistItem[] = (data || []).map(item => ({
    id: item.id,
    stage: item.stage as JobStage,
    sequence: item.sequence,
    title: item.title,
    title_id: item.title_id,
    description: item.description,
    description_id: item.description_id,
    tips: item.tips,
    is_required: item.is_required,
    photo_type: item.photo_type,
    example_image_url: item.example_image_url,
    is_active: item.is_active,
  }))

  return { checklist, error: null }
}

/**
 * Load existing photos for a job and stage (for resume support)
 * 
 * Returns photos that have already been captured for the given job and stage.
 * Used to determine which checklist items are already complete when resuming
 * an interrupted capture session.
 * 
 * @param jobId - The job order ID
 * @param stage - The job stage to load photos for
 * @returns Object containing existing photos array and optional error message
 * 
 * **Validates: Requirements 3.7.1**
 * 
 * @example
 * ```typescript
 * const { photos, error } = await loadExistingPhotos(jobId, 'job_start')
 * if (error) {
 *   console.error('Failed to load existing photos:', error)
 *   return
 * }
 * // Use photos to determine resume position
 * const existingIds = photos.map(p => p.checklistItemId)
 * ```
 */
export async function loadExistingPhotos(
  jobId: string,
  stage: JobStage
): Promise<{
  photos: ExistingPhoto[]
  error: string | null
}> {
  const supabase = await createClient()

  // Get current user to verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { photos: [], error: 'Not authenticated' }
  }

  // Query shipment_photos for this job and stage
  const { data, error } = await supabase
    .from('shipment_photos')
    .select('checklist_item_id, thumbnail_path, storage_path')
    .eq('job_order_id', jobId)
    .eq('stage', stage)
    .eq('is_deleted', false)

  if (error) {
    return { photos: [], error: error.message }
  }

  // Map to ExistingPhoto format
  // Use thumbnail_path if available, otherwise fall back to storage_path
  const photos: ExistingPhoto[] = (data || [])
    .filter(p => p.checklist_item_id !== null)
    .map(p => ({
      checklistItemId: p.checklist_item_id as string,
      thumbnailUrl: p.thumbnail_path || p.storage_path,
    }))

  return { photos, error: null }
}

/**
 * Stage completion result
 */
export interface StageCompletionResult {
  /** Whether all required photos have been captured */
  isComplete: boolean
  /** Number of required checklist items */
  requiredCount: number
  /** Number of required items that have been captured */
  capturedCount: number
  /** IDs of required items that are still missing */
  missingItemIds: string[]
}

/**
 * Check if a stage is complete (all required photos captured)
 * 
 * Compares captured photos against required checklist items for the stage.
 * A stage is complete when all required checklist items have corresponding photos.
 * 
 * @param jobId - The job order ID
 * @param stage - The job stage to check
 * @returns Object containing completion status and details
 * 
 * **Validates: Requirements 3.6.5**
 * 
 * @example
 * ```typescript
 * const result = await checkStageCompletion(jobId, 'job_start')
 * if (result.error) {
 *   console.error('Failed to check completion:', result.error)
 *   return
 * }
 * if (result.completion.isComplete) {
 *   console.log('Stage is complete!')
 * } else {
 *   console.log(`Missing ${result.completion.missingItemIds.length} required photos`)
 * }
 * ```
 */
export async function checkStageCompletion(
  jobId: string,
  stage: JobStage
): Promise<{
  completion: StageCompletionResult
  error: string | null
}> {
  const supabase = await createClient()

  // Get current user to verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      completion: {
        isComplete: false,
        requiredCount: 0,
        capturedCount: 0,
        missingItemIds: []
      },
      error: 'Not authenticated'
    }
  }

  // Get required checklist items for this stage
  const { data: checklistItems, error: checklistError } = await supabase
    .from('photo_checklists')
    .select('id')
    .eq('stage', stage)
    .eq('is_required', true)
    .eq('is_active', true)

  if (checklistError) {
    return {
      completion: {
        isComplete: false,
        requiredCount: 0,
        capturedCount: 0,
        missingItemIds: []
      },
      error: checklistError.message
    }
  }

  const requiredIds = (checklistItems || []).map(item => item.id)
  
  // If no required items, stage is automatically complete
  if (requiredIds.length === 0) {
    return {
      completion: {
        isComplete: true,
        requiredCount: 0,
        capturedCount: 0,
        missingItemIds: []
      },
      error: null
    }
  }

  // Get captured photos for this job and stage
  const { data: photos, error: photosError } = await supabase
    .from('shipment_photos')
    .select('checklist_item_id')
    .eq('job_order_id', jobId)
    .eq('stage', stage)
    .eq('is_deleted', false)
    .in('checklist_item_id', requiredIds)

  if (photosError) {
    return {
      completion: {
        isComplete: false,
        requiredCount: requiredIds.length,
        capturedCount: 0,
        missingItemIds: requiredIds
      },
      error: photosError.message
    }
  }

  // Find which required items have been captured
  const capturedIds = new Set(
    (photos || [])
      .map(p => p.checklist_item_id)
      .filter((id): id is string => id !== null)
  )

  const missingItemIds = requiredIds.filter(id => !capturedIds.has(id))
  const capturedCount = requiredIds.length - missingItemIds.length

  return {
    completion: {
      isComplete: missingItemIds.length === 0,
      requiredCount: requiredIds.length,
      capturedCount,
      missingItemIds
    },
    error: null
  }
}
