/**
 * Property-Based Tests: Stage Completion
 * 
 * Property 12: Stage Completion Updates Progress
 * For any capture session where all required checklist items have been captured,
 * the job's stage progress should reflect isComplete: true.
 * 
 * Feature: v0.3-guided-capture
 * Validates: Requirements 3.6.5
 */

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'

// ============================================
// TYPES FOR TESTING
// ============================================

interface ChecklistItem {
  id: string
  stage: 'job_start' | 'in_transit' | 'job_end'
  is_required: boolean
  is_active: boolean
}

interface CapturedPhoto {
  checklist_item_id: string
  is_deleted: boolean
}

interface StageCompletionResult {
  isComplete: boolean
  requiredCount: number
  capturedCount: number
  missingItemIds: string[]
}

// ============================================
// PURE FUNCTION UNDER TEST
// ============================================

/**
 * Pure function that calculates stage completion
 * This mirrors the logic in checkStageCompletion server action
 */
function calculateStageCompletion(
  stage: 'job_start' | 'in_transit' | 'job_end',
  checklistItems: ChecklistItem[],
  capturedPhotos: CapturedPhoto[]
): StageCompletionResult {
  // Get required checklist items for this stage
  const requiredItems = checklistItems.filter(
    item => item.stage === stage && item.is_required && item.is_active
  )
  
  const requiredIds = requiredItems.map(item => item.id)
  
  // If no required items, stage is automatically complete
  if (requiredIds.length === 0) {
    return {
      isComplete: true,
      requiredCount: 0,
      capturedCount: 0,
      missingItemIds: []
    }
  }
  
  // Get non-deleted photos that match required items
  const capturedIds = new Set(
    capturedPhotos
      .filter(p => !p.is_deleted && requiredIds.includes(p.checklist_item_id))
      .map(p => p.checklist_item_id)
  )
  
  const missingItemIds = requiredIds.filter(id => !capturedIds.has(id))
  const capturedCount = requiredIds.length - missingItemIds.length
  
  return {
    isComplete: missingItemIds.length === 0,
    requiredCount: requiredIds.length,
    capturedCount,
    missingItemIds
  }
}

// ============================================
// ARBITRARIES
// ============================================

const stageArb = fc.constantFrom('job_start', 'in_transit', 'job_end') as fc.Arbitrary<'job_start' | 'in_transit' | 'job_end'>

const checklistItemArb = (stage: 'job_start' | 'in_transit' | 'job_end') => fc.record({
  id: fc.uuid(),
  stage: fc.constant(stage),
  is_required: fc.boolean(),
  is_active: fc.boolean()
})

const capturedPhotoArb = (checklistItemId: string) => fc.record({
  checklist_item_id: fc.constant(checklistItemId),
  is_deleted: fc.boolean()
})

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 12: Stage completion updates progress', () => {
  it('should return isComplete=true when all required items have non-deleted photos', () => {
    fc.assert(
      fc.property(
        stageArb,
        fc.integer({ min: 1, max: 10 }),
        (stage, requiredCount) => {
          // Generate required checklist items
          const checklistItems: ChecklistItem[] = []
          const capturedPhotos: CapturedPhoto[] = []
          
          for (let i = 0; i < requiredCount; i++) {
            const id = `item-${i}`
            checklistItems.push({
              id,
              stage,
              is_required: true,
              is_active: true
            })
            // Capture a non-deleted photo for each required item
            capturedPhotos.push({
              checklist_item_id: id,
              is_deleted: false
            })
          }
          
          const result = calculateStageCompletion(stage, checklistItems, capturedPhotos)
          
          expect(result.isComplete).toBe(true)
          expect(result.requiredCount).toBe(requiredCount)
          expect(result.capturedCount).toBe(requiredCount)
          expect(result.missingItemIds).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return isComplete=false when some required items are missing photos', () => {
    fc.assert(
      fc.property(
        stageArb,
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 1, max: 9 }),
        (stage, totalRequired, capturedCount) => {
          // Ensure capturedCount is less than totalRequired
          const actualCaptured = Math.min(capturedCount, totalRequired - 1)
          
          // Generate required checklist items
          const checklistItems: ChecklistItem[] = []
          const capturedPhotos: CapturedPhoto[] = []
          
          for (let i = 0; i < totalRequired; i++) {
            const id = `item-${i}`
            checklistItems.push({
              id,
              stage,
              is_required: true,
              is_active: true
            })
            // Only capture photos for some items
            if (i < actualCaptured) {
              capturedPhotos.push({
                checklist_item_id: id,
                is_deleted: false
              })
            }
          }
          
          const result = calculateStageCompletion(stage, checklistItems, capturedPhotos)
          
          expect(result.isComplete).toBe(false)
          expect(result.requiredCount).toBe(totalRequired)
          expect(result.capturedCount).toBe(actualCaptured)
          expect(result.missingItemIds).toHaveLength(totalRequired - actualCaptured)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return isComplete=true when stage has no required items', () => {
    fc.assert(
      fc.property(
        stageArb,
        fc.integer({ min: 0, max: 5 }),
        (stage, optionalCount) => {
          // Generate only optional checklist items
          const checklistItems: ChecklistItem[] = []
          
          for (let i = 0; i < optionalCount; i++) {
            checklistItems.push({
              id: `item-${i}`,
              stage,
              is_required: false,
              is_active: true
            })
          }
          
          const result = calculateStageCompletion(stage, checklistItems, [])
          
          expect(result.isComplete).toBe(true)
          expect(result.requiredCount).toBe(0)
          expect(result.capturedCount).toBe(0)
          expect(result.missingItemIds).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ignore deleted photos when calculating completion', () => {
    fc.assert(
      fc.property(
        stageArb,
        fc.integer({ min: 1, max: 5 }),
        (stage, requiredCount) => {
          // Generate required checklist items
          const checklistItems: ChecklistItem[] = []
          const capturedPhotos: CapturedPhoto[] = []
          
          for (let i = 0; i < requiredCount; i++) {
            const id = `item-${i}`
            checklistItems.push({
              id,
              stage,
              is_required: true,
              is_active: true
            })
            // All photos are deleted
            capturedPhotos.push({
              checklist_item_id: id,
              is_deleted: true
            })
          }
          
          const result = calculateStageCompletion(stage, checklistItems, capturedPhotos)
          
          // Should be incomplete because all photos are deleted
          expect(result.isComplete).toBe(false)
          expect(result.requiredCount).toBe(requiredCount)
          expect(result.capturedCount).toBe(0)
          expect(result.missingItemIds).toHaveLength(requiredCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ignore inactive checklist items', () => {
    fc.assert(
      fc.property(
        stageArb,
        fc.integer({ min: 1, max: 5 }),
        (stage, inactiveCount) => {
          // Generate inactive required checklist items
          const checklistItems: ChecklistItem[] = []
          
          for (let i = 0; i < inactiveCount; i++) {
            checklistItems.push({
              id: `item-${i}`,
              stage,
              is_required: true,
              is_active: false // Inactive
            })
          }
          
          const result = calculateStageCompletion(stage, checklistItems, [])
          
          // Should be complete because inactive items are ignored
          expect(result.isComplete).toBe(true)
          expect(result.requiredCount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should only consider items for the specified stage', () => {
    fc.assert(
      fc.property(
        stageArb,
        fc.integer({ min: 1, max: 5 }),
        (targetStage, itemCount) => {
          // Generate items for different stages
          const otherStages = ['job_start', 'in_transit', 'job_end'].filter(s => s !== targetStage) as ('job_start' | 'in_transit' | 'job_end')[]
          
          const checklistItems: ChecklistItem[] = []
          
          // Add required items for other stages (should be ignored)
          for (const otherStage of otherStages) {
            for (let i = 0; i < itemCount; i++) {
              checklistItems.push({
                id: `${otherStage}-item-${i}`,
                stage: otherStage,
                is_required: true,
                is_active: true
              })
            }
          }
          
          const result = calculateStageCompletion(targetStage, checklistItems, [])
          
          // Should be complete because target stage has no required items
          expect(result.isComplete).toBe(true)
          expect(result.requiredCount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly count captured vs required items', () => {
    fc.assert(
      fc.property(
        stageArb,
        fc.array(fc.record({
          is_required: fc.boolean(),
          is_active: fc.boolean(),
          has_photo: fc.boolean(),
          photo_deleted: fc.boolean()
        }), { minLength: 1, maxLength: 15 }),
        (stage, itemConfigs) => {
          const checklistItems: ChecklistItem[] = []
          const capturedPhotos: CapturedPhoto[] = []
          
          itemConfigs.forEach((config, i) => {
            const id = `item-${i}`
            checklistItems.push({
              id,
              stage,
              is_required: config.is_required,
              is_active: config.is_active
            })
            
            if (config.has_photo) {
              capturedPhotos.push({
                checklist_item_id: id,
                is_deleted: config.photo_deleted
              })
            }
          })
          
          const result = calculateStageCompletion(stage, checklistItems, capturedPhotos)
          
          // Calculate expected values
          const requiredActiveItems = itemConfigs.filter(c => c.is_required && c.is_active)
          const expectedRequired = requiredActiveItems.length
          const expectedCaptured = requiredActiveItems.filter(
            (c, i) => c.has_photo && !c.photo_deleted
          ).length
          
          // Verify counts match
          expect(result.requiredCount).toBe(expectedRequired)
          
          // isComplete should be true only if all required items are captured
          if (expectedRequired === 0) {
            expect(result.isComplete).toBe(true)
          } else {
            // Count how many required items have non-deleted photos
            const capturedRequiredCount = itemConfigs.filter((c, i) => {
              if (!c.is_required || !c.is_active) return false
              return c.has_photo && !c.photo_deleted
            }).length
            
            expect(result.isComplete).toBe(capturedRequiredCount === expectedRequired)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
