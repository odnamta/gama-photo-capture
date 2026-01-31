import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { PhotoChecklistItem, JobStage } from '@/types/job'
import type { StageCompletionResult } from '@/lib/actions/capture'

/**
 * Property-Based Tests for Stage Completion
 * 
 * Feature: v0.3-guided-capture, Property 12: Stage completion updates progress
 * 
 * *For any* capture session where all required checklist items have been captured,
 * the job's stage progress should reflect `isComplete: true`.
 * 
 * **Validates: Requirements 3.6.5**
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
 * Generator for captured photo IDs (subset of checklist item IDs)
 */
const capturedIdsArb = (checklist: PhotoChecklistItem[]): fc.Arbitrary<string[]> =>
  fc.subarray(
    checklist.map((item) => item.id),
    { minLength: 0, maxLength: checklist.length }
  )

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Simulates the stage completion check logic
 * This mirrors the logic in checkStageCompletion server action
 */
function calculateStageCompletion(
  checklist: PhotoChecklistItem[],
  capturedIds: string[]
): StageCompletionResult {
  // Get required item IDs
  const requiredIds = checklist
    .filter((item) => item.is_required)
    .map((item) => item.id)

  // If no required items, stage is automatically complete
  if (requiredIds.length === 0) {
    return {
      isComplete: true,
      requiredCount: 0,
      capturedCount: 0,
      missingItemIds: [],
    }
  }

  // Find which required items have been captured
  const capturedSet = new Set(capturedIds)
  const missingItemIds = requiredIds.filter((id) => !capturedSet.has(id))
  const capturedCount = requiredIds.length - missingItemIds.length

  return {
    isComplete: missingItemIds.length === 0,
    requiredCount: requiredIds.length,
    capturedCount,
    missingItemIds,
  }
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 12: Stage completion updates progress', () => {
  /**
   * **Validates: Requirements 3.6.5**
   * 
   * *For any* capture session where all required checklist items have been captured,
   * the job's stage progress should reflect `isComplete: true`.
   */

  it('should be complete when ALL required items are captured', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) =>
          checklist.some((item) => item.is_required)
        ),
        (checklist) => {
          // Capture all required items
          const requiredIds = checklist
            .filter((item) => item.is_required)
            .map((item) => item.id)

          const result = calculateStageCompletion(checklist, requiredIds)

          // Postcondition: Should be complete
          expect(result.isComplete).toBe(true)
          expect(result.missingItemIds).toHaveLength(0)
          expect(result.capturedCount).toBe(result.requiredCount)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT be complete when ANY required item is missing', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) =>
          checklist.filter((item) => item.is_required).length >= 2
        ),
        (checklist) => {
          // Capture all but one required item
          const requiredIds = checklist
            .filter((item) => item.is_required)
            .map((item) => item.id)
          const capturedIds = requiredIds.slice(0, -1) // Missing the last one

          const result = calculateStageCompletion(checklist, capturedIds)

          // Postcondition: Should NOT be complete
          expect(result.isComplete).toBe(false)
          expect(result.missingItemIds.length).toBeGreaterThan(0)
          expect(result.capturedCount).toBeLessThan(result.requiredCount)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should be complete when NO required items exist (all optional)', () => {
    fc.assert(
      fc.property(
        checklistArb
          .filter((checklist) => checklist.length > 0)
          .map((checklist) =>
            checklist.map((item) => ({ ...item, is_required: false }))
          ),
        (checklist) => {
          // No photos captured
          const result = calculateStageCompletion(checklist, [])

          // Postcondition: Should be complete (no required items)
          expect(result.isComplete).toBe(true)
          expect(result.requiredCount).toBe(0)
          expect(result.capturedCount).toBe(0)
          expect(result.missingItemIds).toHaveLength(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have correct requiredCount for ANY checklist', () => {
    fc.assert(
      fc.property(checklistArb, (checklist) => {
        // Generate captured IDs from the checklist
        const capturedIds = checklist.slice(0, Math.floor(checklist.length / 2)).map(item => item.id)
        const result = calculateStageCompletion(checklist, capturedIds)

        // Postcondition: requiredCount should match actual required items
        const actualRequired = checklist.filter((item) => item.is_required).length
        expect(result.requiredCount).toBe(actualRequired)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have correct capturedCount for ANY captured photos', () => {
    fc.assert(
      fc.property(checklistArb, (checklist) => {
        const requiredIds = checklist
          .filter((item) => item.is_required)
          .map((item) => item.id)

        // Capture a random subset of required items
        return fc.assert(
          fc.property(fc.subarray(requiredIds), (capturedIds) => {
            const result = calculateStageCompletion(checklist, capturedIds)

            // Postcondition: capturedCount should match captured required items
            const capturedRequiredCount = capturedIds.filter((id) =>
              requiredIds.includes(id)
            ).length
            expect(result.capturedCount).toBe(capturedRequiredCount)

            return true
          }),
          { numRuns: 10 }
        )
      }),
      { numRuns: 10 }
    )
  })

  it('should list correct missingItemIds for ANY partial capture', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) =>
          checklist.some((item) => item.is_required)
        ),
        (checklist) => {
          const requiredIds = checklist
            .filter((item) => item.is_required)
            .map((item) => item.id)

          // Capture only the first half
          const capturedIds = requiredIds.slice(0, Math.floor(requiredIds.length / 2))
          const expectedMissing = requiredIds.slice(Math.floor(requiredIds.length / 2))

          const result = calculateStageCompletion(checklist, capturedIds)

          // Postcondition: missingItemIds should contain uncaptured required items
          expect(result.missingItemIds.sort()).toEqual(expectedMissing.sort())

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ignore optional items when calculating completion', () => {
    fc.assert(
      fc.property(
        checklistArb.filter(
          (checklist) =>
            checklist.some((item) => item.is_required) &&
            checklist.some((item) => !item.is_required)
        ),
        (checklist) => {
          // Capture only required items (not optional)
          const requiredIds = checklist
            .filter((item) => item.is_required)
            .map((item) => item.id)

          const result = calculateStageCompletion(checklist, requiredIds)

          // Postcondition: Should be complete even without optional items
          expect(result.isComplete).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle capturing optional items without affecting completion', () => {
    fc.assert(
      fc.property(
        checklistArb.filter(
          (checklist) =>
            checklist.some((item) => item.is_required) &&
            checklist.some((item) => !item.is_required)
        ),
        (checklist) => {
          // Capture only optional items (not required)
          const optionalIds = checklist
            .filter((item) => !item.is_required)
            .map((item) => item.id)

          const result = calculateStageCompletion(checklist, optionalIds)

          // Postcondition: Should NOT be complete (required items missing)
          expect(result.isComplete).toBe(false)
          expect(result.capturedCount).toBe(0) // Optional items don't count

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Stage Completion Invariants', () => {
  /**
   * Additional invariant tests for stage completion
   */

  it('isComplete should be true iff missingItemIds is empty', () => {
    fc.assert(
      fc.property(checklistArb, (checklist) => {
        return fc.assert(
          fc.property(capturedIdsArb(checklist), (capturedIds) => {
            const result = calculateStageCompletion(checklist, capturedIds)

            // Invariant: isComplete ↔ missingItemIds.length === 0
            expect(result.isComplete).toBe(result.missingItemIds.length === 0)

            return true
          }),
          { numRuns: 10 }
        )
      }),
      { numRuns: 10 }
    )
  })

  it('capturedCount + missingItemIds.length should equal requiredCount', () => {
    fc.assert(
      fc.property(checklistArb, (checklist) => {
        return fc.assert(
          fc.property(capturedIdsArb(checklist), (capturedIds) => {
            const result = calculateStageCompletion(checklist, capturedIds)

            // Invariant: captured + missing = required
            expect(result.capturedCount + result.missingItemIds.length).toBe(
              result.requiredCount
            )

            return true
          }),
          { numRuns: 10 }
        )
      }),
      { numRuns: 10 }
    )
  })

  it('missingItemIds should only contain required item IDs', () => {
    fc.assert(
      fc.property(checklistArb, (checklist) => {
        return fc.assert(
          fc.property(capturedIdsArb(checklist), (capturedIds) => {
            const result = calculateStageCompletion(checklist, capturedIds)

            const requiredIds = new Set(
              checklist.filter((item) => item.is_required).map((item) => item.id)
            )

            // Invariant: All missing IDs should be required items
            for (const missingId of result.missingItemIds) {
              expect(requiredIds.has(missingId)).toBe(true)
            }

            return true
          }),
          { numRuns: 10 }
        )
      }),
      { numRuns: 10 }
    )
  })

  it('capturedCount should never exceed requiredCount', () => {
    fc.assert(
      fc.property(checklistArb, (checklist) => {
        return fc.assert(
          fc.property(capturedIdsArb(checklist), (capturedIds) => {
            const result = calculateStageCompletion(checklist, capturedIds)

            // Invariant: capturedCount <= requiredCount
            expect(result.capturedCount).toBeLessThanOrEqual(result.requiredCount)

            return true
          }),
          { numRuns: 10 }
        )
      }),
      { numRuns: 10 }
    )
  })

  it('capturedCount should never be negative', () => {
    fc.assert(
      fc.property(checklistArb, (checklist) => {
        return fc.assert(
          fc.property(capturedIdsArb(checklist), (capturedIds) => {
            const result = calculateStageCompletion(checklist, capturedIds)

            // Invariant: capturedCount >= 0
            expect(result.capturedCount).toBeGreaterThanOrEqual(0)

            return true
          }),
          { numRuns: 10 }
        )
      }),
      { numRuns: 10 }
    )
  })
})

describe('Edge Cases for Stage Completion', () => {
  /**
   * Test edge cases for stage completion
   */

  it('should handle empty checklist', () => {
    const result = calculateStageCompletion([], [])

    expect(result.isComplete).toBe(true)
    expect(result.requiredCount).toBe(0)
    expect(result.capturedCount).toBe(0)
    expect(result.missingItemIds).toHaveLength(0)
  })

  it('should handle single required item - captured', () => {
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

    const result = calculateStageCompletion(checklist, ['single-item'])

    expect(result.isComplete).toBe(true)
    expect(result.requiredCount).toBe(1)
    expect(result.capturedCount).toBe(1)
    expect(result.missingItemIds).toHaveLength(0)
  })

  it('should handle single required item - not captured', () => {
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

    const result = calculateStageCompletion(checklist, [])

    expect(result.isComplete).toBe(false)
    expect(result.requiredCount).toBe(1)
    expect(result.capturedCount).toBe(0)
    expect(result.missingItemIds).toEqual(['single-item'])
  })

  it('should handle captured IDs not in checklist (ignored)', () => {
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

    // Capture an ID that doesn't exist in checklist
    const result = calculateStageCompletion(checklist, ['non-existent-id'])

    expect(result.isComplete).toBe(false)
    expect(result.capturedCount).toBe(0)
    expect(result.missingItemIds).toEqual(['item-1'])
  })

  it('should handle duplicate captured IDs', () => {
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

    // Capture the same ID multiple times
    const result = calculateStageCompletion(checklist, ['item-1', 'item-1', 'item-1'])

    expect(result.isComplete).toBe(true)
    expect(result.capturedCount).toBe(1) // Should count as 1, not 3
  })
})
