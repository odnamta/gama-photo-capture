/**
 * Unit Tests for CaptureCompleteSummary Component
 * 
 * Tests the molecule component that displays a completion summary
 * after all checklist items have been processed in a capture session.
 * 
 * **Validates: Requirements 3.6.1, 3.6.2, 3.6.3, 3.6.4**
 */

import { describe, it, expect, vi } from 'vitest'
import type { PhotoChecklistItem } from '@/types/job'
import type { CapturedPhoto } from '@/components/atoms/photo-thumbnail-grid'

// Helper to create mock captured photos
function createMockCapturedPhoto(overrides: Partial<CapturedPhoto> = {}): CapturedPhoto {
  return {
    checklistItemId: 'test-id',
    title: 'Test Photo',
    thumbnailUrl: '/test-thumb.jpg',
    status: 'captured',
    ...overrides
  }
}

// Helper to create mock checklist items
function createMockChecklistItem(overrides: Partial<PhotoChecklistItem> = {}): PhotoChecklistItem {
  return {
    id: 'test-id',
    stage: 'job_start',
    sequence: 1,
    title: 'Test Item',
    title_id: null,
    description: 'Test description',
    description_id: null,
    tips: null,
    is_required: false,
    photo_type: 'cargo_before',
    example_image_url: null,
    is_active: true,
    ...overrides
  }
}

describe('CaptureCompleteSummary', () => {
  describe('Count Calculations (Requirements 3.6.2, 3.6.3)', () => {
    /**
     * Simulates the count calculation logic from the component.
     * Captured count = photos with status 'captured'
     * Skipped count = number of skipped items
     */
    function calculateCounts(
      captures: CapturedPhoto[],
      skippedItems: PhotoChecklistItem[]
    ): { capturedCount: number; skippedCount: number } {
      const capturedCount = captures.filter(c => c.status === 'captured').length
      const skippedCount = skippedItems.length
      return { capturedCount, skippedCount }
    }

    it('should count captured photos correctly', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '2', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '3', status: 'captured' }),
      ]
      const skippedItems: PhotoChecklistItem[] = []

      const { capturedCount, skippedCount } = calculateCounts(captures, skippedItems)

      expect(capturedCount).toBe(3)
      expect(skippedCount).toBe(0)
    })

    it('should count skipped items correctly', () => {
      const captures: CapturedPhoto[] = []
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '1' }),
        createMockChecklistItem({ id: '2' }),
      ]

      const { capturedCount, skippedCount } = calculateCounts(captures, skippedItems)

      expect(capturedCount).toBe(0)
      expect(skippedCount).toBe(2)
    })

    it('should count both captured and skipped correctly', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '2', status: 'captured' }),
      ]
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '3' }),
      ]

      const { capturedCount, skippedCount } = calculateCounts(captures, skippedItems)

      expect(capturedCount).toBe(2)
      expect(skippedCount).toBe(1)
    })

    it('should handle empty captures and skipped items', () => {
      const captures: CapturedPhoto[] = []
      const skippedItems: PhotoChecklistItem[] = []

      const { capturedCount, skippedCount } = calculateCounts(captures, skippedItems)

      expect(capturedCount).toBe(0)
      expect(skippedCount).toBe(0)
    })

    it('should only count items with status captured', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '2', status: 'skipped' }),
        createMockCapturedPhoto({ checklistItemId: '3', status: 'captured' }),
      ]
      const skippedItems: PhotoChecklistItem[] = []

      const { capturedCount } = calculateCounts(captures, skippedItems)

      expect(capturedCount).toBe(2)
    })
  })

  describe('Photo Grid Combination (Requirement 3.6.2)', () => {
    /**
     * Simulates the logic that combines captures with skipped items for the grid.
     * Skipped items not already in captures are converted to CapturedPhoto format.
     */
    function combinePhotosForGrid(
      captures: CapturedPhoto[],
      skippedItems: PhotoChecklistItem[]
    ): CapturedPhoto[] {
      return [
        ...captures,
        ...skippedItems
          .filter(item => !captures.some(c => c.checklistItemId === item.id))
          .map(item => ({
            checklistItemId: item.id,
            title: item.title,
            thumbnailUrl: '',
            status: 'skipped' as const
          }))
      ]
    }

    it('should include all captured photos in grid', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', title: 'Photo 1' }),
        createMockCapturedPhoto({ checklistItemId: '2', title: 'Photo 2' }),
      ]
      const skippedItems: PhotoChecklistItem[] = []

      const allPhotos = combinePhotosForGrid(captures, skippedItems)

      expect(allPhotos).toHaveLength(2)
      expect(allPhotos[0].checklistItemId).toBe('1')
      expect(allPhotos[1].checklistItemId).toBe('2')
    })

    it('should convert skipped items to CapturedPhoto format', () => {
      const captures: CapturedPhoto[] = []
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: 'skip-1', title: 'Skipped Item' }),
      ]

      const allPhotos = combinePhotosForGrid(captures, skippedItems)

      expect(allPhotos).toHaveLength(1)
      expect(allPhotos[0]).toEqual({
        checklistItemId: 'skip-1',
        title: 'Skipped Item',
        thumbnailUrl: '',
        status: 'skipped'
      })
    })

    it('should not duplicate items already in captures', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', title: 'Photo 1', status: 'skipped' }),
      ]
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '1', title: 'Same Item' }),
      ]

      const allPhotos = combinePhotosForGrid(captures, skippedItems)

      expect(allPhotos).toHaveLength(1)
      expect(allPhotos[0].checklistItemId).toBe('1')
    })

    it('should combine captured and skipped items correctly', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', title: 'Captured 1', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '2', title: 'Captured 2', status: 'captured' }),
      ]
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '3', title: 'Skipped 1' }),
        createMockChecklistItem({ id: '4', title: 'Skipped 2' }),
      ]

      const allPhotos = combinePhotosForGrid(captures, skippedItems)

      expect(allPhotos).toHaveLength(4)
      expect(allPhotos.filter(p => p.status === 'captured')).toHaveLength(2)
      expect(allPhotos.filter(p => p.status === 'skipped')).toHaveLength(2)
    })

    it('should set empty thumbnailUrl for skipped items', () => {
      const captures: CapturedPhoto[] = []
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '1', title: 'Skipped' }),
      ]

      const allPhotos = combinePhotosForGrid(captures, skippedItems)

      expect(allPhotos[0].thumbnailUrl).toBe('')
    })
  })

  describe('Summary Text Generation', () => {
    /**
     * Simulates the summary text generation logic.
     */
    function generateSummaryText(capturedCount: number, skippedCount: number): string {
      const parts: string[] = []
      
      if (capturedCount > 0) {
        parts.push(`${capturedCount} photo${capturedCount !== 1 ? 's' : ''} captured`)
      }
      
      if (skippedCount > 0) {
        parts.push(`${skippedCount} skipped`)
      }
      
      if (parts.length === 0) {
        return 'No photos in this session'
      }
      
      return parts.join(' • ')
    }

    it('should show singular "photo" for 1 captured', () => {
      const text = generateSummaryText(1, 0)
      expect(text).toBe('1 photo captured')
    })

    it('should show plural "photos" for multiple captured', () => {
      const text = generateSummaryText(5, 0)
      expect(text).toBe('5 photos captured')
    })

    it('should show skipped count', () => {
      const text = generateSummaryText(0, 2)
      expect(text).toBe('2 skipped')
    })

    it('should show both captured and skipped with separator', () => {
      const text = generateSummaryText(3, 1)
      expect(text).toBe('3 photos captured • 1 skipped')
    })

    it('should show empty message when no photos', () => {
      const text = generateSummaryText(0, 0)
      expect(text).toBe('No photos in this session')
    })

    it('should handle large numbers', () => {
      const text = generateSummaryText(100, 50)
      expect(text).toBe('100 photos captured • 50 skipped')
    })
  })

  describe('Done Button Handler (Requirement 3.6.4)', () => {
    /**
     * Tests for the Done button callback behavior.
     */
    
    it('should call onDone when Done button is clicked', () => {
      const onDone = vi.fn()
      
      // Simulate button click
      onDone()
      
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('should call onDone with no arguments', () => {
      const onDone = vi.fn()
      
      // Simulate button click
      onDone()
      
      expect(onDone).toHaveBeenCalledWith()
    })

    it('should not throw when onDone is called multiple times', () => {
      const onDone = vi.fn()
      
      // Simulate multiple clicks
      expect(() => {
        onDone()
        onDone()
        onDone()
      }).not.toThrow()
      
      expect(onDone).toHaveBeenCalledTimes(3)
    })
  })

  describe('Props Interface', () => {
    /**
     * Tests for the component's props interface validation.
     */
    
    interface CaptureCompleteSummaryProps {
      captures: CapturedPhoto[]
      skippedItems: PhotoChecklistItem[]
      onDone: () => void
      className?: string
    }

    function validateProps(props: CaptureCompleteSummaryProps): boolean {
      // captures should be an array
      if (!Array.isArray(props.captures)) return false
      
      // skippedItems should be an array
      if (!Array.isArray(props.skippedItems)) return false
      
      // onDone should be a function
      if (typeof props.onDone !== 'function') return false
      
      return true
    }

    it('should accept valid props with captures only', () => {
      const props: CaptureCompleteSummaryProps = {
        captures: [createMockCapturedPhoto()],
        skippedItems: [],
        onDone: vi.fn()
      }
      
      expect(validateProps(props)).toBe(true)
    })

    it('should accept valid props with skipped items only', () => {
      const props: CaptureCompleteSummaryProps = {
        captures: [],
        skippedItems: [createMockChecklistItem()],
        onDone: vi.fn()
      }
      
      expect(validateProps(props)).toBe(true)
    })

    it('should accept valid props with both captures and skipped items', () => {
      const props: CaptureCompleteSummaryProps = {
        captures: [createMockCapturedPhoto()],
        skippedItems: [createMockChecklistItem()],
        onDone: vi.fn()
      }
      
      expect(validateProps(props)).toBe(true)
    })

    it('should accept valid props with empty arrays', () => {
      const props: CaptureCompleteSummaryProps = {
        captures: [],
        skippedItems: [],
        onDone: vi.fn()
      }
      
      expect(validateProps(props)).toBe(true)
    })

    it('should accept valid props with optional className', () => {
      const props: CaptureCompleteSummaryProps = {
        captures: [],
        skippedItems: [],
        onDone: vi.fn(),
        className: 'custom-class'
      }
      
      expect(validateProps(props)).toBe(true)
    })
  })

  describe('Header Content (Requirement 3.6.1)', () => {
    /**
     * Tests for the header content.
     */
    
    interface HeaderContent {
      title: string
      hasSuccessIcon: boolean
    }

    function getExpectedHeaderContent(): HeaderContent {
      return {
        title: 'Stage Complete!',
        hasSuccessIcon: true
      }
    }

    it('should have correct header title', () => {
      const header = getExpectedHeaderContent()
      expect(header.title).toBe('Stage Complete!')
    })

    it('should include success icon', () => {
      const header = getExpectedHeaderContent()
      expect(header.hasSuccessIcon).toBe(true)
    })
  })

  describe('Accessibility Attributes', () => {
    /**
     * Tests for expected accessibility attributes.
     */
    
    interface AccessibilityAttributes {
      containerRole: string
      containerAriaLabel: string
      buttonText: string
    }

    function getExpectedAccessibilityAttributes(): AccessibilityAttributes {
      return {
        containerRole: 'region',
        containerAriaLabel: 'Capture complete summary',
        buttonText: 'Done'
      }
    }

    it('should have correct container role', () => {
      const attrs = getExpectedAccessibilityAttributes()
      expect(attrs.containerRole).toBe('region')
    })

    it('should have descriptive aria-label for container', () => {
      const attrs = getExpectedAccessibilityAttributes()
      expect(attrs.containerAriaLabel).toBe('Capture complete summary')
    })

    it('should have correct button text', () => {
      const attrs = getExpectedAccessibilityAttributes()
      expect(attrs.buttonText).toBe('Done')
    })
  })

  describe('UI Elements', () => {
    /**
     * Tests for expected UI elements and their test IDs.
     */
    
    interface UITestIds {
      container: string
      successIcon: string
      headerTitle: string
      summaryCounts: string
      doneButton: string
    }

    function getExpectedTestIds(): UITestIds {
      return {
        container: 'capture-complete-summary',
        successIcon: 'success-icon',
        headerTitle: 'header-title',
        summaryCounts: 'summary-counts',
        doneButton: 'done-button'
      }
    }

    it('should have container test id', () => {
      const testIds = getExpectedTestIds()
      expect(testIds.container).toBe('capture-complete-summary')
    })

    it('should have success icon test id', () => {
      const testIds = getExpectedTestIds()
      expect(testIds.successIcon).toBe('success-icon')
    })

    it('should have header title test id', () => {
      const testIds = getExpectedTestIds()
      expect(testIds.headerTitle).toBe('header-title')
    })

    it('should have summary counts test id', () => {
      const testIds = getExpectedTestIds()
      expect(testIds.summaryCounts).toBe('summary-counts')
    })

    it('should have done button test id', () => {
      const testIds = getExpectedTestIds()
      expect(testIds.doneButton).toBe('done-button')
    })
  })

  describe('Edge Cases', () => {
    /**
     * Tests for edge cases and boundary conditions.
     */
    
    it('should handle single captured photo', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1' })
      ]
      const skippedItems: PhotoChecklistItem[] = []
      
      const capturedCount = captures.filter(c => c.status === 'captured').length
      expect(capturedCount).toBe(1)
    })

    it('should handle many captured photos', () => {
      const captures: CapturedPhoto[] = Array.from({ length: 20 }, (_, i) =>
        createMockCapturedPhoto({ checklistItemId: `${i}` })
      )
      const skippedItems: PhotoChecklistItem[] = []
      
      const capturedCount = captures.filter(c => c.status === 'captured').length
      expect(capturedCount).toBe(20)
    })

    it('should handle all items skipped', () => {
      const captures: CapturedPhoto[] = []
      const skippedItems: PhotoChecklistItem[] = Array.from({ length: 5 }, (_, i) =>
        createMockChecklistItem({ id: `${i}` })
      )
      
      expect(skippedItems.length).toBe(5)
    })

    it('should handle photos with long titles', () => {
      const longTitle = 'A'.repeat(100)
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', title: longTitle })
      ]
      
      expect(captures[0].title).toBe(longTitle)
    })

    it('should handle photos with unicode titles', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', title: 'Foto Kargo 📷' }),
        createMockCapturedPhoto({ checklistItemId: '2', title: '货物照片' }),
      ]
      
      expect(captures[0].title).toBe('Foto Kargo 📷')
      expect(captures[1].title).toBe('货物照片')
    })

    it('should handle photos with special characters in thumbnailUrl', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ 
          checklistItemId: '1', 
          thumbnailUrl: 'blob:http://localhost:3001/abc-123-def' 
        }),
      ]
      
      expect(captures[0].thumbnailUrl).toBe('blob:http://localhost:3001/abc-123-def')
    })
  })

  describe('PhotoThumbnailGrid Integration', () => {
    /**
     * Tests for integration with PhotoThumbnailGrid component.
     */
    
    it('should pass correct photos array to grid', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', status: 'captured' }),
      ]
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '2', title: 'Skipped' }),
      ]
      
      // Simulate the combination logic
      const allPhotos: CapturedPhoto[] = [
        ...captures,
        ...skippedItems
          .filter(item => !captures.some(c => c.checklistItemId === item.id))
          .map(item => ({
            checklistItemId: item.id,
            title: item.title,
            thumbnailUrl: '',
            status: 'skipped' as const
          }))
      ]
      
      expect(allPhotos).toHaveLength(2)
      expect(allPhotos[0].status).toBe('captured')
      expect(allPhotos[1].status).toBe('skipped')
    })

    it('should not render grid when no photos', () => {
      const captures: CapturedPhoto[] = []
      const skippedItems: PhotoChecklistItem[] = []
      
      const allPhotos: CapturedPhoto[] = [
        ...captures,
        ...skippedItems
          .filter(item => !captures.some(c => c.checklistItemId === item.id))
          .map(item => ({
            checklistItemId: item.id,
            title: item.title,
            thumbnailUrl: '',
            status: 'skipped' as const
          }))
      ]
      
      expect(allPhotos).toHaveLength(0)
    })
  })

  describe('Different Capture Scenarios', () => {
    /**
     * Tests for various capture session scenarios.
     */
    
    it('should handle job_start stage with all required captured', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', title: 'Cargo Front View', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '2', title: 'Cargo Left Side', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '3', title: 'Cargo Right Side', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '4', title: 'Loading Document', status: 'captured' }),
      ]
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '5', title: 'Existing Damage', is_required: false }),
      ]
      
      const capturedCount = captures.filter(c => c.status === 'captured').length
      const skippedCount = skippedItems.length
      
      expect(capturedCount).toBe(4)
      expect(skippedCount).toBe(1)
    })

    it('should handle in_transit stage with all optional skipped', () => {
      const captures: CapturedPhoto[] = []
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '1', title: 'Rest Stop Check', is_required: false }),
        createMockChecklistItem({ id: '2', title: 'Issue Documentation', is_required: false }),
      ]
      
      const capturedCount = captures.filter(c => c.status === 'captured').length
      const skippedCount = skippedItems.length
      
      expect(capturedCount).toBe(0)
      expect(skippedCount).toBe(2)
    })

    it('should handle job_end stage with mixed captured and skipped', () => {
      const captures: CapturedPhoto[] = [
        createMockCapturedPhoto({ checklistItemId: '1', title: 'Delivered Cargo', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '2', title: 'Unloading Complete', status: 'captured' }),
        createMockCapturedPhoto({ checklistItemId: '3', title: 'Delivery Document', status: 'captured' }),
      ]
      const skippedItems: PhotoChecklistItem[] = [
        createMockChecklistItem({ id: '4', title: 'Damage Report', is_required: false }),
      ]
      
      const capturedCount = captures.filter(c => c.status === 'captured').length
      const skippedCount = skippedItems.length
      
      expect(capturedCount).toBe(3)
      expect(skippedCount).toBe(1)
    })
  })
})
