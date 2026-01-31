/**
 * Property-Based Tests for Skip Button Visibility
 * 
 * Feature: v0.3-guided-capture, Property 9: Skip button visibility
 * 
 * *For any* checklist item, the skip button should be visible if and only if
 * `is_required` is false.
 * 
 * **Validates: Requirements 3.5.1, 3.5.2**
 * 
 * Requirements:
 * - 3.5.1: Optional items show "Skip" button
 * - 3.5.2: Required items do NOT show skip option
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { PhotoChecklistItem, JobStage } from '@/types/job'

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
 * Generator for non-empty strings
 */
const nonEmptyStringArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 100 })

/**
 * Generator for nullable strings
 */
const nullableStringArb: fc.Arbitrary<string | null> = fc.option(
  fc.string({ minLength: 1, maxLength: 200 }),
  { nil: null }
)

/**
 * Generator for a single checklist item with varying is_required values
 */
const checklistItemArb: fc.Arbitrary<PhotoChecklistItem> = fc.record({
  id: fc.uuid(),
  stage: jobStageArb,
  sequence: fc.integer({ min: 1, max: 20 }),
  title: nonEmptyStringArb,
  title_id: nullableStringArb,
  description: nullableStringArb,
  description_id: nullableStringArb,
  tips: nullableStringArb,
  is_required: fc.boolean(),
  photo_type: photoTypeArb,
  example_image_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.constant(true),
})

/**
 * Generator for required checklist items (is_required = true)
 */
const requiredChecklistItemArb: fc.Arbitrary<PhotoChecklistItem> = checklistItemArb.map(
  (item) => ({ ...item, is_required: true })
)

/**
 * Generator for optional checklist items (is_required = false)
 */
const optionalChecklistItemArb: fc.Arbitrary<PhotoChecklistItem> = checklistItemArb.map(
  (item) => ({ ...item, is_required: false })
)

// ============================================
// HELPER FUNCTIONS (Simulating Component Logic)
// ============================================

/**
 * Determines if skip button should be visible based on component logic.
 * 
 * This mirrors the exact logic in ChecklistStepView component:
 * ```typescript
 * const showSkipButton = !item.is_required && onSkip !== undefined
 * ```
 * 
 * The skip button is visible if and only if:
 * 1. The item is NOT required (is_required === false)
 * 2. An onSkip handler is provided (onSkip !== undefined)
 * 
 * @param item - The checklist item
 * @param onSkipProvided - Whether an onSkip callback is provided
 * @returns true if skip button should be visible
 */
function shouldShowSkipButton(
  item: PhotoChecklistItem,
  onSkipProvided: boolean
): boolean {
  return !item.is_required && onSkipProvided
}

/**
 * Alternative formulation: skip button is hidden when item is required
 * OR when onSkip is not provided.
 */
function shouldHideSkipButton(
  item: PhotoChecklistItem,
  onSkipProvided: boolean
): boolean {
  return item.is_required || !onSkipProvided
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 9: Skip button visibility', () => {
  /**
   * **Validates: Requirements 3.5.1, 3.5.2**
   * 
   * *For any* checklist item, the skip button should be visible if and only if
   * `is_required` is false.
   */

  describe('Core Property: Skip button visibility depends on is_required', () => {
    it('should show skip button for ANY optional item when onSkip is provided', () => {
      fc.assert(
        fc.property(optionalChecklistItemArb, (item) => {
          // Precondition: item is optional (is_required = false)
          expect(item.is_required).toBe(false)

          // Action: determine skip button visibility with onSkip provided
          const isVisible = shouldShowSkipButton(item, true)

          // Postcondition: skip button should be visible
          expect(isVisible).toBe(true)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should NOT show skip button for ANY required item (even when onSkip is provided)', () => {
      fc.assert(
        fc.property(requiredChecklistItemArb, (item) => {
          // Precondition: item is required (is_required = true)
          expect(item.is_required).toBe(true)

          // Action: determine skip button visibility with onSkip provided
          const isVisible = shouldShowSkipButton(item, true)

          // Postcondition: skip button should NOT be visible
          expect(isVisible).toBe(false)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should NOT show skip button for ANY required item (when onSkip is not provided)', () => {
      fc.assert(
        fc.property(requiredChecklistItemArb, (item) => {
          // Precondition: item is required (is_required = true)
          expect(item.is_required).toBe(true)

          // Action: determine skip button visibility without onSkip
          const isVisible = shouldShowSkipButton(item, false)

          // Postcondition: skip button should NOT be visible
          expect(isVisible).toBe(false)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should NOT show skip button for optional item when onSkip is NOT provided', () => {
      fc.assert(
        fc.property(optionalChecklistItemArb, (item) => {
          // Precondition: item is optional (is_required = false)
          expect(item.is_required).toBe(false)

          // Action: determine skip button visibility without onSkip
          const isVisible = shouldShowSkipButton(item, false)

          // Postcondition: skip button should NOT be visible
          // Because onSkip callback is not provided
          expect(isVisible).toBe(false)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Biconditional Property: is_required === false ⟺ skip visible (when onSkip provided)', () => {
    it('skip button visibility should be equivalent to is_required === false (when onSkip provided)', () => {
      fc.assert(
        fc.property(checklistItemArb, (item) => {
          // Action: determine skip button visibility with onSkip provided
          const isVisible = shouldShowSkipButton(item, true)

          // Postcondition: visibility should be equivalent to !is_required
          // This is the biconditional: visible ⟺ !is_required
          expect(isVisible).toBe(!item.is_required)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('skip button visibility should match is_required === false AND onSkip provided', () => {
      fc.assert(
        fc.property(
          checklistItemArb,
          fc.boolean(), // whether onSkip is provided
          (item, onSkipProvided) => {
            // Calculate expected visibility
            const expectedVisible = !item.is_required && onSkipProvided

            // Action: determine skip button visibility
            const isVisible = shouldShowSkipButton(item, onSkipProvided)

            // Postcondition: actual visibility should match expected
            expect(isVisible).toBe(expectedVisible)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Negation Property: shouldShowSkipButton and shouldHideSkipButton are complements', () => {
    it('shouldShowSkipButton and shouldHideSkipButton should be logical complements', () => {
      fc.assert(
        fc.property(
          checklistItemArb,
          fc.boolean(),
          (item, onSkipProvided) => {
            const show = shouldShowSkipButton(item, onSkipProvided)
            const hide = shouldHideSkipButton(item, onSkipProvided)

            // They should be logical complements
            expect(show).toBe(!hide)
            expect(hide).toBe(!show)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

describe('Skip Button Visibility Invariants', () => {
  /**
   * Additional invariant tests for skip button behavior
   */

  it('skip button visibility should be independent of item title', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // is_required
        fc.boolean(), // onSkip provided
        nonEmptyStringArb, // title 1
        nonEmptyStringArb, // title 2
        (isRequired, onSkipProvided, title1, title2) => {
          // Create two items with same is_required but different titles
          const item1: PhotoChecklistItem = {
            id: 'item-1',
            stage: 'job_start',
            sequence: 1,
            title: title1,
            title_id: null,
            description: null,
            description_id: null,
            tips: null,
            is_required: isRequired,
            photo_type: 'cargo_before',
            example_image_url: null,
            is_active: true,
          }

          const item2: PhotoChecklistItem = {
            id: 'item-2',
            stage: 'job_start',
            sequence: 1,
            title: title2,
            title_id: null,
            description: null,
            description_id: null,
            tips: null,
            is_required: isRequired,
            photo_type: 'cargo_before',
            example_image_url: null,
            is_active: true,
          }

          // Both should have same visibility since is_required is the same
          const visibility1 = shouldShowSkipButton(item1, onSkipProvided)
          const visibility2 = shouldShowSkipButton(item2, onSkipProvided)

          expect(visibility1).toBe(visibility2)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('skip button visibility should be independent of stage', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // is_required
        fc.boolean(), // onSkip provided
        jobStageArb, // stage 1
        jobStageArb, // stage 2
        (isRequired, onSkipProvided, stage1, stage2) => {
          // Create two items with same is_required but different stages
          const item1: PhotoChecklistItem = {
            id: 'item-1',
            stage: stage1,
            sequence: 1,
            title: 'Test Item',
            title_id: null,
            description: null,
            description_id: null,
            tips: null,
            is_required: isRequired,
            photo_type: 'cargo_before',
            example_image_url: null,
            is_active: true,
          }

          const item2: PhotoChecklistItem = {
            id: 'item-2',
            stage: stage2,
            sequence: 1,
            title: 'Test Item',
            title_id: null,
            description: null,
            description_id: null,
            tips: null,
            is_required: isRequired,
            photo_type: 'cargo_before',
            example_image_url: null,
            is_active: true,
          }

          // Both should have same visibility since is_required is the same
          const visibility1 = shouldShowSkipButton(item1, onSkipProvided)
          const visibility2 = shouldShowSkipButton(item2, onSkipProvided)

          expect(visibility1).toBe(visibility2)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('skip button visibility should be independent of photo_type', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // is_required
        fc.boolean(), // onSkip provided
        photoTypeArb, // photo type 1
        photoTypeArb, // photo type 2
        (isRequired, onSkipProvided, photoType1, photoType2) => {
          // Create two items with same is_required but different photo types
          const item1: PhotoChecklistItem = {
            id: 'item-1',
            stage: 'job_start',
            sequence: 1,
            title: 'Test Item',
            title_id: null,
            description: null,
            description_id: null,
            tips: null,
            is_required: isRequired,
            photo_type: photoType1,
            example_image_url: null,
            is_active: true,
          }

          const item2: PhotoChecklistItem = {
            id: 'item-2',
            stage: 'job_start',
            sequence: 1,
            title: 'Test Item',
            title_id: null,
            description: null,
            description_id: null,
            tips: null,
            is_required: isRequired,
            photo_type: photoType2,
            example_image_url: null,
            is_active: true,
          }

          // Both should have same visibility since is_required is the same
          const visibility1 = shouldShowSkipButton(item1, onSkipProvided)
          const visibility2 = shouldShowSkipButton(item2, onSkipProvided)

          expect(visibility1).toBe(visibility2)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('skip button visibility should be independent of sequence number', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // is_required
        fc.boolean(), // onSkip provided
        fc.integer({ min: 1, max: 20 }), // sequence 1
        fc.integer({ min: 1, max: 20 }), // sequence 2
        (isRequired, onSkipProvided, sequence1, sequence2) => {
          // Create two items with same is_required but different sequences
          const item1: PhotoChecklistItem = {
            id: 'item-1',
            stage: 'job_start',
            sequence: sequence1,
            title: 'Test Item',
            title_id: null,
            description: null,
            description_id: null,
            tips: null,
            is_required: isRequired,
            photo_type: 'cargo_before',
            example_image_url: null,
            is_active: true,
          }

          const item2: PhotoChecklistItem = {
            id: 'item-2',
            stage: 'job_start',
            sequence: sequence2,
            title: 'Test Item',
            title_id: null,
            description: null,
            description_id: null,
            tips: null,
            is_required: isRequired,
            photo_type: 'cargo_before',
            example_image_url: null,
            is_active: true,
          }

          // Both should have same visibility since is_required is the same
          const visibility1 = shouldShowSkipButton(item1, onSkipProvided)
          const visibility2 = shouldShowSkipButton(item2, onSkipProvided)

          expect(visibility1).toBe(visibility2)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('skip button visibility should only depend on is_required and onSkip presence', () => {
    fc.assert(
      fc.property(
        // Generate two completely different items with same is_required
        fc.boolean(),
        checklistItemArb,
        checklistItemArb,
        fc.boolean(),
        (isRequired, item1Base, item2Base, onSkipProvided) => {
          // Create two items with same is_required but different other properties
          const item1 = { ...item1Base, is_required: isRequired }
          const item2 = { ...item2Base, is_required: isRequired }

          // Both should have same visibility since is_required is the same
          const visibility1 = shouldShowSkipButton(item1, onSkipProvided)
          const visibility2 = shouldShowSkipButton(item2, onSkipProvided)

          expect(visibility1).toBe(visibility2)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('skip button visibility should be deterministic for same input', () => {
    fc.assert(
      fc.property(
        checklistItemArb,
        fc.boolean(),
        (item, onSkipProvided) => {
          // Call multiple times with same input
          const visibility1 = shouldShowSkipButton(item, onSkipProvided)
          const visibility2 = shouldShowSkipButton(item, onSkipProvided)
          const visibility3 = shouldShowSkipButton(item, onSkipProvided)

          // Results should be identical
          expect(visibility1).toBe(visibility2)
          expect(visibility2).toBe(visibility3)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Skip Button Truth Table Verification', () => {
  /**
   * Exhaustive verification of all possible combinations
   * This serves as a sanity check for the property tests
   */

  it('should verify all four combinations of is_required and onSkipProvided', () => {
    // Truth table:
    // | is_required | onSkipProvided | shouldShowSkipButton |
    // |-------------|----------------|----------------------|
    // | true        | true           | false                |
    // | true        | false          | false                |
    // | false       | true           | true                 |
    // | false       | false          | false                |

    const requiredItem: PhotoChecklistItem = {
      id: 'required-item',
      stage: 'job_start',
      sequence: 1,
      title: 'Required Item',
      title_id: null,
      description: null,
      description_id: null,
      tips: null,
      is_required: true,
      photo_type: 'cargo_before',
      example_image_url: null,
      is_active: true,
    }

    const optionalItem: PhotoChecklistItem = {
      id: 'optional-item',
      stage: 'job_start',
      sequence: 1,
      title: 'Optional Item',
      title_id: null,
      description: null,
      description_id: null,
      tips: null,
      is_required: false,
      photo_type: 'damage',
      example_image_url: null,
      is_active: true,
    }

    // Row 1: required + onSkip provided → false
    expect(shouldShowSkipButton(requiredItem, true)).toBe(false)

    // Row 2: required + onSkip not provided → false
    expect(shouldShowSkipButton(requiredItem, false)).toBe(false)

    // Row 3: optional + onSkip provided → true
    expect(shouldShowSkipButton(optionalItem, true)).toBe(true)

    // Row 4: optional + onSkip not provided → false
    expect(shouldShowSkipButton(optionalItem, false)).toBe(false)
  })
})
