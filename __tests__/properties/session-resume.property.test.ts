import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { PhotoChecklistItem, JobStage } from '@/types/job'
import { createInitialState, type CaptureSessionOptions } from '@/types/capture'

/**
 * Property-Based Tests for Session Resume Position
 * 
 * Feature: v0.3-guided-capture, Property 13: Session resume position
 * 
 * *For any* capture session with existing photos:
 * - The initial currentIndex should be the index of the first checklist item
 *   without a corresponding photo
 * - If all items have photos, start at index 0 (allow retakes)
 * 
 * **Validates: Requirements 3.7.1, 3.7.2, 3.7.3**
 */

// ============================================
// ARBITRARIES (Test Data Generators)
// ============================================

/**
 * Generator for job stages
 */
const jobStageArb: fc.Arbitrary<JobStage> = fc.constantFrom(
  'job_start',
  'in_transit',
  'job_end'
)

/**
 * Generator for photo types
 */
const photoTypeArb: fc.Arbitrary<string> = fc.constantFrom(
  'cargo_before',
  'cargo_after',
  'cargo_transit',
  'document',
  'damage',
  'issue'
)

/**
 * Generator for a single checklist item
 */
const checklistItemArb: fc.Arbitrary<PhotoChecklistItem> = fc.record({
  id: fc.uuid(),
  stage: jobStageArb,
  sequence: fc.integer({ min: 1, max: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  title_id: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  description_id: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  tips: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  is_required: fc.boolean(),
  photo_type: photoTypeArb,
  example_image_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.constant(true),
})

/**
 * Generator for a non-empty checklist (1-10 items)
 */
const checklistArb: fc.Arbitrary<PhotoChecklistItem[]> = fc
  .array(checklistItemArb, { minLength: 1, maxLength: 10 })
  .map((items) =>
    // Ensure unique IDs and sequential sequence numbers
    items.map((item, index) => ({
      ...item,
      id: `item-${index}`,
      sequence: index + 1,
    }))
  )

/**
 * Generator for session options with no existing photos
 */
const sessionOptionsNoExistingArb: fc.Arbitrary<CaptureSessionOptions> = fc
  .tuple(fc.uuid(), jobStageArb, checklistArb)
  .map(([jobId, stage, checklist]) => ({
    jobId,
    stage,
    checklist,
    existingPhotoIds: [],
  }))

/**
 * Generator for session options with some existing photos
 */
const sessionOptionsWithExistingArb: fc.Arbitrary<CaptureSessionOptions> = fc
  .tuple(fc.uuid(), jobStageArb, checklistArb)
  .chain(([jobId, stage, checklist]) => {
    // Generate a random subset of existing photo IDs
    const existingPhotoIdsArb = fc.subarray(
      checklist.map((item) => item.id),
      { minLength: 0, maxLength: checklist.length }
    )

    return existingPhotoIdsArb.map((existingPhotoIds) => ({
      jobId,
      stage,
      checklist,
      existingPhotoIds,
    }))
  })

/**
 * Generator for session options with all photos existing
 */
const sessionOptionsAllExistingArb: fc.Arbitrary<CaptureSessionOptions> = fc
  .tuple(fc.uuid(), jobStageArb, checklistArb)
  .map(([jobId, stage, checklist]) => ({
    jobId,
    stage,
    checklist,
    existingPhotoIds: checklist.map((item) => item.id),
  }))

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculates the expected initial index based on existing photos
 * This mirrors the logic in createInitialState
 */
function calculateExpectedInitialIndex(
  checklist: PhotoChecklistItem[],
  existingPhotoIds: string[]
): number {
  const existingSet = new Set(existingPhotoIds)
  const firstMissingIndex = checklist.findIndex((item) => !existingSet.has(item.id))
  
  // If all items have photos, start at 0 (allow retakes)
  return firstMissingIndex === -1 ? 0 : firstMissingIndex
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 13: Session resume position', () => {
  /**
   * **Validates: Requirements 3.7.1, 3.7.2, 3.7.3**
   * 
   * *For any* capture session with existing photos:
   * - The initial currentIndex should be the index of the first checklist item
   *   without a corresponding photo
   * - If all items have photos, start at index 0 (allow retakes)
   */

  it('should start at index 0 when no existing photos for ANY checklist', () => {
    fc.assert(
      fc.property(sessionOptionsNoExistingArb, (options) => {
        // Precondition: No existing photos
        expect(options.existingPhotoIds).toHaveLength(0)

        // Action: Create initial state
        const state = createInitialState(options)

        // Postcondition: Should start at index 0
        expect(state.currentIndex).toBe(0)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should start at first missing item index for ANY partial completion', () => {
    fc.assert(
      fc.property(
        sessionOptionsWithExistingArb.filter(
          (options) =>
            options.existingPhotoIds!.length > 0 &&
            options.existingPhotoIds!.length < options.checklist.length
        ),
        (options) => {
          // Precondition: Some but not all photos exist
          expect(options.existingPhotoIds!.length).toBeGreaterThan(0)
          expect(options.existingPhotoIds!.length).toBeLessThan(options.checklist.length)

          // Action: Create initial state
          const state = createInitialState(options)

          // Calculate expected index
          const expectedIndex = calculateExpectedInitialIndex(
            options.checklist,
            options.existingPhotoIds!
          )

          // Postcondition: Should start at first missing item
          expect(state.currentIndex).toBe(expectedIndex)

          // Verify the item at currentIndex doesn't have an existing photo
          const currentItem = options.checklist[state.currentIndex]
          expect(options.existingPhotoIds).not.toContain(currentItem.id)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should start at index 0 when ALL photos exist (allow retakes)', () => {
    fc.assert(
      fc.property(sessionOptionsAllExistingArb, (options) => {
        // Precondition: All photos exist
        expect(options.existingPhotoIds!.length).toBe(options.checklist.length)

        // Action: Create initial state
        const state = createInitialState(options)

        // Postcondition: Should start at index 0 (allow retakes)
        expect(state.currentIndex).toBe(0)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should skip consecutive existing photos at the start', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) => checklist.length >= 3),
        (checklist) => {
          // Create options with first N items having photos
          const numExisting = Math.floor(checklist.length / 2)
          const existingPhotoIds = checklist.slice(0, numExisting).map((item) => item.id)

          const options: CaptureSessionOptions = {
            jobId: 'test-job',
            stage: 'job_start',
            checklist,
            existingPhotoIds,
          }

          // Action: Create initial state
          const state = createInitialState(options)

          // Postcondition: Should start at the first item without a photo
          expect(state.currentIndex).toBe(numExisting)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle gaps in existing photos correctly', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) => checklist.length >= 4),
        (checklist) => {
          // Create options with gaps (e.g., items 0, 2 have photos, but not 1)
          const existingPhotoIds = [checklist[0].id, checklist[2].id]

          const options: CaptureSessionOptions = {
            jobId: 'test-job',
            stage: 'job_start',
            checklist,
            existingPhotoIds,
          }

          // Action: Create initial state
          const state = createInitialState(options)

          // Postcondition: Should start at index 1 (first missing)
          expect(state.currentIndex).toBe(1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve other state properties when resuming', () => {
    fc.assert(
      fc.property(sessionOptionsWithExistingArb, (options) => {
        // Action: Create initial state
        const state = createInitialState(options)

        // Postcondition: Other state properties should be initialized correctly
        expect(state.jobId).toBe(options.jobId)
        expect(state.stage).toBe(options.stage)
        expect(state.checklist).toEqual(options.checklist)
        expect(state.captures.size).toBe(0)
        expect(state.skippedItems.size).toBe(0)
        expect(state.viewState).toBe('capture')
        expect(state.previewPhoto).toBeNull()

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Session Resume Invariants', () => {
  /**
   * Additional invariant tests for session resume
   */

  it('currentIndex should always be within valid range', () => {
    fc.assert(
      fc.property(sessionOptionsWithExistingArb, (options) => {
        const state = createInitialState(options)

        // Invariant: currentIndex should be >= 0 and < checklist.length
        expect(state.currentIndex).toBeGreaterThanOrEqual(0)
        expect(state.currentIndex).toBeLessThan(options.checklist.length)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('currentIndex should point to item without existing photo (unless all exist)', () => {
    fc.assert(
      fc.property(
        sessionOptionsWithExistingArb.filter(
          (options) => options.existingPhotoIds!.length < options.checklist.length
        ),
        (options) => {
          const state = createInitialState(options)
          const currentItem = options.checklist[state.currentIndex]

          // Invariant: Current item should not have an existing photo
          expect(options.existingPhotoIds).not.toContain(currentItem.id)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('all items before currentIndex should have existing photos (unless index is 0)', () => {
    fc.assert(
      fc.property(
        sessionOptionsWithExistingArb.filter(
          (options) =>
            options.existingPhotoIds!.length > 0 &&
            options.existingPhotoIds!.length < options.checklist.length
        ),
        (options) => {
          const state = createInitialState(options)

          // If currentIndex > 0, all items before it should have existing photos
          if (state.currentIndex > 0) {
            const existingSet = new Set(options.existingPhotoIds)
            for (let i = 0; i < state.currentIndex; i++) {
              const item = options.checklist[i]
              expect(existingSet.has(item.id)).toBe(true)
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('captures map should be empty on initial state', () => {
    fc.assert(
      fc.property(sessionOptionsWithExistingArb, (options) => {
        const state = createInitialState(options)

        // Invariant: captures should be empty (existing photos are tracked separately)
        expect(state.captures.size).toBe(0)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('skippedItems should be empty on initial state', () => {
    fc.assert(
      fc.property(sessionOptionsWithExistingArb, (options) => {
        const state = createInitialState(options)

        // Invariant: skippedItems should be empty
        expect(state.skippedItems.size).toBe(0)

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Edge Cases for Session Resume', () => {
  /**
   * Test edge cases for session resume
   */

  it('should handle single item checklist with no existing photos', () => {
    const checklist: PhotoChecklistItem[] = [
      {
        id: 'single-item',
        stage: 'job_start',
        sequence: 1,
        title: 'Single Photo',
        title_id: null,
        description: null,
        description_id: null,
        tips: null,
        is_required: true,
        photo_type: 'cargo_before',
        example_image_url: null,
        is_active: true,
      },
    ]

    const options: CaptureSessionOptions = {
      jobId: 'test-job',
      stage: 'job_start',
      checklist,
      existingPhotoIds: [],
    }

    const state = createInitialState(options)

    expect(state.currentIndex).toBe(0)
  })

  it('should handle single item checklist with existing photo', () => {
    const checklist: PhotoChecklistItem[] = [
      {
        id: 'single-item',
        stage: 'job_start',
        sequence: 1,
        title: 'Single Photo',
        title_id: null,
        description: null,
        description_id: null,
        tips: null,
        is_required: true,
        photo_type: 'cargo_before',
        example_image_url: null,
        is_active: true,
      },
    ]

    const options: CaptureSessionOptions = {
      jobId: 'test-job',
      stage: 'job_start',
      checklist,
      existingPhotoIds: ['single-item'],
    }

    const state = createInitialState(options)

    // Should start at 0 (allow retakes)
    expect(state.currentIndex).toBe(0)
  })

  it('should handle undefined existingPhotoIds', () => {
    const checklist: PhotoChecklistItem[] = [
      {
        id: 'item-1',
        stage: 'job_start',
        sequence: 1,
        title: 'Photo 1',
        title_id: null,
        description: null,
        description_id: null,
        tips: null,
        is_required: true,
        photo_type: 'cargo_before',
        example_image_url: null,
        is_active: true,
      },
    ]

    const options: CaptureSessionOptions = {
      jobId: 'test-job',
      stage: 'job_start',
      checklist,
      // existingPhotoIds is undefined
    }

    const state = createInitialState(options)

    // Should start at 0 (no existing photos)
    expect(state.currentIndex).toBe(0)
  })

  it('should handle existingPhotoIds with IDs not in checklist', () => {
    const checklist: PhotoChecklistItem[] = [
      {
        id: 'item-1',
        stage: 'job_start',
        sequence: 1,
        title: 'Photo 1',
        title_id: null,
        description: null,
        description_id: null,
        tips: null,
        is_required: true,
        photo_type: 'cargo_before',
        example_image_url: null,
        is_active: true,
      },
    ]

    const options: CaptureSessionOptions = {
      jobId: 'test-job',
      stage: 'job_start',
      checklist,
      existingPhotoIds: ['non-existent-id'],
    }

    const state = createInitialState(options)

    // Should start at 0 (the existing ID doesn't match any checklist item)
    expect(state.currentIndex).toBe(0)
  })

  it('should handle only last item missing', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) => checklist.length >= 2),
        (checklist) => {
          // All items except the last have photos
          const existingPhotoIds = checklist.slice(0, -1).map((item) => item.id)

          const options: CaptureSessionOptions = {
            jobId: 'test-job',
            stage: 'job_start',
            checklist,
            existingPhotoIds,
          }

          const state = createInitialState(options)

          // Should start at the last item
          expect(state.currentIndex).toBe(checklist.length - 1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle only first item missing', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) => checklist.length >= 2),
        (checklist) => {
          // All items except the first have photos
          const existingPhotoIds = checklist.slice(1).map((item) => item.id)

          const options: CaptureSessionOptions = {
            jobId: 'test-job',
            stage: 'job_start',
            checklist,
            existingPhotoIds,
          }

          const state = createInitialState(options)

          // Should start at the first item
          expect(state.currentIndex).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
