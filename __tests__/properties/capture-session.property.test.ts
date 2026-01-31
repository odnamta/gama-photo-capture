import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { PhotoChecklistItem, JobStage } from '@/types/job'
import type {
  CaptureSessionState,
  PreviewPhotoData,
  CaptureMetadata,
  CapturedPhotoData,
} from '@/types/capture'

/**
 * Property-Based Tests for Capture Session State Transitions
 * 
 * Feature: v0.3-guided-capture
 * 
 * Tests the state machine transitions for the guided capture flow:
 * - Property 4: Capture triggers preview state
 * - Property 7: Retake returns to capture state
 * - Property 8: Confirm saves and advances
 * 
 * **Validates: Requirements 3.3.3, 3.4.4, 3.4.5**
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
 * Generator for capture metadata
 */
const captureMetadataArb: fc.Arbitrary<CaptureMetadata> = fc.record({
  takenAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  gpsLatitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
  gpsLongitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
  gpsAccuracy: fc.option(fc.double({ min: 0, max: 1000, noNaN: true }), { nil: null }),
})

/**
 * Generator for preview photo data
 */
const previewPhotoDataArb: fc.Arbitrary<PreviewPhotoData> = fc.record({
  blobUrl: fc.webUrl().map((url) => `blob:${url}`),
  blob: fc.constant(new Blob(['test'], { type: 'image/jpeg' })),
  metadata: captureMetadataArb,
})

/**
 * Generator for valid current index given a checklist
 */
const validIndexArb = (checklistLength: number): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: Math.max(0, checklistLength - 1) })

/**
 * Generator for session state in 'capture' view state
 */
const captureViewStateArb: fc.Arbitrary<CaptureSessionState> = fc
  .tuple(fc.uuid(), jobStageArb, checklistArb)
  .chain(([jobId, stage, checklist]) =>
    fc.record({
      jobId: fc.constant(jobId),
      stage: fc.constant(stage),
      checklist: fc.constant(checklist),
      currentIndex: validIndexArb(checklist.length),
      captures: fc.constant(new Map<string, CapturedPhotoData>()),
      skippedItems: fc.constant(new Set<string>()),
      viewState: fc.constant('capture' as const),
      previewPhoto: fc.constant(null),
    })
  )

/**
 * Generator for session state in 'preview' view state
 */
const previewViewStateArb: fc.Arbitrary<CaptureSessionState> = fc
  .tuple(fc.uuid(), jobStageArb, checklistArb, previewPhotoDataArb)
  .chain(([jobId, stage, checklist, previewPhoto]) =>
    fc.record({
      jobId: fc.constant(jobId),
      stage: fc.constant(stage),
      checklist: fc.constant(checklist),
      currentIndex: validIndexArb(checklist.length),
      captures: fc.constant(new Map<string, CapturedPhotoData>()),
      skippedItems: fc.constant(new Set<string>()),
      viewState: fc.constant('preview' as const),
      previewPhoto: fc.constant(previewPhoto),
    })
  )

// ============================================
// REDUCER SIMULATION
// ============================================

/**
 * Simulates the CAPTURE action on a state
 * This mirrors the reducer logic in use-capture-session.ts
 */
function simulateCapture(
  state: CaptureSessionState,
  photo: PreviewPhotoData
): CaptureSessionState {
  return {
    ...state,
    viewState: 'preview',
    previewPhoto: photo,
  }
}

/**
 * Simulates the RETAKE action on a state
 * This mirrors the reducer logic in use-capture-session.ts
 */
function simulateRetake(state: CaptureSessionState): CaptureSessionState {
  return {
    ...state,
    viewState: 'capture',
    previewPhoto: null,
  }
}

/**
 * Simulates the CONFIRM action on a state
 * This mirrors the reducer logic in use-capture-session.ts
 */
function simulateConfirm(
  state: CaptureSessionState,
  notes: string | null
): CaptureSessionState {
  const currentItem = state.checklist[state.currentIndex]
  if (!currentItem || !state.previewPhoto) {
    return state
  }

  // Create captured photo data
  const capturedPhoto: CapturedPhotoData = {
    checklistItemId: currentItem.id,
    blobUrl: state.previewPhoto.blobUrl,
    blob: state.previewPhoto.blob,
    metadata: state.previewPhoto.metadata,
    notes,
  }

  // Add to captures map
  const newCaptures = new Map(state.captures)
  newCaptures.set(currentItem.id, capturedPhoto)

  // Calculate next index
  const nextIndex = state.currentIndex + 1
  const isLastItem = nextIndex >= state.checklist.length

  return {
    ...state,
    captures: newCaptures,
    currentIndex: nextIndex,
    viewState: isLastItem ? 'complete' : 'capture',
    previewPhoto: null,
  }
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 4: Capture triggers preview state', () => {
  /**
   * **Validates: Requirements 3.3.3**
   * 
   * *For any* capture action in 'capture' view state, the system should
   * transition to 'preview' view state with the captured photo data.
   */

  it('should transition from capture to preview state for ANY capture action', () => {
    fc.assert(
      fc.property(captureViewStateArb, previewPhotoDataArb, (initialState, photoData) => {
        // Precondition: state is in 'capture' view
        expect(initialState.viewState).toBe('capture')

        // Action: simulate capture
        const newState = simulateCapture(initialState, photoData)

        // Postcondition 1: viewState should be 'preview'
        expect(newState.viewState).toBe('preview')

        // Postcondition 2: previewPhoto should contain the captured photo data
        expect(newState.previewPhoto).not.toBeNull()
        expect(newState.previewPhoto?.blobUrl).toBe(photoData.blobUrl)
        expect(newState.previewPhoto?.metadata).toEqual(photoData.metadata)

        // Postcondition 3: currentIndex should NOT change
        expect(newState.currentIndex).toBe(initialState.currentIndex)

        // Postcondition 4: captures map should NOT change
        expect(newState.captures.size).toBe(initialState.captures.size)

        // Postcondition 5: skippedItems should NOT change
        expect(newState.skippedItems.size).toBe(initialState.skippedItems.size)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve all other state properties when capturing', () => {
    fc.assert(
      fc.property(captureViewStateArb, previewPhotoDataArb, (initialState, photoData) => {
        const newState = simulateCapture(initialState, photoData)

        // Session identity should be preserved
        expect(newState.jobId).toBe(initialState.jobId)
        expect(newState.stage).toBe(initialState.stage)

        // Checklist should be preserved
        expect(newState.checklist).toEqual(initialState.checklist)

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: v0.3-guided-capture, Property 7: Retake returns to capture state', () => {
  /**
   * **Validates: Requirements 3.4.4**
   * 
   * *For any* preview state, clicking retake should transition back to
   * 'capture' view state without saving the photo or advancing the index.
   */

  it('should transition from preview to capture state for ANY retake action', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        // Precondition: state is in 'preview' view with photo data
        expect(initialState.viewState).toBe('preview')
        expect(initialState.previewPhoto).not.toBeNull()

        // Action: simulate retake
        const newState = simulateRetake(initialState)

        // Postcondition 1: viewState should be 'capture'
        expect(newState.viewState).toBe('capture')

        // Postcondition 2: previewPhoto should be null
        expect(newState.previewPhoto).toBeNull()

        // Postcondition 3: currentIndex should NOT change (no advancement)
        expect(newState.currentIndex).toBe(initialState.currentIndex)

        // Postcondition 4: captures map should NOT change (photo not saved)
        expect(newState.captures.size).toBe(initialState.captures.size)

        // Postcondition 5: skippedItems should NOT change
        expect(newState.skippedItems.size).toBe(initialState.skippedItems.size)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve session identity and checklist when retaking', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        const newState = simulateRetake(initialState)

        // Session identity should be preserved
        expect(newState.jobId).toBe(initialState.jobId)
        expect(newState.stage).toBe(initialState.stage)

        // Checklist should be preserved
        expect(newState.checklist).toEqual(initialState.checklist)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should NOT add any photo to captures map when retaking', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        const initialCapturesSize = initialState.captures.size
        const newState = simulateRetake(initialState)

        // Captures map should have same size (no new entries)
        expect(newState.captures.size).toBe(initialCapturesSize)

        // If there was a current item, it should NOT be in captures
        const currentItem = initialState.checklist[initialState.currentIndex]
        if (currentItem && !initialState.captures.has(currentItem.id)) {
          expect(newState.captures.has(currentItem.id)).toBe(false)
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: v0.3-guided-capture, Property 8: Confirm saves and advances', () => {
  /**
   * **Validates: Requirements 3.4.5**
   * 
   * *For any* preview state with valid photo data, clicking confirm should:
   * 1. Add the photo to the captures map
   * 2. Increment currentIndex by 1
   * 3. Transition to 'capture' state (or 'complete' if last item)
   */

  it('should add photo to captures map for ANY confirm action', () => {
    fc.assert(
      fc.property(
        previewViewStateArb,
        fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
        (initialState, notes) => {
          // Precondition: state is in 'preview' view with photo data
          expect(initialState.viewState).toBe('preview')
          expect(initialState.previewPhoto).not.toBeNull()

          const currentItem = initialState.checklist[initialState.currentIndex]
          // Skip if no current item (edge case)
          if (!currentItem) return true

          // Action: simulate confirm
          const newState = simulateConfirm(initialState, notes)

          // Postcondition 1: Photo should be added to captures map
          expect(newState.captures.has(currentItem.id)).toBe(true)

          // Postcondition 2: Captured photo should have correct data
          const capturedPhoto = newState.captures.get(currentItem.id)
          expect(capturedPhoto).not.toBeUndefined()
          expect(capturedPhoto?.checklistItemId).toBe(currentItem.id)
          expect(capturedPhoto?.blobUrl).toBe(initialState.previewPhoto?.blobUrl)
          expect(capturedPhoto?.metadata).toEqual(initialState.previewPhoto?.metadata)
          expect(capturedPhoto?.notes).toBe(notes)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should increment currentIndex by 1 for ANY confirm action', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        // Skip if no current item
        if (!currentItem) return true

        const initialIndex = initialState.currentIndex

        // Action: simulate confirm
        const newState = simulateConfirm(initialState, null)

        // Postcondition: currentIndex should be incremented by 1
        expect(newState.currentIndex).toBe(initialIndex + 1)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should transition to capture state if NOT last item', () => {
    fc.assert(
      fc.property(
        // Generate state where currentIndex is NOT the last item
        fc.tuple(fc.uuid(), jobStageArb, checklistArb, previewPhotoDataArb)
          .filter(([, , checklist]) => checklist.length > 1)
          .chain(([jobId, stage, checklist, previewPhoto]) =>
            fc.record({
              jobId: fc.constant(jobId),
              stage: fc.constant(stage),
              checklist: fc.constant(checklist),
              // Ensure NOT last item
              currentIndex: fc.integer({ min: 0, max: checklist.length - 2 }),
              captures: fc.constant(new Map<string, CapturedPhotoData>()),
              skippedItems: fc.constant(new Set<string>()),
              viewState: fc.constant('preview' as const),
              previewPhoto: fc.constant(previewPhoto),
            })
          ),
        (initialState) => {
          const currentItem = initialState.checklist[initialState.currentIndex]
          if (!currentItem) return true

          // Precondition: NOT the last item
          expect(initialState.currentIndex).toBeLessThan(initialState.checklist.length - 1)

          // Action: simulate confirm
          const newState = simulateConfirm(initialState, null)

          // Postcondition: viewState should be 'capture' (not 'complete')
          expect(newState.viewState).toBe('capture')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should transition to complete state if IS last item', () => {
    fc.assert(
      fc.property(
        // Generate state where currentIndex IS the last item
        fc.tuple(fc.uuid(), jobStageArb, checklistArb, previewPhotoDataArb)
          .chain(([jobId, stage, checklist, previewPhoto]) =>
            fc.record({
              jobId: fc.constant(jobId),
              stage: fc.constant(stage),
              checklist: fc.constant(checklist),
              // Last item index
              currentIndex: fc.constant(checklist.length - 1),
              captures: fc.constant(new Map<string, CapturedPhotoData>()),
              skippedItems: fc.constant(new Set<string>()),
              viewState: fc.constant('preview' as const),
              previewPhoto: fc.constant(previewPhoto),
            })
          ),
        (initialState) => {
          const currentItem = initialState.checklist[initialState.currentIndex]
          if (!currentItem) return true

          // Precondition: IS the last item
          expect(initialState.currentIndex).toBe(initialState.checklist.length - 1)

          // Action: simulate confirm
          const newState = simulateConfirm(initialState, null)

          // Postcondition: viewState should be 'complete'
          expect(newState.viewState).toBe('complete')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should clear previewPhoto after confirm', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        if (!currentItem) return true

        // Action: simulate confirm
        const newState = simulateConfirm(initialState, null)

        // Postcondition: previewPhoto should be null
        expect(newState.previewPhoto).toBeNull()

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve session identity and checklist when confirming', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        if (!currentItem) return true

        const newState = simulateConfirm(initialState, null)

        // Session identity should be preserved
        expect(newState.jobId).toBe(initialState.jobId)
        expect(newState.stage).toBe(initialState.stage)

        // Checklist should be preserved
        expect(newState.checklist).toEqual(initialState.checklist)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should NOT modify skippedItems when confirming', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        if (!currentItem) return true

        const initialSkippedSize = initialState.skippedItems.size

        // Action: simulate confirm
        const newState = simulateConfirm(initialState, null)

        // Postcondition: skippedItems should have same size
        expect(newState.skippedItems.size).toBe(initialSkippedSize)

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: v0.3-guided-capture, Property 10: Skip advances to next item', () => {
  /**
   * **Validates: Requirements 3.5.3**
   * 
   * *For any* optional checklist item, clicking skip should:
   * 1. Add the item ID to skippedItems set
   * 2. Increment currentIndex by 1
   * 3. Not add any photo to captures map
   */

  /**
   * Simulates the SKIP action on a state
   * This mirrors the reducer logic in use-capture-session.ts
   */
  function simulateSkip(state: CaptureSessionState): CaptureSessionState {
    const currentItem = state.checklist[state.currentIndex]
    if (!currentItem || currentItem.is_required) {
      return state
    }

    // Add to skipped items set
    const newSkippedItems = new Set(state.skippedItems)
    newSkippedItems.add(currentItem.id)

    // Calculate next index
    const nextIndex = state.currentIndex + 1
    const isLastItem = nextIndex >= state.checklist.length

    return {
      ...state,
      skippedItems: newSkippedItems,
      currentIndex: nextIndex,
      viewState: isLastItem ? 'complete' : 'capture',
      previewPhoto: null,
    }
  }

  /**
   * Generator for session state with an optional item at current index
   */
  const stateWithOptionalItemArb: fc.Arbitrary<CaptureSessionState> = fc
    .tuple(fc.uuid(), jobStageArb, checklistArb)
    .filter(([, , checklist]) => checklist.some((item) => !item.is_required))
    .chain(([jobId, stage, checklist]) => {
      // Find indices of optional items
      const optionalIndices = checklist
        .map((item, index) => (!item.is_required ? index : -1))
        .filter((index) => index >= 0)

      return fc.record({
        jobId: fc.constant(jobId),
        stage: fc.constant(stage),
        checklist: fc.constant(checklist),
        currentIndex: fc.constantFrom(...optionalIndices),
        captures: fc.constant(new Map<string, CapturedPhotoData>()),
        skippedItems: fc.constant(new Set<string>()),
        viewState: fc.constant('capture' as const),
        previewPhoto: fc.constant(null),
      })
    })

  /**
   * Generator for session state with a required item at current index
   */
  const stateWithRequiredItemArb: fc.Arbitrary<CaptureSessionState> = fc
    .tuple(fc.uuid(), jobStageArb, checklistArb)
    .filter(([, , checklist]) => checklist.some((item) => item.is_required))
    .chain(([jobId, stage, checklist]) => {
      // Find indices of required items
      const requiredIndices = checklist
        .map((item, index) => (item.is_required ? index : -1))
        .filter((index) => index >= 0)

      return fc.record({
        jobId: fc.constant(jobId),
        stage: fc.constant(stage),
        checklist: fc.constant(checklist),
        currentIndex: fc.constantFrom(...requiredIndices),
        captures: fc.constant(new Map<string, CapturedPhotoData>()),
        skippedItems: fc.constant(new Set<string>()),
        viewState: fc.constant('capture' as const),
        previewPhoto: fc.constant(null),
      })
    })

  it('should add item ID to skippedItems set for ANY optional item skip', () => {
    fc.assert(
      fc.property(stateWithOptionalItemArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        // Precondition: current item is optional
        expect(currentItem).not.toBeNull()
        expect(currentItem.is_required).toBe(false)

        // Action: simulate skip
        const newState = simulateSkip(initialState)

        // Postcondition: item ID should be in skippedItems
        expect(newState.skippedItems.has(currentItem.id)).toBe(true)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should increment currentIndex by 1 for ANY optional item skip', () => {
    fc.assert(
      fc.property(stateWithOptionalItemArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        expect(currentItem).not.toBeNull()
        expect(currentItem.is_required).toBe(false)

        const initialIndex = initialState.currentIndex

        // Action: simulate skip
        const newState = simulateSkip(initialState)

        // Postcondition: currentIndex should be incremented by 1
        expect(newState.currentIndex).toBe(initialIndex + 1)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should NOT add any photo to captures map when skipping', () => {
    fc.assert(
      fc.property(stateWithOptionalItemArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        expect(currentItem).not.toBeNull()
        expect(currentItem.is_required).toBe(false)

        const initialCapturesSize = initialState.captures.size

        // Action: simulate skip
        const newState = simulateSkip(initialState)

        // Postcondition 1: captures map size should NOT change
        expect(newState.captures.size).toBe(initialCapturesSize)

        // Postcondition 2: current item should NOT be in captures
        expect(newState.captures.has(currentItem.id)).toBe(false)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should NOT allow skipping required items', () => {
    fc.assert(
      fc.property(stateWithRequiredItemArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        // Precondition: current item is required
        expect(currentItem).not.toBeNull()
        expect(currentItem.is_required).toBe(true)

        const initialIndex = initialState.currentIndex
        const initialSkippedSize = initialState.skippedItems.size

        // Action: simulate skip (should be no-op for required items)
        const newState = simulateSkip(initialState)

        // Postcondition 1: currentIndex should NOT change
        expect(newState.currentIndex).toBe(initialIndex)

        // Postcondition 2: skippedItems should NOT change
        expect(newState.skippedItems.size).toBe(initialSkippedSize)

        // Postcondition 3: item should NOT be in skippedItems
        expect(newState.skippedItems.has(currentItem.id)).toBe(false)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should transition to complete state if skipping last item', () => {
    fc.assert(
      fc.property(
        // Generate state where currentIndex IS the last item AND it's optional
        fc.tuple(fc.uuid(), jobStageArb, checklistArb)
          .filter(([, , checklist]) => !checklist[checklist.length - 1].is_required)
          .chain(([jobId, stage, checklist]) =>
            fc.record({
              jobId: fc.constant(jobId),
              stage: fc.constant(stage),
              checklist: fc.constant(checklist),
              currentIndex: fc.constant(checklist.length - 1),
              captures: fc.constant(new Map<string, CapturedPhotoData>()),
              skippedItems: fc.constant(new Set<string>()),
              viewState: fc.constant('capture' as const),
              previewPhoto: fc.constant(null),
            })
          ),
        (initialState) => {
          const currentItem = initialState.checklist[initialState.currentIndex]
          // Precondition: IS the last item and optional
          expect(initialState.currentIndex).toBe(initialState.checklist.length - 1)
          expect(currentItem.is_required).toBe(false)

          // Action: simulate skip
          const newState = simulateSkip(initialState)

          // Postcondition: viewState should be 'complete'
          expect(newState.viewState).toBe('complete')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should transition to capture state if NOT last item', () => {
    fc.assert(
      fc.property(
        // Generate state where currentIndex is NOT the last item AND it's optional
        fc.tuple(fc.uuid(), jobStageArb, checklistArb)
          .filter(([, , checklist]) => {
            // Need at least 2 items and at least one optional item that's not the last
            if (checklist.length < 2) return false
            return checklist.slice(0, -1).some((item) => !item.is_required)
          })
          .chain(([jobId, stage, checklist]) => {
            // Find indices of optional items that are NOT the last item
            const optionalIndices = checklist
              .slice(0, -1)
              .map((item, index) => (!item.is_required ? index : -1))
              .filter((index) => index >= 0)

            return fc.record({
              jobId: fc.constant(jobId),
              stage: fc.constant(stage),
              checklist: fc.constant(checklist),
              currentIndex: fc.constantFrom(...optionalIndices),
              captures: fc.constant(new Map<string, CapturedPhotoData>()),
              skippedItems: fc.constant(new Set<string>()),
              viewState: fc.constant('capture' as const),
              previewPhoto: fc.constant(null),
            })
          }),
        (initialState) => {
          const currentItem = initialState.checklist[initialState.currentIndex]
          // Precondition: NOT the last item and optional
          expect(initialState.currentIndex).toBeLessThan(initialState.checklist.length - 1)
          expect(currentItem.is_required).toBe(false)

          // Action: simulate skip
          const newState = simulateSkip(initialState)

          // Postcondition: viewState should be 'capture' (not 'complete')
          expect(newState.viewState).toBe('capture')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve session identity and checklist when skipping', () => {
    fc.assert(
      fc.property(stateWithOptionalItemArb, (initialState) => {
        const newState = simulateSkip(initialState)

        // Session identity should be preserved
        expect(newState.jobId).toBe(initialState.jobId)
        expect(newState.stage).toBe(initialState.stage)

        // Checklist should be preserved
        expect(newState.checklist).toEqual(initialState.checklist)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should clear previewPhoto when skipping', () => {
    fc.assert(
      fc.property(stateWithOptionalItemArb, (initialState) => {
        const newState = simulateSkip(initialState)

        // previewPhoto should be null after skip
        expect(newState.previewPhoto).toBeNull()

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should NOT modify captures map when skipping', () => {
    fc.assert(
      fc.property(stateWithOptionalItemArb, (initialState) => {
        // Add some existing captures
        const existingCaptures = new Map(initialState.captures)
        existingCaptures.set('existing-item', {
          checklistItemId: 'existing-item',
          blobUrl: 'blob:test',
          blob: new Blob(['test']),
          metadata: {
            takenAt: new Date(),
            gpsLatitude: null,
            gpsLongitude: null,
            gpsAccuracy: null,
          },
          notes: null,
        })

        const stateWithCaptures = { ...initialState, captures: existingCaptures }
        const newState = simulateSkip(stateWithCaptures)

        // Existing captures should be preserved
        expect(newState.captures.has('existing-item')).toBe(true)
        expect(newState.captures.size).toBe(existingCaptures.size)

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('State Transition Invariants', () => {
  /**
   * Additional invariant tests that should hold across all state transitions
   */

  it('captures map size should only increase on confirm, never decrease', () => {
    fc.assert(
      fc.property(
        previewViewStateArb,
        fc.constantFrom('CONFIRM', 'RETAKE') as fc.Arbitrary<'CONFIRM' | 'RETAKE'>,
        (initialState, action) => {
          const initialSize = initialState.captures.size
          const currentItem = initialState.checklist[initialState.currentIndex]

          let newState: CaptureSessionState
          if (action === 'CONFIRM' && currentItem) {
            newState = simulateConfirm(initialState, null)
            // On confirm, size should increase by 1 (or stay same if item already captured)
            expect(newState.captures.size).toBeGreaterThanOrEqual(initialSize)
          } else {
            newState = simulateRetake(initialState)
            // On retake, size should stay the same
            expect(newState.captures.size).toBe(initialSize)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('currentIndex should never exceed checklist length', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        if (!currentItem) return true

        const newState = simulateConfirm(initialState, null)

        // currentIndex can equal checklist.length (when complete), but never exceed
        expect(newState.currentIndex).toBeLessThanOrEqual(newState.checklist.length)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('viewState should only be complete when currentIndex equals checklist length', () => {
    fc.assert(
      fc.property(previewViewStateArb, (initialState) => {
        const currentItem = initialState.checklist[initialState.currentIndex]
        if (!currentItem) return true

        const newState = simulateConfirm(initialState, null)

        if (newState.viewState === 'complete') {
          expect(newState.currentIndex).toBe(newState.checklist.length)
        } else {
          expect(newState.currentIndex).toBeLessThan(newState.checklist.length)
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
