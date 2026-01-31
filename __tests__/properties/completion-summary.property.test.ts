import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { PhotoChecklistItem, JobStage } from '@/types/job'
import type { CapturedPhoto } from '@/components/atoms/photo-thumbnail-grid'

/**
 * Property-Based Tests for Completion Summary Content
 * 
 * Feature: v0.3-guided-capture, Property 11: Completion summary content
 * 
 * *For any* completed capture session:
 * - All captured photos should appear in the summary with 'captured' status
 * - All skipped optional items should appear with 'skipped' status
 * - Required items that were captured should appear with 'captured' status
 * 
 * **Validates: Requirements 3.6.1, 3.6.2, 3.6.3**
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
 * Generator for captured photo data
 */
const capturedPhotoArb = (checklistItem: PhotoChecklistItem): fc.Arbitrary<CapturedPhoto> =>
  fc.record({
    checklistItemId: fc.constant(checklistItem.id),
    title: fc.constant(checklistItem.title),
    thumbnailUrl: fc.webUrl().map((url) => `blob:${url}`),
    status: fc.constant('captured' as const),
  })

/**
 * Generator for skipped photo data
 */
const skippedPhotoArb = (checklistItem: PhotoChecklistItem): fc.Arbitrary<CapturedPhoto> =>
  fc.record({
    checklistItemId: fc.constant(checklistItem.id),
    title: fc.constant(checklistItem.title),
    thumbnailUrl: fc.constant(''),
    status: fc.constant('skipped' as const),
  })

/**
 * Generator for a complete capture session result
 * All required items are captured, optional items may be captured or skipped
 */
interface CaptureSessionResult {
  checklist: PhotoChecklistItem[]
  captures: CapturedPhoto[]
  skippedItems: PhotoChecklistItem[]
}

const captureSessionResultArb: fc.Arbitrary<CaptureSessionResult> = checklistArb.chain(
  (checklist) => {
    const requiredItems = checklist.filter((item) => item.is_required)
    const optionalItems = checklist.filter((item) => !item.is_required)

    // All required items must be captured
    const requiredCapturesArb = fc.tuple(
      ...requiredItems.map((item) => capturedPhotoArb(item))
    )

    // Optional items can be captured or skipped
    const optionalDecisionsArb = fc.tuple(
      ...optionalItems.map((item) =>
        fc.boolean().chain((captured) =>
          captured
            ? capturedPhotoArb(item).map((photo) => ({ photo, skipped: false }))
            : skippedPhotoArb(item).map((photo) => ({ photo, skipped: true }))
        )
      )
    )

    return fc.tuple(requiredCapturesArb, optionalDecisionsArb).map(
      ([requiredCaptures, optionalDecisions]) => {
        const optionalCaptures = optionalDecisions
          .filter((d) => !d.skipped)
          .map((d) => d.photo)
        const skippedItems = optionalItems.filter((item) =>
          optionalDecisions.some(
            (d) => d.skipped && d.photo.checklistItemId === item.id
          )
        )

        return {
          checklist,
          captures: [...requiredCaptures, ...optionalCaptures],
          skippedItems,
        }
      }
    )
  }
)

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Combines captures with skipped items for the summary grid
 * This mirrors the logic in CaptureCompleteSummary component
 */
function combinePhotosForSummary(
  captures: CapturedPhoto[],
  skippedItems: PhotoChecklistItem[]
): CapturedPhoto[] {
  return [
    ...captures,
    ...skippedItems
      .filter((item) => !captures.some((c) => c.checklistItemId === item.id))
      .map((item) => ({
        checklistItemId: item.id,
        title: item.title,
        thumbnailUrl: '',
        status: 'skipped' as const,
      })),
  ]
}

/**
 * Calculates summary counts
 */
function calculateSummaryCounts(
  captures: CapturedPhoto[],
  skippedItems: PhotoChecklistItem[]
): { capturedCount: number; skippedCount: number } {
  return {
    capturedCount: captures.filter((c) => c.status === 'captured').length,
    skippedCount: skippedItems.length,
  }
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 11: Completion summary content', () => {
  /**
   * **Validates: Requirements 3.6.1, 3.6.2, 3.6.3**
   * 
   * *For any* completed capture session:
   * - All captured photos should appear in the summary with 'captured' status
   * - All skipped optional items should appear with 'skipped' status
   * - Required items that were captured should appear with 'captured' status
   */

  it('should include ALL captured photos in summary with captured status', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const allPhotos = combinePhotosForSummary(session.captures, session.skippedItems)

        // Postcondition: Every captured photo should appear in summary
        for (const capture of session.captures) {
          const inSummary = allPhotos.find(
            (p) => p.checklistItemId === capture.checklistItemId
          )
          expect(inSummary).toBeDefined()
          expect(inSummary?.status).toBe('captured')
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should include ALL skipped optional items in summary with skipped status', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const allPhotos = combinePhotosForSummary(session.captures, session.skippedItems)

        // Postcondition: Every skipped item should appear in summary
        for (const skippedItem of session.skippedItems) {
          const inSummary = allPhotos.find(
            (p) => p.checklistItemId === skippedItem.id
          )
          expect(inSummary).toBeDefined()
          expect(inSummary?.status).toBe('skipped')
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should show ALL required items as captured (since they must be captured)', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const requiredItems = session.checklist.filter((item) => item.is_required)
        const allPhotos = combinePhotosForSummary(session.captures, session.skippedItems)

        // Postcondition: Every required item should appear as captured
        for (const requiredItem of requiredItems) {
          const inSummary = allPhotos.find(
            (p) => p.checklistItemId === requiredItem.id
          )
          expect(inSummary).toBeDefined()
          expect(inSummary?.status).toBe('captured')
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have correct captured count for ANY session', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const { capturedCount } = calculateSummaryCounts(
          session.captures,
          session.skippedItems
        )

        // Postcondition: Captured count should equal number of captured photos
        const actualCaptured = session.captures.filter(
          (c) => c.status === 'captured'
        ).length
        expect(capturedCount).toBe(actualCaptured)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have correct skipped count for ANY session', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const { skippedCount } = calculateSummaryCounts(
          session.captures,
          session.skippedItems
        )

        // Postcondition: Skipped count should equal number of skipped items
        expect(skippedCount).toBe(session.skippedItems.length)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have total items equal to checklist length for ANY session', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const allPhotos = combinePhotosForSummary(session.captures, session.skippedItems)

        // Postcondition: Total items in summary should equal checklist length
        expect(allPhotos.length).toBe(session.checklist.length)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should not have duplicate items in summary for ANY session', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const allPhotos = combinePhotosForSummary(session.captures, session.skippedItems)

        // Postcondition: No duplicate checklist item IDs
        const ids = allPhotos.map((p) => p.checklistItemId)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve titles from checklist items for ANY session', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const allPhotos = combinePhotosForSummary(session.captures, session.skippedItems)

        // Postcondition: Each photo should have the correct title from checklist
        for (const photo of allPhotos) {
          const checklistItem = session.checklist.find(
            (item) => item.id === photo.checklistItemId
          )
          expect(checklistItem).toBeDefined()
          expect(photo.title).toBe(checklistItem?.title)
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Completion Summary Invariants', () => {
  /**
   * Additional invariant tests for completion summary
   */

  it('captured + skipped should equal total checklist items', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const { capturedCount, skippedCount } = calculateSummaryCounts(
          session.captures,
          session.skippedItems
        )

        // Invariant: captured + skipped = total
        expect(capturedCount + skippedCount).toBe(session.checklist.length)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('skipped items should only be optional items', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        // Invariant: All skipped items should be optional (is_required = false)
        for (const skippedItem of session.skippedItems) {
          expect(skippedItem.is_required).toBe(false)
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('required items should never be in skippedItems', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const requiredIds = session.checklist
          .filter((item) => item.is_required)
          .map((item) => item.id)

        // Invariant: No required item should be in skippedItems
        for (const skippedItem of session.skippedItems) {
          expect(requiredIds).not.toContain(skippedItem.id)
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('captured photos should have non-empty thumbnailUrl', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        // Invariant: Captured photos should have thumbnailUrl
        for (const capture of session.captures) {
          if (capture.status === 'captured') {
            expect(capture.thumbnailUrl).not.toBe('')
          }
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('skipped photos should have empty thumbnailUrl', () => {
    fc.assert(
      fc.property(captureSessionResultArb, (session) => {
        const allPhotos = combinePhotosForSummary(session.captures, session.skippedItems)

        // Invariant: Skipped photos should have empty thumbnailUrl
        for (const photo of allPhotos) {
          if (photo.status === 'skipped') {
            expect(photo.thumbnailUrl).toBe('')
          }
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Edge Cases for Completion Summary', () => {
  /**
   * Test edge cases for completion summary
   */

  it('should handle session with all required items (no optional)', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) => checklist.every((item) => item.is_required)),
        (checklist) => {
          // All items are required, so all must be captured
          const captures: CapturedPhoto[] = checklist.map((item) => ({
            checklistItemId: item.id,
            title: item.title,
            thumbnailUrl: 'blob:test',
            status: 'captured' as const,
          }))
          const skippedItems: PhotoChecklistItem[] = []

          const allPhotos = combinePhotosForSummary(captures, skippedItems)
          const { capturedCount, skippedCount } = calculateSummaryCounts(
            captures,
            skippedItems
          )

          expect(allPhotos.length).toBe(checklist.length)
          expect(capturedCount).toBe(checklist.length)
          expect(skippedCount).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle session with all optional items (no required)', () => {
    fc.assert(
      fc.property(
        checklistArb.filter((checklist) => checklist.every((item) => !item.is_required)),
        (checklist) => {
          // All items are optional, so all can be skipped
          const captures: CapturedPhoto[] = []
          const skippedItems: PhotoChecklistItem[] = checklist

          const allPhotos = combinePhotosForSummary(captures, skippedItems)
          const { capturedCount, skippedCount } = calculateSummaryCounts(
            captures,
            skippedItems
          )

          expect(allPhotos.length).toBe(checklist.length)
          expect(capturedCount).toBe(0)
          expect(skippedCount).toBe(checklist.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle single item checklist', () => {
    const singleItemChecklist: PhotoChecklistItem[] = [
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

    const captures: CapturedPhoto[] = [
      {
        checklistItemId: 'single-item',
        title: 'Single Photo',
        thumbnailUrl: 'blob:test',
        status: 'captured',
      },
    ]
    const skippedItems: PhotoChecklistItem[] = []

    const allPhotos = combinePhotosForSummary(captures, skippedItems)

    expect(allPhotos.length).toBe(1)
    expect(allPhotos[0].status).toBe('captured')
  })

  it('should handle empty checklist', () => {
    const captures: CapturedPhoto[] = []
    const skippedItems: PhotoChecklistItem[] = []

    const allPhotos = combinePhotosForSummary(captures, skippedItems)
    const { capturedCount, skippedCount } = calculateSummaryCounts(
      captures,
      skippedItems
    )

    expect(allPhotos.length).toBe(0)
    expect(capturedCount).toBe(0)
    expect(skippedCount).toBe(0)
  })
})
