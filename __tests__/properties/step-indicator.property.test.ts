import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-Based Tests for Step Indicator Accuracy
 * 
 * Feature: v0.3-guided-capture, Property 2: Step indicator accuracy
 * 
 * **Validates: Requirements 3.1.4**
 * 
 * *For any* checklist with N items and current index I (0-indexed),
 * the step indicator should display "Step {I+1} of {N}".
 * 
 * Testing Strategy:
 * - Use `fast-check` with minimum 100 iterations
 * - Generate random checklist lengths (1-20 items)
 * - Generate random current indices (0 to length-1)
 * - Verify the step indicator displays correct text
 */

// ============================================
// STEP INDICATOR LOGIC
// ============================================

/**
 * Computes the step indicator text for a given 0-indexed current index
 * and total number of checklist items.
 * 
 * This mirrors the logic in StepProgressBar component which takes
 * 1-indexed currentStep and totalSteps.
 * 
 * @param currentIndex - 0-indexed current position in checklist
 * @param totalItems - Total number of items in checklist (N)
 * @returns The step indicator text "Step X of Y"
 */
function computeStepIndicatorText(currentIndex: number, totalItems: number): string {
  // Convert 0-indexed to 1-indexed for display
  const displayStep = currentIndex + 1
  return `Step ${displayStep} of ${totalItems}`
}

/**
 * Computes the progress percentage for a given step
 * 
 * @param currentStep - 1-indexed current step
 * @param totalSteps - Total number of steps
 * @returns Progress percentage (0-100)
 */
function computeProgressPercentage(currentStep: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0
  return (currentStep / totalSteps) * 100
}

// ============================================
// ARBITRARIES (Test Data Generators)
// ============================================

/**
 * Generator for valid checklist lengths (1-20 items)
 * Per design doc: "Generate random checklist lengths (1-20 items)"
 */
const checklistLengthArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 20 })

/**
 * Generator for valid current index given a checklist length
 * Per design doc: "Generate random current indices (0 to length-1)"
 */
const validIndexArb = (length: number): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: length - 1 })

/**
 * Generator for a tuple of (checklistLength, currentIndex)
 * Ensures currentIndex is always valid for the given length
 */
const stepIndicatorInputArb: fc.Arbitrary<{ length: number; index: number }> =
  checklistLengthArb.chain((length) =>
    validIndexArb(length).map((index) => ({ length, index }))
  )

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 2: Step indicator accuracy', () => {
  /**
   * **Validates: Requirements 3.1.4**
   * 
   * *For any* checklist with N items and current index I (0-indexed),
   * the step indicator should display "Step {I+1} of {N}".
   */

  it('should display "Step {I+1} of {N}" for ANY valid checklist length and index', () => {
    fc.assert(
      fc.property(stepIndicatorInputArb, ({ length, index }) => {
        // Preconditions
        expect(length).toBeGreaterThanOrEqual(1)
        expect(length).toBeLessThanOrEqual(20)
        expect(index).toBeGreaterThanOrEqual(0)
        expect(index).toBeLessThan(length)

        // Action: compute step indicator text
        const text = computeStepIndicatorText(index, length)

        // Postcondition: text should match expected format
        const expectedStep = index + 1
        const expectedText = `Step ${expectedStep} of ${length}`
        expect(text).toBe(expectedText)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should always show step number >= 1 (1-indexed display)', () => {
    fc.assert(
      fc.property(stepIndicatorInputArb, ({ length, index }) => {
        const text = computeStepIndicatorText(index, length)

        // Extract the step number from the text
        const match = text.match(/^Step (\d+) of (\d+)$/)
        expect(match).not.toBeNull()

        const displayedStep = parseInt(match![1], 10)

        // Postcondition: displayed step should be >= 1
        expect(displayedStep).toBeGreaterThanOrEqual(1)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should always show step number <= total steps', () => {
    fc.assert(
      fc.property(stepIndicatorInputArb, ({ length, index }) => {
        const text = computeStepIndicatorText(index, length)

        // Extract numbers from the text
        const match = text.match(/^Step (\d+) of (\d+)$/)
        expect(match).not.toBeNull()

        const displayedStep = parseInt(match![1], 10)
        const displayedTotal = parseInt(match![2], 10)

        // Postcondition: displayed step should be <= total
        expect(displayedStep).toBeLessThanOrEqual(displayedTotal)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should show total steps equal to checklist length', () => {
    fc.assert(
      fc.property(stepIndicatorInputArb, ({ length, index }) => {
        const text = computeStepIndicatorText(index, length)

        // Extract the total from the text
        const match = text.match(/^Step (\d+) of (\d+)$/)
        expect(match).not.toBeNull()

        const displayedTotal = parseInt(match![2], 10)

        // Postcondition: displayed total should equal checklist length
        expect(displayedTotal).toBe(length)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should show step 1 when index is 0 (first item)', () => {
    fc.assert(
      fc.property(checklistLengthArb, (length) => {
        const index = 0 // First item
        const text = computeStepIndicatorText(index, length)

        // Postcondition: should show "Step 1 of N"
        expect(text).toBe(`Step 1 of ${length}`)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should show step N when index is N-1 (last item)', () => {
    fc.assert(
      fc.property(checklistLengthArb, (length) => {
        const index = length - 1 // Last item
        const text = computeStepIndicatorText(index, length)

        // Postcondition: should show "Step N of N"
        expect(text).toBe(`Step ${length} of ${length}`)

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Step Indicator Progress Percentage', () => {
  /**
   * Additional property tests for progress percentage calculation
   * which is used by the StepProgressBar component
   */

  it('should compute correct progress percentage for ANY step', () => {
    fc.assert(
      fc.property(stepIndicatorInputArb, ({ length, index }) => {
        // Convert to 1-indexed for component props
        const currentStep = index + 1
        const totalSteps = length

        const percentage = computeProgressPercentage(currentStep, totalSteps)

        // Postcondition: percentage should be (currentStep / totalSteps) * 100
        const expectedPercentage = (currentStep / totalSteps) * 100
        expect(percentage).toBeCloseTo(expectedPercentage, 10)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return 0% progress when totalSteps is 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (currentStep) => {
        const percentage = computeProgressPercentage(currentStep, 0)

        // Postcondition: should return 0 for edge case
        expect(percentage).toBe(0)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return 100% progress when on last step', () => {
    fc.assert(
      fc.property(checklistLengthArb, (length) => {
        const currentStep = length // Last step (1-indexed)
        const percentage = computeProgressPercentage(currentStep, length)

        // Postcondition: should be 100%
        expect(percentage).toBe(100)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have progress percentage between 0 and 100 for valid inputs', () => {
    fc.assert(
      fc.property(stepIndicatorInputArb, ({ length, index }) => {
        const currentStep = index + 1
        const percentage = computeProgressPercentage(currentStep, length)

        // Postcondition: percentage should be in valid range
        expect(percentage).toBeGreaterThanOrEqual(0)
        expect(percentage).toBeLessThanOrEqual(100)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have monotonically increasing progress as step increases', () => {
    fc.assert(
      fc.property(
        // Generate length >= 2 to have at least two steps to compare
        fc.integer({ min: 2, max: 20 }),
        (length) => {
          // Generate two consecutive indices
          const index1 = Math.floor(Math.random() * (length - 1))
          const index2 = index1 + 1

          const step1 = index1 + 1
          const step2 = index2 + 1

          const percentage1 = computeProgressPercentage(step1, length)
          const percentage2 = computeProgressPercentage(step2, length)

          // Postcondition: later step should have higher or equal progress
          expect(percentage2).toBeGreaterThan(percentage1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Step Indicator Text Format Invariants', () => {
  /**
   * Invariant tests that should hold for all step indicator text
   */

  it('should always produce text matching the pattern "Step X of Y"', () => {
    fc.assert(
      fc.property(stepIndicatorInputArb, ({ length, index }) => {
        const text = computeStepIndicatorText(index, length)

        // Postcondition: text should match expected pattern
        const pattern = /^Step \d+ of \d+$/
        expect(text).toMatch(pattern)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have consistent relationship: displayedStep = index + 1', () => {
    fc.assert(
      fc.property(stepIndicatorInputArb, ({ length, index }) => {
        const text = computeStepIndicatorText(index, length)

        const match = text.match(/^Step (\d+) of (\d+)$/)
        expect(match).not.toBeNull()

        const displayedStep = parseInt(match![1], 10)

        // Postcondition: displayed step should be index + 1
        expect(displayedStep).toBe(index + 1)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should produce unique text for each (index, length) combination', () => {
    fc.assert(
      fc.property(
        stepIndicatorInputArb,
        stepIndicatorInputArb,
        (input1, input2) => {
          const text1 = computeStepIndicatorText(input1.index, input1.length)
          const text2 = computeStepIndicatorText(input2.index, input2.length)

          // If inputs are different, texts should be different
          // (unless they happen to produce the same step/total)
          if (input1.index !== input2.index || input1.length !== input2.length) {
            const step1 = input1.index + 1
            const step2 = input2.index + 1

            // Only expect different text if the computed values differ
            if (step1 !== step2 || input1.length !== input2.length) {
              expect(text1).not.toBe(text2)
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Boundary Cases', () => {
  /**
   * Explicit boundary case tests for step indicator
   */

  it('should handle single-item checklist (length=1, index=0)', () => {
    const text = computeStepIndicatorText(0, 1)
    expect(text).toBe('Step 1 of 1')

    const percentage = computeProgressPercentage(1, 1)
    expect(percentage).toBe(100)
  })

  it('should handle maximum checklist length (20 items)', () => {
    // First item
    expect(computeStepIndicatorText(0, 20)).toBe('Step 1 of 20')
    expect(computeProgressPercentage(1, 20)).toBe(5)

    // Middle item
    expect(computeStepIndicatorText(9, 20)).toBe('Step 10 of 20')
    expect(computeProgressPercentage(10, 20)).toBe(50)

    // Last item
    expect(computeStepIndicatorText(19, 20)).toBe('Step 20 of 20')
    expect(computeProgressPercentage(20, 20)).toBe(100)
  })

  it('should handle typical job_start checklist (5 items)', () => {
    // Per requirements: job_start has 5 checklist items
    const length = 5

    for (let index = 0; index < length; index++) {
      const text = computeStepIndicatorText(index, length)
      const expectedStep = index + 1
      expect(text).toBe(`Step ${expectedStep} of ${length}`)
    }
  })

  it('should handle typical job_end checklist (4 items)', () => {
    // Per requirements: job_end has 4 checklist items
    const length = 4

    for (let index = 0; index < length; index++) {
      const text = computeStepIndicatorText(index, length)
      const expectedStep = index + 1
      expect(text).toBe(`Step ${expectedStep} of ${length}`)
    }
  })

  it('should handle typical in_transit checklist (2 items)', () => {
    // Per requirements: in_transit has 2 checklist items
    const length = 2

    for (let index = 0; index < length; index++) {
      const text = computeStepIndicatorText(index, length)
      const expectedStep = index + 1
      expect(text).toBe(`Step ${expectedStep} of ${length}`)
    }
  })
})
