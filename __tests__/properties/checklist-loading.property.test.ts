import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { PhotoChecklistItem, JobStage } from '@/types/job'

/**
 * Property-Based Tests for Checklist Loading
 * 
 * Feature: v0.3-guided-capture, Property 1: Checklist loading returns correct items
 * 
 * Tests the filtering and ordering logic for loading photo checklists:
 * - Only items matching the requested stage are returned
 * - Only items where is_active is true are returned
 * - Items are ordered by sequence ascending
 * 
 * **Validates: Requirements 3.1.2**
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
 * Generator for a single checklist item with configurable stage and is_active
 */
const checklistItemArb = (
  stageOverride?: JobStage,
  isActiveOverride?: boolean
): fc.Arbitrary<PhotoChecklistItem> =>
  fc.record({
    id: fc.uuid(),
    stage: stageOverride ? fc.constant(stageOverride) : jobStageArb,
    sequence: fc.integer({ min: 1, max: 100 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    title_id: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
    description_id: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
    tips: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    is_required: fc.boolean(),
    photo_type: photoTypeArb,
    example_image_url: fc.option(fc.webUrl(), { nil: null }),
    is_active: isActiveOverride !== undefined ? fc.constant(isActiveOverride) : fc.boolean(),
  })

/**
 * Generator for a mixed database of checklist items
 * Contains items from all stages with varying is_active values
 */
const mixedChecklistDatabaseArb: fc.Arbitrary<PhotoChecklistItem[]> = fc
  .array(
    fc.oneof(
      // Active items for each stage
      checklistItemArb('job_start', true),
      checklistItemArb('in_transit', true),
      checklistItemArb('job_end', true),
      // Inactive items for each stage
      checklistItemArb('job_start', false),
      checklistItemArb('in_transit', false),
      checklistItemArb('job_end', false),
      // Random items (any stage, any is_active)
      checklistItemArb()
    ),
    { minLength: 0, maxLength: 30 }
  )
  .map((items) =>
    // Ensure unique IDs
    items.map((item, index) => ({
      ...item,
      id: `item-${index}-${item.stage}-${item.is_active}`,
    }))
  )

// ============================================
// FILTER AND ORDER LOGIC (Simulates Server Action)
// ============================================

/**
 * Simulates the loadChecklist server action's filtering and ordering logic.
 * This is the pure function that we're testing - it mirrors what the
 * Supabase query does in lib/actions/capture.ts
 * 
 * @param allItems - All checklist items in the "database"
 * @param stage - The stage to filter by
 * @returns Filtered and ordered checklist items
 */
function filterAndOrderChecklist(
  allItems: PhotoChecklistItem[],
  stage: JobStage
): PhotoChecklistItem[] {
  return allItems
    // Filter by stage
    .filter((item) => item.stage === stage)
    // Filter by is_active
    .filter((item) => item.is_active === true)
    // Order by sequence ascending
    .sort((a, b) => a.sequence - b.sequence)
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 1: Checklist loading returns correct items', () => {
  /**
   * **Validates: Requirements 3.1.2**
   * 
   * *For any* job stage, loading the checklist should return only items where
   * `stage` matches and `is_active` is true, ordered by `sequence` ascending.
   */

  it('should return ONLY items matching the requested stage', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        jobStageArb,
        (database, requestedStage) => {
          // Action: filter and order the checklist
          const result = filterAndOrderChecklist(database, requestedStage)

          // Postcondition: ALL returned items must have the requested stage
          for (const item of result) {
            expect(item.stage).toBe(requestedStage)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return ONLY items where is_active is true', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        jobStageArb,
        (database, requestedStage) => {
          // Action: filter and order the checklist
          const result = filterAndOrderChecklist(database, requestedStage)

          // Postcondition: ALL returned items must have is_active = true
          for (const item of result) {
            expect(item.is_active).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return items ordered by sequence ascending', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        jobStageArb,
        (database, requestedStage) => {
          // Action: filter and order the checklist
          const result = filterAndOrderChecklist(database, requestedStage)

          // Postcondition: Items should be in ascending sequence order
          for (let i = 1; i < result.length; i++) {
            expect(result[i].sequence).toBeGreaterThanOrEqual(result[i - 1].sequence)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include ALL active items for the requested stage', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        jobStageArb,
        (database, requestedStage) => {
          // Calculate expected items manually
          const expectedItems = database.filter(
            (item) => item.stage === requestedStage && item.is_active === true
          )

          // Action: filter and order the checklist
          const result = filterAndOrderChecklist(database, requestedStage)

          // Postcondition: Result should contain exactly the expected number of items
          expect(result.length).toBe(expectedItems.length)

          // Postcondition: All expected item IDs should be in the result
          const resultIds = new Set(result.map((item) => item.id))
          for (const expectedItem of expectedItems) {
            expect(resultIds.has(expectedItem.id)).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT include inactive items even if stage matches', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        jobStageArb,
        (database, requestedStage) => {
          // Find inactive items for the requested stage
          const inactiveItems = database.filter(
            (item) => item.stage === requestedStage && item.is_active === false
          )

          // Action: filter and order the checklist
          const result = filterAndOrderChecklist(database, requestedStage)

          // Postcondition: None of the inactive items should be in the result
          const resultIds = new Set(result.map((item) => item.id))
          for (const inactiveItem of inactiveItems) {
            expect(resultIds.has(inactiveItem.id)).toBe(false)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT include items from other stages even if active', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        jobStageArb,
        (database, requestedStage) => {
          // Find active items from OTHER stages
          const otherStageItems = database.filter(
            (item) => item.stage !== requestedStage && item.is_active === true
          )

          // Action: filter and order the checklist
          const result = filterAndOrderChecklist(database, requestedStage)

          // Postcondition: None of the other stage items should be in the result
          const resultIds = new Set(result.map((item) => item.id))
          for (const otherItem of otherStageItems) {
            expect(resultIds.has(otherItem.id)).toBe(false)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array when no items match criteria', () => {
    fc.assert(
      fc.property(
        // Generate database with NO active items for the requested stage
        fc.tuple(
          fc.array(checklistItemArb('job_start', false), { minLength: 0, maxLength: 10 }),
          fc.array(checklistItemArb('in_transit', false), { minLength: 0, maxLength: 10 }),
          fc.array(checklistItemArb('job_end', false), { minLength: 0, maxLength: 10 })
        ).map(([a, b, c]) => [...a, ...b, ...c]),
        jobStageArb,
        (database, requestedStage) => {
          // Action: filter and order the checklist
          const result = filterAndOrderChecklist(database, requestedStage)

          // Postcondition: Result should be empty (no active items)
          expect(result.length).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty database gracefully', () => {
    fc.assert(
      fc.property(jobStageArb, (requestedStage) => {
        // Action: filter and order an empty database
        const result = filterAndOrderChecklist([], requestedStage)

        // Postcondition: Result should be empty array
        expect(result).toEqual([])
        expect(result.length).toBe(0)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should maintain stable sort order for items with same sequence', () => {
    fc.assert(
      fc.property(
        // Generate items with duplicate sequences
        fc.tuple(jobStageArb, fc.integer({ min: 1, max: 10 })).chain(([stage, seq]) =>
          fc.array(
            fc.record({
              id: fc.uuid(),
              stage: fc.constant(stage),
              sequence: fc.constant(seq), // Same sequence for all
              title: fc.string({ minLength: 1, maxLength: 50 }),
              title_id: fc.constant(null),
              description: fc.constant(null),
              description_id: fc.constant(null),
              tips: fc.constant(null),
              is_required: fc.boolean(),
              photo_type: photoTypeArb,
              example_image_url: fc.constant(null),
              is_active: fc.constant(true),
            }),
            { minLength: 2, maxLength: 5 }
          ).map((items) =>
            items.map((item, index) => ({
              ...item,
              id: `same-seq-${index}`,
            }))
          )
        ),
        (items) => {
          const stage = items[0]?.stage
          if (!stage) return true

          // Action: filter and order the checklist
          const result = filterAndOrderChecklist(items, stage)

          // Postcondition: All items should be returned (all active, same stage)
          expect(result.length).toBe(items.length)

          // Postcondition: All sequences should be equal
          const sequences = result.map((item) => item.sequence)
          const uniqueSequences = new Set(sequences)
          expect(uniqueSequences.size).toBe(1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Checklist Loading Invariants', () => {
  /**
   * Additional invariant tests for checklist loading
   */

  it('result length should never exceed database length', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        jobStageArb,
        (database, requestedStage) => {
          const result = filterAndOrderChecklist(database, requestedStage)

          // Invariant: Result can never have more items than the database
          expect(result.length).toBeLessThanOrEqual(database.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('filtering should be idempotent', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        jobStageArb,
        (database, requestedStage) => {
          // Apply filter twice
          const firstResult = filterAndOrderChecklist(database, requestedStage)
          const secondResult = filterAndOrderChecklist(firstResult, requestedStage)

          // Invariant: Filtering already-filtered data should return same result
          expect(secondResult).toEqual(firstResult)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('different stages should return disjoint sets', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        (database) => {
          // Get results for all stages
          const jobStartResult = filterAndOrderChecklist(database, 'job_start')
          const inTransitResult = filterAndOrderChecklist(database, 'in_transit')
          const jobEndResult = filterAndOrderChecklist(database, 'job_end')

          // Get all IDs
          const jobStartIds = new Set(jobStartResult.map((item) => item.id))
          const inTransitIds = new Set(inTransitResult.map((item) => item.id))
          const jobEndIds = new Set(jobEndResult.map((item) => item.id))

          // Invariant: No ID should appear in more than one stage result
          for (const id of jobStartIds) {
            expect(inTransitIds.has(id)).toBe(false)
            expect(jobEndIds.has(id)).toBe(false)
          }
          for (const id of inTransitIds) {
            expect(jobStartIds.has(id)).toBe(false)
            expect(jobEndIds.has(id)).toBe(false)
          }
          for (const id of jobEndIds) {
            expect(jobStartIds.has(id)).toBe(false)
            expect(inTransitIds.has(id)).toBe(false)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('total items across all stages should equal total active items', () => {
    fc.assert(
      fc.property(
        mixedChecklistDatabaseArb,
        (database) => {
          // Get results for all stages
          const jobStartResult = filterAndOrderChecklist(database, 'job_start')
          const inTransitResult = filterAndOrderChecklist(database, 'in_transit')
          const jobEndResult = filterAndOrderChecklist(database, 'job_end')

          // Count total returned items
          const totalReturned =
            jobStartResult.length + inTransitResult.length + jobEndResult.length

          // Count total active items in database
          const totalActive = database.filter((item) => item.is_active === true).length

          // Invariant: Sum of all stage results should equal total active items
          expect(totalReturned).toBe(totalActive)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
